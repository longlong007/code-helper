import { useEffect, useRef, useState } from "react";
import QuickMenu from "./QuickMenu";
import "./FloatBall.css";

const DRAG_THRESHOLD = 5;
const HOVER_OPEN_DELAY = 220;
const HOVER_CLOSE_DELAY = 320;
const HOVER_SUPPRESS_AFTER_DRAG_MS = 500;

const PLACEMENT_CLASS_PREFIX = "float-root--placement-";

function applyLayoutVars(
  root: Element,
  layout?: { ballOffset: { x: number; y: number }; menuTop: number }
) {
  const el = root as HTMLElement;
  if (!layout) {
    el.style.removeProperty("--ball-left");
    el.style.removeProperty("--ball-top");
    el.style.removeProperty("--menu-top");
    return;
  }
  el.style.setProperty("--ball-left", `${layout.ballOffset.x}px`);
  el.style.setProperty("--ball-top", `${layout.ballOffset.y}px`);
  el.style.setProperty("--menu-top", `${layout.menuTop}px`);
}

function syncFloatBallMenuLayout(payload: {
  open: boolean;
  layout?: {
    placement: string;
    ballOffset: { x: number; y: number };
    menuTop: number;
  };
}) {
  const root = document.querySelector(".float-root");
  if (!root) return;

  root.classList.remove("float-root--expanded");
  for (const cls of Array.from(root.classList)) {
    if (cls.startsWith(PLACEMENT_CLASS_PREFIX)) root.classList.remove(cls);
  }
  applyLayoutVars(root);

  if (payload.open && payload.layout) {
    root.classList.add(
      "float-root--expanded",
      `${PLACEMENT_CLASS_PREFIX}${payload.layout.placement}`
    );
    applyLayoutVars(root, payload.layout);
  }
}

export default function FloatBall() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState("above-center");
  const [ballOffset, setBallOffset] = useState<{ x: number; y: number } | null>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const menuOpenRef = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);
  const suppressHoverUntil = useRef(0);
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
    window.__syncFloatBallMenuLayout = syncFloatBallMenuLayout;
    const off = window.codingHelper.onFloatBallMenuChange((payload) => {
      setMenuOpen(payload.open);
      if (payload.placement) setMenuPlacement(payload.placement);
      if (payload.open && payload.ballOffset) {
        setBallOffset(payload.ballOffset);
        setMenuTop(payload.menuTop ?? null);
      } else {
        setBallOffset(null);
        setMenuTop(null);
      }
    });
    return () => {
      delete window.__syncFloatBallMenuLayout;
      document.body.style.background = "";
      off();
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (hoverOpenTimer.current) clearTimeout(hoverOpenTimer.current);
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    };
  }, []);

  const clearHoverTimers = () => {
    if (hoverOpenTimer.current) {
      clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const canHoverOpen = () =>
    !menuOpenRef.current &&
    !pointerDownRef.current &&
    !dragState.current &&
    !moved.current &&
    Date.now() >= suppressHoverUntil.current;

  const openMenu = async () => {
    if (!canHoverOpen()) return;
    clearHoverTimers();
    // 仅由主进程 setBounds 后再通过 IPC 通知展开，避免先改 CSS 导致球跳动
    await window.codingHelper.setFloatBallMenuOpen(true);
  };

  const closeMenu = async () => {
    if (!menuOpenRef.current) return;
    clearHoverTimers();
    await window.codingHelper.setFloatBallMenuOpen(false);
  };

  const scheduleOpenMenu = () => {
    if (!canHoverOpen()) return;
    clearHoverTimers();
    hoverOpenTimer.current = setTimeout(() => {
      hoverOpenTimer.current = null;
      void openMenu();
    }, HOVER_OPEN_DELAY);
  };

  const scheduleCloseMenu = () => {
    clearHoverTimers();
    hoverCloseTimer.current = setTimeout(() => {
      hoverCloseTimer.current = null;
      void closeMenu();
    }, HOVER_CLOSE_DELAY);
  };

  const handleRootEnter = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
    scheduleOpenMenu();
  };

  const handleRootLeave = () => {
    if (hoverOpenTimer.current) {
      clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    if (menuOpenRef.current) scheduleCloseMenu();
  };

  const fireClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current >= 2) {
        window.codingHelper.openMain();
      }
      clickCount.current = 0;
    }, 250);
  };

  const handlePointerDown = async (e: React.PointerEvent<HTMLButtonElement>) => {
    clearHoverTimers();
    pointerDownRef.current = true;

    if (menuOpenRef.current) {
      await closeMenu();
    }

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
    const state = dragState.current;
    if (!state) return;

    const dx = e.screenX - state.startScreenX;
    const dy = e.screenY - state.startScreenY;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    moved.current = true;
    clearHoverTimers();
    void window.codingHelper.setFloatBallPosition(state.winX + dx, state.winY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    pointerDownRef.current = false;
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
      suppressHoverUntil.current = Date.now() + HOVER_SUPPRESS_AFTER_DRAG_MS;
      void window.codingHelper.finishFloatBallDrag();
      return;
    }
    fireClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.codingHelper.openMain();
  };

  const menuBelow = menuPlacement.startsWith("below");
  const rootStyle =
    menuOpen && ballOffset
      ? ({
          "--ball-left": `${ballOffset.x}px`,
          "--ball-top": `${ballOffset.y}px`,
          "--menu-top": `${menuTop ?? (menuBelow ? 60 : 0)}px`,
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={`float-root${menuOpen ? " float-root--expanded" : ""}${
        menuOpen ? ` float-root--placement-${menuPlacement}` : ""
      }`}
      style={rootStyle}
      onMouseEnter={handleRootEnter}
      onMouseLeave={handleRootLeave}
      onContextMenu={handleContextMenu}
    >
      {menuOpen && menuBelow && <QuickMenu inline />}
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
      {menuOpen && !menuBelow && <QuickMenu inline />}
    </div>
  );
}
