import { useCallback, useEffect, useMemo, useState } from "react";
import type { IdeContext, PromptTemplate, StageId } from "@coding-helper/shared";
import { STAGES } from "@coding-helper/shared";
import TitleBar from "../components/TitleBar";
import SettingsView from "./SettingsView";
import ChatView from "./ChatView";
import TemplateEditor from "./TemplateEditor";
import "./MainPanel.css";

const STAGE_COLORS: Record<StageId, string> = {
  requirements: "#2e79b5",
  "tech-selection": "#7b64b8",
  "design-review": "#f0a040",
  implementation: "#1f8a65",
  "code-review": "#3794ff",
  "test-release": "#e8c030",
  "debug-refactor": "#c85898",
};

export default function MainPanel() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [context, setContext] = useState<IdeContext>({});
  const [activeStage, setActiveStage] = useState<StageId>("code-review");
  const [selectedId, setSelectedId] = useState<string>("cr-impact");
  const [search, setSearch] = useState("");
  const [rendered, setRendered] = useState("");
  const [stats, setStats] = useState({ total: 0, resolved: 0, tokens: 0 });
  const [composerText, setComposerText] = useState("");
  const [view, setView] = useState<"main" | "settings" | "chat" | "editor">("main");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const [tpls, ctx, settings] = await Promise.all([
      window.codingHelper.getTemplates(),
      window.codingHelper.getContext(),
      window.codingHelper.getSettings(),
    ]);
    setTemplates(tpls);
    setContext(ctx);
    setFavorites(settings.favorites ?? []);
  }, []);

  useEffect(() => {
    load();
    return window.codingHelper.onContextUpdated((ctx) => setContext(ctx as IdeContext));
  }, [load]);

  const selected = templates.find((t) => t.id === selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (t.stageId !== activeStage) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [templates, activeStage, search]);

  useEffect(() => {
    if (!selectedId) return;
    window.codingHelper.renderPrompt(selectedId).then((r) => {
      if (!r) return;
      setRendered(r.body);
      setStats({
        total: r.stats.total,
        resolved: r.stats.resolved,
        tokens: r.tokens,
      });
    });
  }, [selectedId, context]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const handleCopy = async () => {
    await window.codingHelper.copyText(rendered);
    await window.codingHelper.pushRecent(selectedId);
    showToast("已复制到剪贴板");
  };

  const handleFill = () => {
    setComposerText(rendered);
    showToast("已填充到输入框");
  };

  const handleStartChat = () => {
    setComposerText(rendered);
    setView("chat");
  };

  const isConnected = Boolean(context.filePath || context.selection || context.workspaceName);

  if (view === "settings") {
    return <SettingsView onBack={() => setView("main")} />;
  }
  if (view === "chat") {
    return (
      <ChatView
        initialUserMessage={composerText}
        onBack={() => setView("main")}
        templateTitle={selected?.title}
      />
    );
  }
  if (view === "editor") {
    return (
      <TemplateEditor
        stageId={activeStage}
        onBack={() => {
          setView("main");
          load();
        }}
      />
    );
  }

  return (
    <div className="main-panel">
      <TitleBar
        title="Coding Helper"
        showControls
      />
      <div className="main-panel__toolbar">
        <button type="button" className="btn btn--ghost" onClick={() => setView("settings")}>
          设置
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setView("chat")}>
          对话
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setView("editor")}>
          新建模板
        </button>
      </div>
      <div className="main-panel__body">
        <aside className="sidebar">
          <div className="search-box">
            <input
              type="search"
              placeholder="搜索模板…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <nav className="nav-tree">
            <div className="nav-group__label">研发阶段</div>
            {STAGES.map((st) => (
              <button
                key={st.id}
                type="button"
                className={`nav-item ${activeStage === st.id ? "nav-item--active" : ""}`}
                onClick={() => setActiveStage(st.id)}
              >
                <span className="nav-item__dot" style={{ background: STAGE_COLORS[st.id] }} />
                {st.label}
                <span className="nav-item__badge">
                  {templates.filter((t) => t.stageId === st.id).length}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="panel-list">
          <div className="list-header">
            <h2>{STAGES.find((s) => s.id === activeStage)?.label}</h2>
          </div>
          <div className="template-list">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`template-card ${selectedId === t.id ? "template-card--selected" : ""}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="template-card__title">{t.title}</div>
                <p className="template-card__desc">{t.description}</p>
                <div className="template-card__meta">
                  {t.builtin && <span className="tag tag--builtin">内置</span>}
                  {(favorites.includes(t.id) || t.favorite) && (
                    <span className="tag tag--accent">收藏</span>
                  )}
                  {t.tags?.filter((x) => x !== "内置").map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-main">
          {selected && (
            <>
              <div className="preview-header">
                <div>
                  <h1>{selected.title}</h1>
                  <p>{selected.description}</p>
                </div>
                <div className="preview-actions">
                  <button type="button" className="btn btn--ghost" onClick={() => window.codingHelper.toggleFavorite(selected.id).then(load)}>
                    {favorites.includes(selected.id) ? "取消收藏" : "收藏"}
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={handleFill}>
                    填充输入框
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={handleStartChat}>
                    开始对话
                  </button>
                  <button type="button" className="btn btn--primary" onClick={handleCopy}>
                    复制 Prompt
                  </button>
                </div>
              </div>

              <div className="context-bar">
                <div className="context-bar__head">
                  <span>IDE 上下文</span>
                  <span className={`status-pill ${isConnected ? "status-pill--connected" : "status-pill--disconnected"}`}>
                    <span className="status-pill__dot" />
                    {isConnected ? "已连接" : "未连接 IDE"}
                  </span>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
                    刷新
                  </button>
                </div>
                <div className="context-bar__grid">
                  <span className="context-bar__label">工作区</span>
                  <span className="context-bar__value">{context.workspaceName ?? "—"}</span>
                  <span className="context-bar__label">文件</span>
                  <span className="context-bar__value">{context.filePath ?? "—"}</span>
                  <span className="context-bar__label">语言</span>
                  <span className="context-bar__value">{context.language ?? "—"}</span>
                  <span className="context-bar__label">选区</span>
                  <span className="context-bar__value">
                    {context.selectionStartLine
                      ? `L${context.selectionStartLine}–${context.selectionEndLine}`
                      : context.selection
                        ? `${context.selection.split("\n").length} lines`
                        : "—"}
                  </span>
                </div>
              </div>

              <pre className="preview-editor">{rendered}</pre>

              <div className="composer">
                <textarea
                  placeholder="渲染后的 Prompt 将填充到此，可编辑后复制或发起对话…"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="preview-footer">
                <span>
                  变量 {stats.resolved}/{stats.total} · 约 {stats.tokens} tokens
                </span>
                {!selected.builtin && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setView("editor")}
                  >
                    编辑模板
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
