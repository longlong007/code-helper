import { useEffect, useState } from "react";
import type { ProviderConfig } from "@coding-helper/shared";
import TitleBar from "../components/TitleBar";
import "./SettingsView.css";

interface SettingsViewProps {
  onBack: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [tab, setTab] = useState<"float" | "ide" | "ai">("float");
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof window.codingHelper.getSettings>> | null>(null);
  const [bridge, setBridge] = useState<{ port: number; token: string; expiresAt: number } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [activeProvider, setActiveProvider] = useState<string>("deepseek");

  const load = async () => {
    const [s, b] = await Promise.all([
      window.codingHelper.getSettings(),
      window.codingHelper.getBridge(),
    ]);
    setSettings(s);
    setBridge(b);
    setActiveProvider(s.activeProviderId ?? "deepseek");
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (partial: Record<string, unknown>) => {
    const next = await window.codingHelper.setSettings(partial);
    setSettings(next);
  };

  const refreshToken = async () => {
    const b = await window.codingHelper.refreshPairingToken();
    setBridge(b);
  };

  const saveKey = async () => {
    if (!apiKeyInput.trim()) return;
    await window.codingHelper.saveApiKey(activeProvider, apiKeyInput.trim());
    setApiKeyInput("");
    alert("API Key 已保存（优先使用系统密钥链）");
  };

  if (!settings) return null;

  return (
    <div className="settings-view">
      <TitleBar title="设置" />
      <div className="settings-view__back">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← 返回
        </button>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {[
            { id: "float" as const, label: "悬浮球" },
            { id: "ide" as const, label: "IDE 连接" },
            { id: "ai" as const, label: "AI 模型" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "settings-nav__active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === "float" && (
            <>
              <h3>悬浮球</h3>
              <SettingRow
                label="显示悬浮球"
                hint="关闭后可通过主面板重新显示"
                checked={settings.floatBallVisible}
                onChange={(v) => patch({ floatBallVisible: v })}
              />
              <SettingRow
                label="始终置顶"
                checked={settings.alwaysOnTop}
                onChange={(v) => patch({ alwaysOnTop: v })}
              />
              <SettingRow
                label="贴边吸附"
                checked={settings.snapToEdge}
                onChange={(v) => patch({ snapToEdge: v })}
              />
              <div className="form-row">
                <div>
                  <div>透明度</div>
                </div>
                <div className="opacity-btns">
                  {(["high", "medium", "low"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`btn ${settings.opacity === l ? "btn--primary" : "btn--secondary"}`}
                      onClick={() => patch({ opacity: l })}
                    >
                      {l === "high" ? "高" : l === "medium" ? "中" : "低"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === "ide" && (
            <>
              <h3>IDE 连接</h3>
              <p className="hint">
                在 VS Code / Cursor 安装 Coding Helper 扩展，运行命令
                <code> Coding Helper: Connect </code>
              </p>
              {bridge ? (
                <div className="pairing-box">
                  <div className="pairing-token">{bridge.token}</div>
                  <p className="hint">
                    Bridge: http://127.0.0.1:{bridge.port} · 有效期至{" "}
                    {new Date(bridge.expiresAt).toLocaleTimeString()}
                  </p>
                  <button type="button" className="btn btn--secondary" onClick={refreshToken}>
                    重新生成配对码
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => window.codingHelper.copyText(bridge.token)}
                  >
                    复制配对码
                  </button>
                </div>
              ) : (
                <p>Bridge 未启动</p>
              )}
            </>
          )}
          {tab === "ai" && (
            <>
              <h3>AI Provider（二期）</h3>
              {(settings.providers ?? []).map((p: ProviderConfig) => (
                <div key={p.id} className="provider-row">
                  <label>
                    <input
                      type="radio"
                      name="provider"
                      checked={activeProvider === p.id}
                      onChange={() => setActiveProvider(p.id)}
                    />
                    {p.id} — {p.model}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => {
                        const providers = (settings.providers ?? []).map((x) =>
                          x.id === p.id ? { ...x, enabled: e.target.checked } : x
                        );
                        patch({ providers, activeProviderId: p.id });
                      }}
                    />
                    启用
                  </label>
                </div>
              ))}
              <div className="api-key-row">
                <input
                  type="password"
                  placeholder="输入 API Key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <button type="button" className="btn btn--primary" onClick={saveKey}>
                  保存 Key
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="form-row">
      <div>
        <div>{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <button
        type="button"
        className={`toggle ${checked ? "toggle--on" : ""}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      />
    </div>
  );
}
