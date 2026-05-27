import { useEffect, useRef, useState } from "react";
import QuickMenu from "./QuickMenu";
import "./FloatBall.css";

const DRAG_THRESHOLD = 5;

export default function FloatBall() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const dragState = useRef<{
    startScreenX: number;
    startScreenY: number;
    winX: number;
    winY: number;
  } | null>(null);
  const moved = useRef(false);
  const ballScreen = useRef({ x: 0, y: 0 });

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.background = "transparent";
    const off = window.codingHelper.onFloatBallMenuChange((open) => setMenuOpen(open));
    return () => {
      document.body.style.background = "";
      off();
    };
  }, []);

  const fireClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) {
        const next = !menuOpenRef.current;
        setMenuOpen(next);
        void window.codingHelper.setFloatBallMenuOpen(next, ballScreen.current);
      } else if (clickCount.current >= 2) {
        window.codingHelper.openMain();
      }
      clickCount.current = 0;
    }, 250);
  };

  const handlePointerDown = async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (menuOpenRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    ballScreen.current = {
      x: e.screenX - e.offsetX,
      y: e.screenY - e.offsetY,
    };
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
    if (menuOpenRef.current) return;
    const state = dragState.current;
    if (!state) return;

    const dx = e.screenX - state.startScreenX;
    const dy = e.screenY - state.startScreenY;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    moved.current = true;
    void window.codingHelper.setFloatBallPosition(state.winX + dx, state.winY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    ballScreen.current = {
      x: e.screenX - e.offsetX,
      y: e.screenY - e.offsetY,
    };
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
    <div className={`float-root${menuOpen ? " float-root--expanded" : ""}`} onContextMenu={handleContextMenu}>
      {menuOpen && <QuickMenu inline />}
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
