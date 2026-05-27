import * as vscode from "vscode";

const HEALTH_PATH = "/health";
const CONTEXT_PATH = "/context";

async function pushContext(): Promise<boolean> {
  const cfg = vscode.workspace.getConfiguration("codingHelper");
  const port = cfg.get<number>("port") ?? 0;
  const token = cfg.get<string>("token") ?? "";

  if (!port || !token) {
    vscode.window.showWarningMessage(
      "请先运行 Coding Helper: Connect 并完成配对（在桌面端设置中查看配对码）"
    );
    return false;
  }

  const editor = vscode.window.activeTextEditor;
  const folder = vscode.workspace.workspaceFolders?.[0];

  let selection = "";
  let selectionStartLine: number | undefined;
  let selectionEndLine: number | undefined;

  if (editor) {
    const sel = editor.selection;
    selection = editor.document.getText(sel);
    selectionStartLine = sel.start.line + 1;
    selectionEndLine = sel.end.line + 1;
  }

  const body = {
    workspaceName: folder?.name,
    workspacePath: folder?.uri.fsPath,
    filePath: editor?.document.uri.fsPath,
    language: editor?.document.languageId,
    selection,
    selectionStartLine,
    selectionEndLine,
  };

  try {
    const res = await fetch(`http://127.0.0.1:${port}${CONTEXT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return true;
  } catch (e) {
    vscode.window.showErrorMessage(
      `无法连接 Coding Helper: ${e instanceof Error ? e.message : String(e)}`
    );
    return false;
  }
}

async function probeHealth(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}${HEALTH_PATH}`);
    return res.ok;
  } catch {
    return false;
  }
}

async function connectCommand(): Promise<void> {
  const portStr = await vscode.window.showInputBox({
    prompt: "桌面端 Bridge 端口（设置 → IDE 连接 中查看）",
    placeHolder: "例如 39281",
    validateInput: (v) => (/^\d+$/.test(v) ? null : "请输入端口号"),
  });
  if (!portStr) return;

  const port = parseInt(portStr, 10);
  if (!(await probeHealth(port))) {
    vscode.window.showErrorMessage("无法访问该端口的 Bridge，请确认桌面端已启动");
    return;
  }

  const token = await vscode.window.showInputBox({
    prompt: "配对码（桌面端设置 → IDE 连接）",
    placeHolder: "XXXX-XXXX",
  });
  if (!token) return;

  const cfg = vscode.workspace.getConfiguration("codingHelper");
  await cfg.update("port", port, vscode.ConfigurationTarget.Global);
  await cfg.update("token", token.trim(), vscode.ConfigurationTarget.Global);

  const ok = await pushContext();
  if (ok) {
    vscode.window.showInformationMessage("Coding Helper 已连接");
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.text = "$(plug) CH";
  statusItem.tooltip = "Coding Helper";
  statusItem.command = "codingHelper.pushContext";
  statusItem.show();

  const updateStatus = () => {
    const cfg = vscode.workspace.getConfiguration("codingHelper");
    const port = cfg.get<number>("port");
    const token = cfg.get<string>("token");
    statusItem.text =
      port && token ? "$(check) CH" : "$(circle-slash) CH";
  };
  updateStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand("codingHelper.connect", async () => {
      await connectCommand();
      updateStatus();
    }),
    vscode.commands.registerCommand("codingHelper.pushContext", async () => {
      const ok = await pushContext();
      if (ok) vscode.window.setStatusBarMessage("上下文已推送", 2000);
      updateStatus();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("codingHelper")) updateStatus();
    })
  );

  let debounce: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => {
      const cfg = vscode.workspace.getConfiguration("codingHelper");
      if (!cfg.get<boolean>("autoPush")) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void pushContext();
      }, 500);
    })
  );
}

export function deactivate(): void {}
