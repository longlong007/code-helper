# Coding Helper

跨平台桌面编程助手：悬浮球快捷入口、研发全阶段提示词库、VS Code / Cursor 扩展注入 IDE 上下文。支持复制/填充 Prompt，二期内置多 Provider AI 对话。

## 功能

- **悬浮球**：单击快捷菜单，双击打开主面板
- **提示词库**：7 个研发阶段，26+ 内置模板，支持自定义 CRUD 与导入导出
- **IDE 桥接**：扩展推送选区、文件路径、工作区信息
- **AI 对话**（需配置 API Key）：OpenAI 兼容接口（DeepSeek / OpenAI / 智谱等）

## 快速开始

### 依赖

- Node.js 18+
- pnpm 9+

### 安装与开发

```bash
cd coding-helper
pnpm install
# 若 Electron 未下载，执行：
pnpm --filter @coding-helper/desktop run install-electron
pnpm build
pnpm dev
```

> 首次 `pnpm install` 若因本机缺少 VS C++ 导致可选依赖编译失败，可改用 `pnpm install --ignore-scripts` 后再单独运行 `install-electron`。

### 连接 IDE

1. 启动桌面应用（`pnpm dev`）
2. 打开 **设置 → IDE 连接**，记下端口与配对码
3. 在 VS Code / Cursor 安装扩展：`apps/vscode-extension`（开发期可用 `pnpm --filter coding-helper build` 后 F5 调试）
4. 运行命令 **Coding Helper: Connect**，输入端口与配对码
5. 使用 **Coding Helper: Push Context** 或开启 `codingHelper.autoPush`

### 打包桌面端

```bash
pnpm --filter @coding-helper/desktop package
```

产物在 `apps/desktop/release/`。

## 仓库结构

```
apps/desktop/          # Electron + React
apps/vscode-extension/ # VS Code / Cursor 扩展
packages/shared/       # 类型、变量渲染、Schema
packages/prompts/      # 内置提示词
```

## 许可证

MIT
