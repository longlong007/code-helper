import { useEffect, useRef } from "react";
import "./FloatBall.css";

const DRAG_THRESHOLD = 5;

export default function FloatBall() {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const dragState = useRef<{
    startScreenX: number;
    startScreenY: number;
    winX: number;
    winY: number;
  } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  const fireClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) {
        window.codingHelper.toggleQuickMenu();
      } else if (clickCount.current >= 2) {
        window.codingHelper.openMain();
      }
      clickCount.current = 0;
    }, 250);
  };

  const handlePointerDown = async (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    const pos = await window.codingHelper.getFloatBallPosition();
    if (!pos) return;
    dragState.current = {
      startScreenX: e.screenX,
      startScreenY: e.screenY,
      winX: pos.x,
      winY: pos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state) return;

    const dx = e.screenX - state.startScreenX;
    const dy = e.screenY - state.startScreenY;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    moved.current = true;
    void window.codingHelper.setFloatBallPosition(state.winX + dx, state.winY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const wasDrag = moved.current;
    dragState.current = null;
    moved.current = false;

    if (wasDrag) {
      void window.codingHelper.finishFloatBallDrag();
      return;
    }
    fireClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.codingHelper.openMain();
  };

  return (
    <div className="float-root" onContextMenu={handleContextMenu}>
      <button
        type="button"
        className="float-ball"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Coding Helper"
      >
        CH
      </button>
    </div>
  );
}
