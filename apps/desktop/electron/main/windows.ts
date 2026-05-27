import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { appStore } from "./store";

function getRendererUrl(hash = ""): string {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}${hash}`;
  }
  return `file://${join(__dirname, "../renderer/index.html")}${hash ? `#${hash.replace(/^#/, "")}` : ""}`;
}

const opacityMap = { high: 1, medium: 0.92, low: 0.75 };

let mainWindow: BrowserWindow | null = null;
let floatBallWindow: BrowserWindow | null = null;
let quickMenuWindow: BrowserWindow | null = null;

const FLOAT_BALL_SIZE = 52;
const SNAP_THRESHOLD = 48;
const QUICK_MENU_WIDTH = 480;
const QUICK_MENU_HEIGHT = 340;
const QUICK_MENU_GAP = 8;
const WORK_MARGIN = 8;
const FLOAT_BALL_EXPANDED_HEIGHT = QUICK_MENU_HEIGHT + QUICK_MENU_GAP + FLOAT_BALL_SIZE;

let floatBallMenuOpen = false;
/** 展开菜单前悬浮球位置，收起时原样恢复（含贴边半隐藏） */
let savedBallOriginBeforeMenu: { x: number; y: number } | null = null;

export type FloatBallMenuPlacement =
  | "above-left"
  | "above-center"
  | "above-right"
  | "below-left"
  | "below-center"
  | "below-right";

function getBallOffsetInWindow(placement: FloatBallMenuPlacement): { x: number; y: number } {
  const ballXLeft = 0;
  const ballXCenter = Math.floor((QUICK_MENU_WIDTH - FLOAT_BALL_SIZE) / 2);
  const ballXRight = QUICK_MENU_WIDTH - FLOAT_BALL_SIZE;
  const ballYTop = 0;
  const ballYBottom = FLOAT_BALL_EXPANDED_HEIGHT - FLOAT_BALL_SIZE;

  const h = placement.endsWith("left")
    ? ballXLeft
    : placement.endsWith("right")
      ? ballXRight
      : ballXCenter;
  const v = placement.startsWith("below") ? ballYTop : ballYBottom;
  return { x: h, y: v };
}

function detectMenuPlacement(bx: number, by: number, work: Electron.Rectangle): FloatBallMenuPlacement {
  const distLeft = bx - work.x;
  const distRight = work.x + work.width - (bx + FLOAT_BALL_SIZE);
  const distTop = by - work.y;
  const distBottom = work.y + work.height - (by + FLOAT_BALL_SIZE);

  const snapLeft = distLeft < SNAP_THRESHOLD;
  const snapRight = distRight < SNAP_THRESHOLD;
  const snapTop = distTop < SNAP_THRESHOLD;
  const snapBottom = distBottom < SNAP_THRESHOLD;

  const vertical: "above" | "below" =
    snapTop && !snapBottom
      ? "below"
      : snapBottom && !snapTop
        ? "above"
        : by + FLOAT_BALL_SIZE / 2 > work.y + work.height / 2
          ? "above"
          : "below";

  const horizontal: "left" | "center" | "right" =
    snapLeft && !snapRight ? "left" : snapRight && !snapLeft ? "right" : "center";

  return `${vertical}-${horizontal}` as FloatBallMenuPlacement;
}

function getDefaultBallOffset(placement: FloatBallMenuPlacement): { x: number; y: number } {
  return getBallOffsetInWindow(placement);
}

function getMenuLayoutInWindow(placement: FloatBallMenuPlacement): { top: number; height: number } {
  if (placement.startsWith("above")) {
    return {
      top: 0,
      height: FLOAT_BALL_EXPANDED_HEIGHT - FLOAT_BALL_SIZE - QUICK_MENU_GAP,
    };
  }
  return {
    top: FLOAT_BALL_SIZE + QUICK_MENU_GAP,
    height: QUICK_MENU_HEIGHT,
  };
}

/** 悬浮球屏幕坐标固定，窗口 clamp 到工作区后反算球在窗口内的偏移 */
function computeExpandedWindowLayout(
  bx: number,
  by: number
): { placement: FloatBallMenuPlacement; ballOffset: { x: number; y: number }; menuTop: number } {
  const display = screen.getDisplayNearestPoint({
    x: bx + FLOAT_BALL_SIZE / 2,
    y: by + FLOAT_BALL_SIZE / 2,
  });
  const work = display.workArea;
  const placement = detectMenuPlacement(bx, by, work);
  const defaultBall = getDefaultBallOffset(placement);
  const menuLayout = getMenuLayoutInWindow(placement);

  const minWinX = work.x + WORK_MARGIN;
  const maxWinX = work.x + work.width - WORK_MARGIN - QUICK_MENU_WIDTH;
  const minWinY = work.y + WORK_MARGIN;
  const maxWinY = work.y + work.height - WORK_MARGIN - FLOAT_BALL_EXPANDED_HEIGHT;

  const winX = Math.round(Math.max(minWinX, Math.min(bx - defaultBall.x, maxWinX)));
  const winY = Math.round(Math.max(minWinY, Math.min(by - defaultBall.y, maxWinY)));

  return {
    placement,
    ballOffset: { x: bx - winX, y: by - winY },
    menuTop: menuLayout.top,
  };
}

function applyExpandedWindowBounds(
  win: BrowserWindow,
  bx: number,
  by: number,
  ballOffset: { x: number; y: number }
): void {
  const targetX = Math.round(bx - ballOffset.x);
  const targetY = Math.round(by - ballOffset.y);

  win.setResizable(true);
  win.setBounds({
    x: targetX,
    y: targetY,
    width: QUICK_MENU_WIDTH,
    height: FLOAT_BALL_EXPANDED_HEIGHT,
  });

  // 修正 Windows 下 setBounds 后可能出现的坐标漂移
  const actual = win.getBounds();
  const driftX = bx - (actual.x + ballOffset.x);
  const driftY = by - (actual.y + ballOffset.y);
  if (driftX !== 0 || driftY !== 0) {
    win.setPosition(actual.x + driftX, actual.y + driftY);
  }
  win.setResizable(false);
}

function applyCollapsedWindowBounds(win: BrowserWindow, bx: number, by: number): void {
  win.setResizable(true);
  win.setBounds({
    x: Math.round(bx),
    y: Math.round(by),
    width: FLOAT_BALL_SIZE,
    height: FLOAT_BALL_SIZE,
  });
  const actual = win.getBounds();
  const driftX = bx - actual.x;
  const driftY = by - actual.y;
  if (driftX !== 0 || driftY !== 0) {
    win.setPosition(actual.x + driftX, actual.y + driftY);
  }
  win.setResizable(false);
}

async function syncRendererMenuLayout(
  win: BrowserWindow,
  open: boolean,
  layout?: {
    placement: FloatBallMenuPlacement;
    ballOffset: { x: number; y: number };
    menuTop: number;
  }
): Promise<void> {
  if (win.webContents.isLoading()) return;
  await win.webContents.executeJavaScript(
    `window.__syncFloatBallMenuLayout?.(${JSON.stringify({ open, layout })})`
  );
}

function getFloatBallDisplay() {
  const ball = floatBallWindow;
  if (!ball || ball.isDestroyed()) {
    return screen.getPrimaryDisplay();
  }
  const [x, y] = ball.getPosition();
  return screen.getDisplayNearestPoint({
    x: x + FLOAT_BALL_SIZE / 2,
    y: y + FLOAT_BALL_SIZE / 2,
  });
}

function clampFloatBallPosition(x: number, y: number) {
  const display = screen.getDisplayNearestPoint({
    x: x + FLOAT_BALL_SIZE / 2,
    y: y + FLOAT_BALL_SIZE / 2,
  });
  const { x: workX, y: workY, width: workW, height: workH } = display.workArea;
  return {
    x: Math.round(Math.max(workX, Math.min(x, workX + workW - FLOAT_BALL_SIZE))),
    y: Math.round(Math.max(workY, Math.min(y, workY + workH - FLOAT_BALL_SIZE))),
    display,
  };
}

export function getFloatBallPosition(): { x: number; y: number } | null {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return null;
  const [x, y] = floatBallWindow.getPosition();
  return { x, y };
}

export function setFloatBallPosition(x: number, y: number): void {
  if (!floatBallWindow || floatBallWindow.isDestroyed() || floatBallMenuOpen) return;

  if (appStore.get("snapToEdge")) {
    const display = screen.getDisplayNearestPoint({
      x: x + FLOAT_BALL_SIZE / 2,
      y: y + FLOAT_BALL_SIZE / 2,
    });
    const { y: workY, height: workH } = display.workArea;
    const clampedY = Math.round(Math.max(workY, Math.min(y, workY + workH - FLOAT_BALL_SIZE)));
    floatBallWindow.setPosition(Math.round(x), clampedY);
    return;
  }

  const clamped = clampFloatBallPosition(x, y);
  floatBallWindow.setPosition(clamped.x, clamped.y);
}

export function finishFloatBallDrag(): void {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
  if (floatBallMenuOpen) return;

  let [x, y] = floatBallWindow.getPosition();
  const clamped = clampFloatBallPosition(x, y);
  x = clamped.x;
  y = clamped.y;

  if (appStore.get("snapToEdge")) {
    const { x: workX, width: workW } = clamped.display.workArea;
    const distLeft = x - workX;
    const distRight = workX + workW - (x + FLOAT_BALL_SIZE);

    if (distLeft < SNAP_THRESHOLD || distRight < SNAP_THRESHOLD) {
      x =
        distLeft <= distRight
          ? workX - Math.floor(FLOAT_BALL_SIZE / 2)
          : workX + workW - Math.ceil(FLOAT_BALL_SIZE / 2);
    }
  }

  floatBallWindow.setPosition(x, y);
  appStore.set("floatBallPosition", {
    x,
    y,
    displayId: clamped.display.id,
  });
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 560,
    show: false,
    frame: false,
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(getRendererUrl("#/"));
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function createFloatBallWindow(): BrowserWindow {
  const settings = appStore.store;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const pos = settings.floatBallPosition ?? {
    x: width - 72,
    y: height - 72,
  };
  const op = opacityMap[settings.opacity] ?? 0.92;

  if (floatBallWindow && !floatBallWindow.isDestroyed()) {
    floatBallWindow.setOpacity(op);
    return floatBallWindow;
  }

  floatBallWindow = new BrowserWindow({
    width: FLOAT_BALL_SIZE,
    height: FLOAT_BALL_SIZE,
    x: pos.x,
    y: pos.y,
    transparent: true,
    frame: false,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatBallWindow.setOpacity(op);
  floatBallWindow.loadURL(getRendererUrl("#/float"));
  floatBallWindow.on("moved", () => {
    if (!floatBallWindow || floatBallMenuOpen) return;
    const [x, y] = floatBallWindow.getPosition();
    const display = getFloatBallDisplay();
    appStore.set("floatBallPosition", { x, y, displayId: display.id });
  });
  floatBallWindow.on("closed", () => {
    floatBallWindow = null;
  });

  return floatBallWindow;
}

export function hideFloatBall(): void {
  floatBallWindow?.hide();
}

export function showFloatBall(): void {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) {
    createFloatBallWindow();
  } else {
    floatBallWindow.show();
  }
}

export function destroyQuickMenu(): void {
  quickMenuWindow?.close();
  quickMenuWindow = null;
  if (floatBallMenuOpen) {
    setFloatBallMenuOpen(false);
  }
}

export function setFloatBallMenuOpen(
  open: boolean,
  ball?: BrowserWindow | null,
  ballScreen?: { x: number; y: number }
): Promise<void> {
  return setFloatBallMenuOpenAsync(open, ball, ballScreen);
}

async function setFloatBallMenuOpenAsync(
  open: boolean,
  ball?: BrowserWindow | null,
  _ballScreen?: { x: number; y: number }
): Promise<void> {
  const win = ball ?? floatBallWindow;
  if (!win || win.isDestroyed()) return;

  if (!open) {
    if (!floatBallMenuOpen) return;
    floatBallMenuOpen = false;
    const restore = savedBallOriginBeforeMenu ?? {
      x: win.getBounds().x,
      y: win.getBounds().y,
    };
    savedBallOriginBeforeMenu = null;
    applyCollapsedWindowBounds(win, restore.x, restore.y);
    await syncRendererMenuLayout(win, false);
    win.webContents.send("float-ball-menu", { open: false });
    return;
  }

  if (floatBallMenuOpen) return;

  const bounds = win.getBounds();
  if (bounds.width <= FLOAT_BALL_SIZE) {
    savedBallOriginBeforeMenu = { x: bounds.x, y: bounds.y };
  } else if (!savedBallOriginBeforeMenu) {
    savedBallOriginBeforeMenu = {
      x: bounds.x + Math.floor((bounds.width - FLOAT_BALL_SIZE) / 2),
      y: bounds.y + bounds.height - FLOAT_BALL_SIZE,
    };
  }

  const bx = savedBallOriginBeforeMenu.x;
  const by = savedBallOriginBeforeMenu.y;
  const layout = computeExpandedWindowLayout(bx, by);

  floatBallMenuOpen = true;
  await syncRendererMenuLayout(win, true, layout);
  applyExpandedWindowBounds(win, bx, by, layout.ballOffset);
  win.webContents.send("float-ball-menu", {
    open: true,
    placement: layout.placement,
    ballOffset: layout.ballOffset,
    menuTop: layout.menuTop,
  });
  win.focus();
}

export function toggleQuickMenu(ballScreen?: { x: number; y: number }): void {
  if (floatBallMenuOpen) {
    setFloatBallMenuOpen(false);
    return;
  }
  destroyQuickMenu();
  setFloatBallMenuOpen(true, floatBallWindow, ballScreen);
}

export function applyAlwaysOnTop(value: boolean): void {
  floatBallWindow?.setAlwaysOnTop(value);
  quickMenuWindow?.setAlwaysOnTop(value);
}

export function applyOpacity(level: "high" | "medium" | "low"): void {
  const op = opacityMap[level] ?? 0.92;
  floatBallWindow?.setOpacity(op);
}
