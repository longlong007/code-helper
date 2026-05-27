import { useEffect, useRef, useState } from "react";
import TitleBar from "../components/TitleBar";
import "./ChatView.css";

interface ChatViewProps {
  onBack: () => void;
  initialUserMessage?: string;
  templateTitle?: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function ChatView({ onBack, initialUserMessage = "", templateTitle }: ChatViewProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(initialUserMessage);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUserMessage && messages.length === 0) {
      setMessages([{ role: "user", content: initialUserMessage }]);
    }
  }, [initialUserMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsub = window.codingHelper.onChatStreamChunk((chunk) => {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = { role: "assistant", content: last.content + chunk.content };
        } else {
          copy.push({ role: "assistant", content: chunk.content });
        }
        return copy;
      });
      if (chunk.done) setStreaming(false);
    });
    return unsub;
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);
    const apiMessages = next.map((m) => ({ role: m.role, content: m.content }));
    window.codingHelper.chatStreamStart(apiMessages);
  };

  return (
    <div className="chat-view">
      <TitleBar title={templateTitle ? `对话 · ${templateTitle}` : "对话"} />
      <div className="chat-view__back">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← 返回
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message message--${m.role}`}>
            <div className="message__bubble">{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入追问，Ctrl+Enter 发送…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="chat-composer__actions">
          <button type="button" className="btn btn--primary" disabled={streaming} onClick={send}>
            {streaming ? "生成中…" : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
