import Store from "electron-store";
import type { IdeContext, ProviderConfig } from "@coding-helper/shared";

export interface AppSettings {
  floatBallVisible: boolean;
  alwaysOnTop: boolean;
  opacity: "high" | "medium" | "low";
  autoLaunch: boolean;
  snapToEdge: boolean;
  hotkey: string;
  floatBallPosition?: { x: number; y: number; displayId?: number };
  customTemplates: import("@coding-helper/shared").PromptTemplate[];
  favorites: string[];
  recentTemplateIds: string[];
  providers: ProviderConfig[];
  activeProviderId?: string;
  encryptedApiKeys?: Record<string, string>;
  plainApiKeys?: Record<string, string>;
}

const defaults: AppSettings = {
  floatBallVisible: true,
  alwaysOnTop: true,
  opacity: "medium",
  autoLaunch: false,
  snapToEdge: false,
  hotkey: "CommandOrControl+Shift+H",
  customTemplates: [],
  favorites: [],
  recentTemplateIds: [],
  providers: [
    {
      id: "deepseek",
      model: "deepseek-chat",
      enabled: false,
    },
    {
      id: "openai",
      model: "gpt-4o",
      enabled: false,
    },
    {
      id: "zhipu",
      model: "glm-4-flash",
      enabled: false,
    },
  ],
};

export const appStore = new Store<AppSettings>({
  name: "coding-helper",
  defaults,
});

let ideContext: IdeContext = {};

export function getIdeContext(): IdeContext {
  return { ...ideContext };
}

export function setIdeContext(ctx: IdeContext): void {
  ideContext = { ...ctx, updatedAt: Date.now() };
}
