import { useState } from "react";
import { createCustomTemplate, type StageId } from "@coding-helper/shared";
import { STAGES } from "@coding-helper/shared";
import TitleBar from "../components/TitleBar";

interface TemplateEditorProps {
  stageId: StageId;
  onBack: () => void;
}

export default function TemplateEditor({ stageId, onBack }: TemplateEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState(
    `## 说明\n\n## 上下文\n- 工作区: {{workspaceName}}\n- 文件: {{filePath}}\n\n\`\`\`{{language}}\n{{selection}}\n\`\`\``
  );
  const [selectedStage, setSelectedStage] = useState<StageId>(stageId);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      alert("请填写标题与正文");
      return;
    }
    const t = createCustomTemplate({
      stageId: selectedStage,
      title: title.trim(),
      description: description.trim(),
      body,
    });
    await window.codingHelper.saveCustomTemplate(t);
    onBack();
  };

  const handleExport = async () => {
    const json = await window.codingHelper.exportCustomTemplates();
    await window.codingHelper.copyText(json);
    alert("自定义模板 JSON 已复制到剪贴板");
  };

  const handleImport = async () => {
    const json = prompt("粘贴导入 JSON");
    if (!json) return;
    try {
      const n = await window.codingHelper.importTemplates(json);
      alert(`已导入 ${n} 条自定义模板`);
      onBack();
    } catch (e) {
      alert(`导入失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TitleBar title="新建自定义模板" />
      <div style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← 返回
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleImport}>
          导入
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleExport}>
          导出
        </button>
        <button type="button" className="btn btn--primary" onClick={save}>
          保存
        </button>
      </div>
      <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          阶段
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value as StageId)}
            style={{ display: "block", marginTop: 4, width: 240, height: 32 }}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          标题
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ display: "block", marginTop: 4, width: "100%", height: 32, padding: "0 8px" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          描述
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ display: "block", marginTop: 4, width: "100%", height: 32, padding: "0 8px" }}
          />
        </label>
        <label style={{ display: "block" }}>
          正文（支持 {"{{selection}}"} 等变量）
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            style={{
              display: "block",
              marginTop: 4,
              width: "100%",
              fontFamily: "monospace",
              fontSize: 12,
              padding: 8,
            }}
          />
        </label>
      </div>
    </div>
  );
}
