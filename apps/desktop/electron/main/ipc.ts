import { BrowserWindow, clipboard, ipcMain } from "electron";
import { BUILTIN_PROMPTS } from "@coding-helper/prompts";
import {
  renderPromptBody,
  countResolvedVariables,
  estimateTokens,
  validatePromptLibraryExport,
  type PromptTemplate,
  type IdeContext,
  type ProviderConfig,
} from "@coding-helper/shared";
import { appStore, getIdeContext } from "./store";
import {
  getBridgeState,
  refreshPairingToken,
  startBridge,
} from "./bridge";
import {
  createMainWindow,
  createFloatBallWindow,
  hideFloatBall,
  showFloatBall,
  toggleQuickMenu,
  destroyQuickMenu,
  applyAlwaysOnTop,
  applyOpacity,
  getMainWindow,
  getFloatBallPosition,
  setFloatBallPosition,
  finishFloatBallDrag,
  setFloatBallMenuOpen,
} from "./windows";
import { getApiKey, saveApiKey, streamChatCompletion } from "./provider";

function getAllTemplates(): PromptTemplate[] {
  const custom = appStore.get("customTemplates") ?? [];
  return [...BUILTIN_PROMPTS, ...custom];
}

function notifyContextUpdate(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("context-updated", getIdeContext());
    }
  }
}

export function registerIpc(): void {
  startBridge(notifyContextUpdate).catch(console.error);

  ipcMain.handle("get-settings", () => appStore.store);

  ipcMain.handle("set-settings", (_e, patch: Partial<typeof appStore.store>) => {
    for (const [k, v] of Object.entries(patch)) {
      appStore.set(k as keyof typeof appStore.store, v as never);
    }
    if (patch.alwaysOnTop !== undefined) applyAlwaysOnTop(patch.alwaysOnTop);
    if (patch.opacity) applyOpacity(patch.opacity);
    if (patch.floatBallVisible === false) hideFloatBall();
    if (patch.floatBallVisible === true) showFloatBall();
    if (patch.snapToEdge === true) finishFloatBallDrag();
    return appStore.store;
  });

  ipcMain.handle("get-templates", () => getAllTemplates());

  ipcMain.handle("get-context", () => getIdeContext());

  ipcMain.handle("get-bridge", () => {
    const s = getBridgeState();
    if (!s) return null;
    return { port: s.port, token: s.token, expiresAt: s.expiresAt };
  });

  ipcMain.handle("refresh-pairing-token", () => {
    const s = refreshPairingToken();
    return { port: s.port, token: s.token, expiresAt: s.expiresAt };
  });

  ipcMain.handle(
    "render-prompt",
    (_e, templateId: string, options?: { keepPlaceholders?: boolean }) => {
      const t = getAllTemplates().find((x) => x.id === templateId);
      if (!t) return null;
      const ctx = getIdeContext();
      const body = renderPromptBody(t.body, ctx, options);
      const stats = countResolvedVariables(t.body, ctx);
      return {
        body,
        stats,
        tokens: estimateTokens(body),
        template: t,
      };
    }
  );

  ipcMain.handle("copy-text", (_e, text: string) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle("push-recent", (_e, templateId: string) => {
    const recent = appStore.get("recentTemplateIds") ?? [];
    const next = [templateId, ...recent.filter((id) => id !== templateId)].slice(0, 8);
    appStore.set("recentTemplateIds", next);
    return next;
  });

  ipcMain.handle("toggle-favorite", (_e, templateId: string) => {
    const favs = appStore.get("favorites") ?? [];
    const has = favs.includes(templateId);
    const next = has ? favs.filter((id) => id !== templateId) : [...favs, templateId];
    appStore.set("favorites", next);
    const templates = getAllTemplates().map((t) =>
      t.id === templateId ? { ...t, favorite: !has } : t
    );
    return next;
  });

  ipcMain.handle("save-custom-template", (_e, template: PromptTemplate) => {
    const custom = appStore.get("customTemplates") ?? [];
    const idx = custom.findIndex((t) => t.id === template.id);
    const entry = { ...template, builtin: false, updatedAt: new Date().toISOString() };
    if (idx >= 0) custom[idx] = entry;
    else custom.push(entry);
    appStore.set("customTemplates", custom);
    return entry;
  });

  ipcMain.handle("delete-custom-template", (_e, id: string) => {
    const custom = (appStore.get("customTemplates") ?? []).filter((t) => t.id !== id);
    appStore.set("customTemplates", custom);
    return true;
  });

  ipcMain.handle("import-templates", (_e, json: string) => {
    const data = JSON.parse(json) as unknown;
    if (!validatePromptLibraryExport(data)) throw new Error("Invalid export format");
    const custom = appStore.get("customTemplates") ?? [];
    const merged = [...custom];
    for (const t of data.templates) {
      if (t.builtin) continue;
      const i = merged.findIndex((x) => x.id === t.id);
      const entry = { ...t, builtin: false };
      if (i >= 0) merged[i] = entry;
      else merged.push(entry);
    }
    appStore.set("customTemplates", merged);
    return merged.length;
  });

  ipcMain.handle("export-custom-templates", () => {
    const custom = appStore.get("customTemplates") ?? [];
    return JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), templates: custom },
      null,
      2
    );
  });

  ipcMain.handle("window-minimize", (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize();
  });

  ipcMain.handle("window-close", (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close();
  });

  ipcMain.handle("open-main", () => {
    createMainWindow();
    destroyQuickMenu();
  });

  ipcMain.handle("toggle-quick-menu", (_e, ballScreen?: { x: number; y: number }) => {
    toggleQuickMenu(ballScreen);
  });

  ipcMain.handle(
    "set-float-ball-menu-open",
    (e, open: boolean, ballScreen?: { x: number; y: number }) => {
      const ball = BrowserWindow.fromWebContents(e.sender);
      setFloatBallMenuOpen(open, ball, ballScreen);
    }
  );

  ipcMain.handle("close-quick-menu", () => {
    destroyQuickMenu();
  });

  ipcMain.handle("show-float-ball", () => {
    showFloatBall();
  });

  ipcMain.handle("get-float-ball-position", () => getFloatBallPosition());

  ipcMain.handle("set-float-ball-position", (_e, x: number, y: number) => {
    setFloatBallPosition(x, y);
    return getFloatBallPosition();
  });

  ipcMain.handle("finish-float-ball-drag", () => {
    finishFloatBallDrag();
    return getFloatBallPosition();
  });

  ipcMain.handle("save-api-key", (_e, providerId: string, key: string) => {
    return saveApiKey(providerId as ProviderConfig["id"], key);
  });

  ipcMain.handle("has-api-key", (_e, providerId: string) => {
    return Boolean(getApiKey(providerId as ProviderConfig["id"]));
  });

  ipcMain.on("chat-stream-start", async (e, payload: { messages: { role: string; content: string }[] }) => {
    const providers = appStore.get("providers") ?? [];
    const activeId = appStore.get("activeProviderId");
    const config = providers.find((p) => p.id === activeId && p.enabled) ?? providers.find((p) => p.enabled);
    if (!config) {
      e.sender.send("chat-stream-chunk", { content: "请启用并配置一个 Provider。", done: true });
      return;
    }
    try {
      for await (const chunk of streamChatCompletion(payload.messages, config)) {
        e.sender.send("chat-stream-chunk", chunk);
        if (chunk.done) break;
      }
    } catch (err) {
      e.sender.send("chat-stream-chunk", {
        content: `请求失败: ${err instanceof Error ? err.message : String(err)}`,
        done: true,
      });
    }
  });
}
