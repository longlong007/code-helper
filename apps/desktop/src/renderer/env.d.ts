declare global {
  interface Window {
    codingHelper: {
      getSettings: () => Promise<Record<string, unknown>>;
      setSettings: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
      getTemplates: () => Promise<import("@coding-helper/shared").PromptTemplate[]>;
      getContext: () => Promise<import("@coding-helper/shared").IdeContext>;
      getBridge: () => Promise<{ port: number; token: string; expiresAt: number } | null>;
      refreshPairingToken: () => Promise<{ port: number; token: string; expiresAt: number }>;
      renderPrompt: (
        templateId: string,
        options?: { keepPlaceholders?: boolean }
      ) => Promise<{
        body: string;
        stats: { total: number; resolved: number };
        tokens: number;
        template: import("@coding-helper/shared").PromptTemplate;
      } | null>;
      copyText: (text: string) => Promise<boolean>;
      pushRecent: (templateId: string) => Promise<string[]>;
      toggleFavorite: (templateId: string) => Promise<string[]>;
      saveCustomTemplate: (template: import("@coding-helper/shared").PromptTemplate) => Promise<unknown>;
      deleteCustomTemplate: (id: string) => Promise<boolean>;
      importTemplates: (json: string) => Promise<number>;
      exportCustomTemplates: () => Promise<string>;
      windowMinimize: () => Promise<void>;
      windowClose: () => Promise<void>;
      openMain: () => Promise<void>;
      toggleQuickMenu: () => Promise<void>;
      closeQuickMenu: () => Promise<void>;
      showFloatBall: () => Promise<void>;
      getFloatBallPosition: () => Promise<{ x: number; y: number } | null>;
      setFloatBallPosition: (x: number, y: number) => Promise<{ x: number; y: number } | null>;
      finishFloatBallDrag: () => Promise<{ x: number; y: number } | null>;
      saveApiKey: (providerId: string, key: string) => Promise<boolean>;
      hasApiKey: (providerId: string) => Promise<boolean>;
      onContextUpdated: (cb: (ctx: unknown) => void) => () => void;
      chatStreamStart: (messages: { role: string; content: string }[]) => void;
      onChatStreamChunk: (cb: (chunk: { content: string; done: boolean }) => void) => () => void;
    };
  }
}

export {};
