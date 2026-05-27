import { useCallback, useEffect, useMemo, useState } from "react";
import type { PromptTemplate, StageId } from "@coding-helper/shared";
import { STAGES } from "@coding-helper/shared";
import "./QuickMenu.css";

/** 快捷菜单展示用 mock 数据（API 未就绪时兜底） */
const MOCK_TEMPLATES: PromptTemplate[] = [
  { id: "mock-req-1", stageId: "requirements", title: "用户故事拆解", description: "需求拆分为可开发故事", body: "", builtin: true },
  { id: "mock-req-2", stageId: "requirements", title: "验收标准生成", description: "补充 Given-When-Then", body: "", builtin: true },
  { id: "mock-req-3", stageId: "requirements", title: "边界场景追问", description: "系统化追问异常路径", body: "", builtin: true },
  { id: "mock-tech-1", stageId: "tech-selection", title: "多方案对比表", description: "2–4 个方案横向对比", body: "", builtin: true },
  { id: "mock-tech-2", stageId: "tech-selection", title: "ADR 草稿", description: "架构决策记录模板", body: "", builtin: true },
  { id: "mock-design-1", stageId: "design-review", title: "接口设计评审", description: "REST/GraphQL 评审清单", body: "", builtin: true },
  { id: "mock-design-2", stageId: "design-review", title: "数据库设计检查", description: "表结构与索引评审", body: "", builtin: true },
  { id: "mock-impl-1", stageId: "implementation", title: "函数实现骨架", description: "生成可填充代码框架", body: "", builtin: true },
  { id: "mock-impl-2", stageId: "implementation", title: "单元测试生成", description: "基于函数签名写测试", body: "", builtin: true },
  { id: "mock-impl-3", stageId: "implementation", title: "错误处理补全", description: "补充异常与边界处理", body: "", builtin: true },
  { id: "mock-cr-1", stageId: "code-review", title: "变更摘要", description: "生成 PR 描述与风险点", body: "", builtin: true },
  { id: "mock-cr-2", stageId: "code-review", title: "安全审查", description: "常见漏洞扫描清单", body: "", builtin: true },
  { id: "mock-test-1", stageId: "test-release", title: "测试用例补全", description: "覆盖边界与回归场景", body: "", builtin: true },
  { id: "mock-test-2", stageId: "test-release", title: "发布检查清单", description: "上线前必查项", body: "", builtin: true },
  { id: "mock-debug-1", stageId: "debug-refactor", title: "根因分析", description: "5 Whys + 修复建议", body: "", builtin: true },
  { id: "mock-debug-2", stageId: "debug-refactor", title: "重构计划", description: "小步重构步骤拆分", body: "", builtin: true },
];

export default function QuickMenu({ inline = false }: { inline?: boolean }) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(MOCK_TEMPLATES);
  const [selectedStageId, setSelectedStageId] = useState<StageId>("requirements");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (!inline) document.body.style.background = "transparent";
    window.codingHelper
      .getTemplates()
      .then((list) => {
        if (list.length > 0) setTemplates(list);
      })
      .catch(() => {
        /* 保留 mock */
      });
    return () => {
      if (!inline) document.body.style.background = "";
    };
  }, [inline]);

  const templatesByStage = useMemo(() => {
    const map = new Map<StageId, PromptTemplate[]>();
    for (const stage of STAGES) map.set(stage.id, []);
    for (const t of templates) {
      const list = map.get(t.stageId);
      if (list) list.push(t);
    }
    return map;
  }, [templates]);

  const stagePrompts = templatesByStage.get(selectedStageId) ?? [];

  useEffect(() => {
    setFocusedIndex(0);
  }, [selectedStageId]);

  useEffect(() => {
    setFocusedIndex((i) => (stagePrompts.length === 0 ? 0 : Math.min(i, stagePrompts.length - 1)));
  }, [stagePrompts.length]);

  const copyTemplate = useCallback(async (t: PromptTemplate) => {
    const rendered = await window.codingHelper.renderPrompt(t.id);
    const text = rendered?.body || t.body || t.title;
    await window.codingHelper.copyText(text);
    await window.codingHelper.pushRecent(t.id);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId((id) => (id === t.id ? null : id)), 1500);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const stageIdx =
        e.altKey && !e.ctrlKey && !e.metaKey && e.key >= "1" && e.key <= "7"
          ? Number(e.key) - 1
          : -1;
      if (stageIdx >= 0 && stageIdx < STAGES.length) {
        e.preventDefault();
        setSelectedStageId(STAGES[stageIdx].id);
        return;
      }

      const digit = e.key >= "1" && e.key <= "9" ? Number(e.key) - 1 : -1;
      if (digit >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = stagePrompts[digit];
        if (t) {
          e.preventDefault();
          void copyTemplate(t);
        }
        return;
      }

      if (e.key === "ArrowDown" && stagePrompts.length > 0) {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, stagePrompts.length - 1));
        return;
      }

      if (e.key === "ArrowUp" && stagePrompts.length > 0) {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        const t = stagePrompts[focusedIndex];
        if (t) {
          e.preventDefault();
          void copyTemplate(t);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const t = stagePrompts[focusedIndex];
        if (t) {
          e.preventDefault();
          void copyTemplate(t);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        void window.codingHelper.closeQuickMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stagePrompts, focusedIndex, copyTemplate]);

  const openTemplate = async (id: string) => {
    await window.codingHelper.pushRecent(id);
    await window.codingHelper.openMain();
    window.codingHelper.closeQuickMenu();
  };

  return (
    <div className={`quick-menu-root${inline ? " quick-menu-root--inline" : ""}`}>
      <div className="quick-menu">
        <div className="quick-menu__header">提示词</div>
        <div className="quick-menu__columns">
          <nav className="quick-menu__stages" aria-label="研发阶段">
            {STAGES.map((stage, stageIndex) => {
              const count = templatesByStage.get(stage.id)?.length ?? 0;
              const active = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`quick-menu__stage${active ? " quick-menu__stage--active" : ""}`}
                  title={`Alt+${stageIndex + 1} 选择此阶段`}
                  onClick={() => setSelectedStageId(stage.id)}
                >
                  <span className="quick-menu__stage-main">
                    <kbd className="quick-menu__stage-key">{stageIndex + 1}</kbd>
                    <span className="quick-menu__stage-label">{stage.label}</span>
                  </span>
                  {count > 0 && <span className="quick-menu__stage-count">{count}</span>}
                </button>
              );
            })}
          </nav>
          <div className="quick-menu__prompts">
            {stagePrompts.length === 0 ? (
              <div className="quick-menu__empty">该阶段暂无提示词</div>
            ) : (
              stagePrompts.map((t, index) => (
                <div
                  key={t.id}
                  className={`quick-menu__prompt${focusedIndex === index ? " quick-menu__prompt--focused" : ""}`}
                >
                  <button
                    type="button"
                    className="quick-menu__prompt-main"
                    onClick={() => openTemplate(t.id)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <div className="quick-menu__prompt-title">{t.title}</div>
                    {t.description && (
                      <div className="quick-menu__prompt-desc">{t.description}</div>
                    )}
                  </button>
                  {index < 9 && <kbd className="quick-menu__prompt-key">{index + 1}</kbd>}
                  <button
                    type="button"
                    className={`quick-menu__prompt-copy${copiedId === t.id ? " quick-menu__prompt-copy--done" : ""}`}
                    title={index < 9 ? `复制 (${index + 1})` : "复制提示词"}
                    aria-label={index < 9 ? `复制提示词，快捷键 ${index + 1}` : "复制提示词"}
                    onClick={() => copyTemplate(t)}
                  >
                    {copiedId === t.id ? "已复制" : "复制"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="quick-menu__footer">
          <span className="quick-menu__hints">Alt+1–7 阶段 · 1–9 复制 · ↑↓ 选择 · Enter / Ctrl+C 复制 · Esc 关闭</span>
          <button type="button" className="quick-menu__open" onClick={() => window.codingHelper.openMain()}>
            打开主面板…
          </button>
        </div>
      </div>
    </div>
  );
}
