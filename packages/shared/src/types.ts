/** 研发阶段 ID */
export type StageId =
  | "requirements"
  | "tech-selection"
  | "design-review"
  | "implementation"
  | "code-review"
  | "test-release"
  | "debug-refactor";

export interface StageMeta {
  id: StageId;
  label: string;
  order: number;
}

export const STAGES: StageMeta[] = [
  { id: "requirements", label: "需求澄清", order: 1 },
  { id: "tech-selection", label: "技术选型", order: 2 },
  { id: "design-review", label: "设计评审", order: 3 },
  { id: "implementation", label: "编码实现", order: 4 },
  { id: "code-review", label: "Code Review", order: 5 },
  { id: "test-release", label: "测试与发布", order: 6 },
  { id: "debug-refactor", label: "排障与重构", order: 7 },
];

/** IDE 推送的上下文 */
export interface IdeContext {
  workspaceName?: string;
  workspacePath?: string;
  filePath?: string;
  language?: string;
  selection?: string;
  selectionStartLine?: number;
  selectionEndLine?: number;
  branch?: string;
  updatedAt?: number;
}

export type PromptVariable =
  | "selection"
  | "filePath"
  | "language"
  | "workspaceName"
  | "workspacePath"
  | "branch";

export const PROMPT_VARIABLES: PromptVariable[] = [
  "selection",
  "filePath",
  "language",
  "workspaceName",
  "workspacePath",
  "branch",
];

/** 提示词模板 */
export interface PromptTemplate {
  id: string;
  stageId: StageId;
  title: string;
  description?: string;
  body: string;
  tags?: string[];
  systemPrompt?: string;
  builtin?: boolean;
  favorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RenderPromptOptions {
  /** 未解析变量是否保留占位符 */
  keepPlaceholders?: boolean;
  /** 未连接 IDE 时的占位提示 */
  emptyPlaceholder?: string;
}

export type ConnectionStatus = "connected" | "disconnected" | "pairing";

export interface BridgeInfo {
  port: number;
  token: string;
  expiresAt: number;
}

/** 二期：对话消息 */
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  templateId?: string;
  createdAt: number;
  updatedAt: number;
}

export type ProviderId = "openai" | "deepseek" | "zhipu" | "custom";

export interface ProviderConfig {
  id: ProviderId;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}
