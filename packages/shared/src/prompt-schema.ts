import type { PromptTemplate, StageId } from "./types.js";

export const PROMPT_TEMPLATE_SCHEMA_VERSION = 1;

export interface PromptLibraryExport {
  version: number;
  exportedAt: string;
  templates: PromptTemplate[];
}

export function validatePromptTemplate(t: unknown): t is PromptTemplate {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.stageId === "string" &&
    typeof o.title === "string" &&
    typeof o.body === "string"
  );
}

export function validatePromptLibraryExport(data: unknown): data is PromptLibraryExport {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (typeof o.version !== "number" || !Array.isArray(o.templates)) return false;
  return o.templates.every(validatePromptTemplate);
}

const STAGE_IDS: StageId[] = [
  "requirements",
  "tech-selection",
  "design-review",
  "implementation",
  "code-review",
  "test-release",
  "debug-refactor",
];

export function isStageId(id: string): id is StageId {
  return (STAGE_IDS as string[]).includes(id);
}

export function createCustomTemplate(
  partial: Pick<PromptTemplate, "stageId" | "title" | "body"> &
    Partial<PromptTemplate>
): PromptTemplate {
  const now = new Date().toISOString();
  return {
    ...partial,
    id: partial.id ?? `custom-${Date.now()}`,
    tags: partial.tags ?? ["自定义"],
    builtin: false,
    favorite: partial.favorite ?? false,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}
