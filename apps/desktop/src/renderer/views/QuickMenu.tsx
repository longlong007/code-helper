import { useEffect, useState } from "react";
import type { PromptTemplate } from "@coding-helper/shared";
import { STAGES } from "@coding-helper/shared";
import "./QuickMenu.css";

export default function QuickMenu({ inline = false }: { inline?: boolean }) {
  const [recent, setRecent] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    if (!inline) document.body.style.background = "transparent";
    Promise.all([
      window.codingHelper.getTemplates(),
      window.codingHelper.getSettings(),
    ]).then(([templates, settings]) => {
      const ids = settings.recentTemplateIds ?? [];
      setRecent(ids.map((id) => templates.find((t) => t.id === id)).filter(Boolean) as PromptTemplate[]);
    });
    return () => {
      if (!inline) document.body.style.background = "";
    };
  }, [inline]);

  const openTemplate = async (id: string) => {
    await window.codingHelper.pushRecent(id);
    await window.codingHelper.openMain();
    window.codingHelper.closeQuickMenu();
  };

  return (
    <div className={`quick-menu-root${inline ? " quick-menu-root--inline" : ""}`}>
      <div className="quick-menu">
        <div className="quick-menu__header">最近使用</div>
        {recent.length === 0 && (
          <div className="quick-menu__empty">暂无最近模板</div>
        )}
        {recent.map((t) => (
          <button key={t.id} type="button" className="quick-menu__item" onClick={() => openTemplate(t.id)}>
            <span className="quick-menu__icon">{STAGES.find((s) => s.id === t.stageId)?.label.slice(0, 1) ?? "?"}</span>
            <span>
              <div className="quick-menu__title">{t.title}</div>
              <div className="quick-menu__sub">{STAGES.find((s) => s.id === t.stageId)?.label}</div>
            </span>
          </button>
        ))}
        <div className="quick-menu__divider" />
        <button type="button" className="quick-menu__open" onClick={() => window.codingHelper.openMain()}>
          打开主面板…
        </button>
      </div>
    </div>
  );
}
