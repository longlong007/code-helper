import { contextBridge, ipcRenderer } from "electron";

const api = {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke("set-settings", patch),
  getTemplates: () => ipcRenderer.invoke("get-templates"),
  getContext: () => ipcRenderer.invoke("get-context"),
  getBridge: () => ipcRenderer.invoke("get-bridge"),
  refreshPairingToken: () => ipcRenderer.invoke("refresh-pairing-token"),
  renderPrompt: (templateId: string, options?: { keepPlaceholders?: boolean }) =>
    ipcRenderer.invoke("render-prompt", templateId, options),
  copyText: (text: string) => ipcRenderer.invoke("copy-text", text),
  pushRecent: (templateId: string) => ipcRenderer.invoke("push-recent", templateId),
  toggleFavorite: (templateId: string) => ipcRenderer.invoke("toggle-favorite", templateId),
  saveCustomTemplate: (template: unknown) => ipcRenderer.invoke("save-custom-template", template),
  deleteCustomTemplate: (id: string) => ipcRenderer.invoke("delete-custom-template", id),
  importTemplates: (json: string) => ipcRenderer.invoke("import-templates", json),
  exportCustomTemplates: () => ipcRenderer.invoke("export-custom-templates"),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  openMain: () => ipcRenderer.invoke("open-main"),
  toggleQuickMenu: () => ipcRenderer.invoke("toggle-quick-menu"),
  closeQuickMenu: () => ipcRenderer.invoke("close-quick-menu"),
  showFloatBall: () => ipcRenderer.invoke("show-float-ball"),
  getFloatBallPosition: () => ipcRenderer.invoke("get-float-ball-position") as Promise<{ x: number; y: number } | null>,
  setFloatBallPosition: (x: number, y: number) =>
    ipcRenderer.invoke("set-float-ball-position", x, y) as Promise<{ x: number; y: number } | null>,
  finishFloatBallDrag: () =>
    ipcRenderer.invoke("finish-float-ball-drag") as Promise<{ x: number; y: number } | null>,
  saveApiKey: (providerId: string, key: string) => ipcRenderer.invoke("save-api-key", providerId, key),
  hasApiKey: (providerId: string) => ipcRenderer.invoke("has-api-key", providerId),
  onContextUpdated: (cb: (ctx: unknown) => void) => {
    const handler = (_: unknown, ctx: unknown) => cb(ctx);
    ipcRenderer.on("context-updated", handler);
    return () => ipcRenderer.removeListener("context-updated", handler);
  },
  chatStreamStart: (messages: { role: string; content: string }[]) =>
    ipcRenderer.send("chat-stream-start", { messages }),
  onChatStreamChunk: (cb: (chunk: { content: string; done: boolean }) => void) => {
    const handler = (_: unknown, chunk: { content: string; done: boolean }) => cb(chunk);
    ipcRenderer.on("chat-stream-chunk", handler);
    return () => ipcRenderer.removeListener("chat-stream-chunk", handler);
  },
};

contextBridge.exposeInMainWorld("codingHelper", api);

export type CodingHelperApi = typeof api;
