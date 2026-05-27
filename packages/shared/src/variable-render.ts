import type { IdeContext, PromptVariable, RenderPromptOptions } from "./types.js";

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

export function extractVariables(body: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_PATTERN.source, "g");
  while ((m = re.exec(body)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}

function contextValue(
  key: string,
  ctx: IdeContext,
  emptyPlaceholder: string
): string {
  switch (key as PromptVariable) {
    case "selection":
      return ctx.selection ?? emptyPlaceholder;
    case "filePath":
      return ctx.filePath ?? emptyPlaceholder;
    case "language":
      return ctx.language ?? emptyPlaceholder;
    case "workspaceName":
      return ctx.workspaceName ?? emptyPlaceholder;
    case "workspacePath":
      return ctx.workspacePath ?? emptyPlaceholder;
    case "branch":
      return ctx.branch ?? emptyPlaceholder;
    default:
      return emptyPlaceholder;
  }
}

export function renderPromptBody(
  body: string,
  ctx: IdeContext,
  options: RenderPromptOptions = {}
): string {
  const {
    keepPlaceholders = false,
    emptyPlaceholder = "（未连接 IDE 或未提供）",
  } = options;

  return body.replace(VAR_PATTERN, (_match, key: string) => {
    const value = contextValue(key, ctx, emptyPlaceholder);
    if (keepPlaceholders && value === emptyPlaceholder) {
      return `{{${key}}}`;
    }
    return value;
  });
}

export function countResolvedVariables(
  body: string,
  ctx: IdeContext
): { total: number; resolved: number } {
  const vars = extractVariables(body);
  let resolved = 0;
  for (const v of vars) {
    const val = contextValue(v, ctx, "");
    if (val !== "") resolved++;
  }
  return { total: vars.length, resolved };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
