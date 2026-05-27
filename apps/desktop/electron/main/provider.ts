import type { ProviderConfig, ProviderId } from "@coding-helper/shared";
import { safeStorage } from "electron";
import { appStore } from "./store";

const KEY_PREFIX = "apikey:";

const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  custom: "",
};

export function getProviderBaseUrl(config: ProviderConfig): string {
  return config.baseUrl || DEFAULT_BASE_URLS[config.id] || "";
}

export function saveApiKey(providerId: ProviderId, key: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    const plain = { ...(appStore.get("plainApiKeys") ?? {}), [providerId]: key };
    appStore.set("plainApiKeys", plain);
    return false;
  }
  const encrypted = safeStorage.encryptString(key);
  const enc = {
    ...(appStore.get("encryptedApiKeys") ?? {}),
    [providerId]: encrypted.toString("base64"),
  };
  appStore.set("encryptedApiKeys", enc);
  const plain = { ...(appStore.get("plainApiKeys") ?? {}) };
  delete plain[providerId];
  appStore.set("plainApiKeys", plain);
  return true;
}

export function getApiKey(providerId: ProviderId): string | null {
  const encMap = appStore.get("encryptedApiKeys") ?? {};
  const enc = encMap[providerId];
  if (enc && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(enc, "base64"));
    } catch {
      return null;
    }
  }
  const plainMap = appStore.get("plainApiKeys") ?? {};
  return plainMap[providerId] ?? null;
}

export interface ChatCompletionChunk {
  content: string;
  done: boolean;
}

export async function* streamChatCompletion(
  messages: { role: string; content: string }[],
  config: ProviderConfig
): AsyncGenerator<ChatCompletionChunk> {
  const apiKey = getApiKey(config.id);
  if (!apiKey) {
    yield { content: "请先在设置中配置 API Key。", done: true };
    return;
  }

  const baseUrl = getProviderBaseUrl(config).replace(/\/$/, "");
  const url = `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    yield { content: `API 错误 ${res.status}: ${errText.slice(0, 200)}`, done: true };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield { content: "无响应流", done: true };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") {
        yield { content: "", done: true };
        return;
      }
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) yield { content: delta, done: false };
      } catch {
        /* skip malformed */
      }
    }
  }
  yield { content: "", done: true };
}
