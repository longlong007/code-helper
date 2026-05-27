import "./TitleBar.css";

interface TitleBarProps {
  title?: string;
  showControls?: boolean;
}

export default function TitleBar({ title = "Coding Helper", showControls = true }: TitleBarProps) {
  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__logo" />
        <span>{title}</span>
      </div>
      {showControls && (
        <div className="titlebar__controls">
          <button type="button" className="win-btn" onClick={() => window.codingHelper.windowMinimize()}>
            —
          </button>
          <button type="button" className="win-btn win-btn--close" onClick={() => window.codingHelper.windowClose()}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
