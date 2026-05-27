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

function resolveBallScreenOrigin(
  ball: BrowserWindow,
  ballScreen?: { x: number; y: number }
): { x: number; y: number } {
  const bounds = ball.getBounds();
  if (!ballScreen) return { x: bounds.x, y: bounds.y };

  const rendererOk = ballScreen.x > 10 || ballScreen.y > 10;
  const boundsOk = bounds.x > 10 || bounds.y > 10;
  if (rendererOk) return ballScreen;
  if (boundsOk) return { x: bounds.x, y: bounds.y };
  return ballScreen;
}

function clampExpandedWindowPosition(bx: number, by: number) {
  const ballCenterX = bx + FLOAT_BALL_SIZE / 2;
  const ballBottom = by + FLOAT_BALL_SIZE;
  const display = screen.getDisplayNearestPoint({ x: ballCenterX, y: by + FLOAT_BALL_SIZE / 2 });
  const work = display.workArea;

  let x = Math.round(ballCenterX - QUICK_MENU_WIDTH / 2);
  let y = Math.round(ballBottom - FLOAT_BALL_EXPANDED_HEIGHT);

  if (y < work.y + WORK_MARGIN) {
    y = Math.round(by + FLOAT_BALL_SIZE + QUICK_MENU_GAP);
  }

  x = Math.max(
    work.x + WORK_MARGIN,
    Math.min(x, work.x + work.width - QUICK_MENU_WIDTH - WORK_MARGIN)
  );

  const maxY = work.y + work.height - FLOAT_BALL_EXPANDED_HEIGHT - WORK_MARGIN;
  y = Math.max(work.y + WORK_MARGIN, Math.min(y, maxY));

  return { x, y };
}

export function getFloatBallWindow(): BrowserWindow | null {
  return floatBallWindow;
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
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;
  const clamped = clampFloatBallPosition(x, y);
  floatBallWindow.setPosition(clamped.x, clamped.y);
}

export function finishFloatBallDrag(): void {
  if (!floatBallWindow || floatBallWindow.isDestroyed()) return;

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
    if (!floatBallWindow) return;
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
): void {
  const win = ball ?? floatBallWindow;
  if (!win || win.isDestroyed()) return;

  if (!open) {
    if (!floatBallMenuOpen) return;
    floatBallMenuOpen = false;
    const bounds = win.getBounds();
    const ballX = Math.round(bounds.x + (bounds.width - FLOAT_BALL_SIZE) / 2);
    const ballY = Math.round(bounds.y + bounds.height - FLOAT_BALL_SIZE);
    win.setResizable(true);
    win.setBounds({ x: ballX, y: ballY, width: FLOAT_BALL_SIZE, height: FLOAT_BALL_SIZE });
    win.setResizable(false);
    win.webContents.send("float-ball-menu", false);
    return;
  }

  if (floatBallMenuOpen) return;

  const origin = resolveBallScreenOrigin(win, ballScreen);
  const { x, y } = clampExpandedWindowPosition(origin.x, origin.y);

  floatBallMenuOpen = true;
  win.setResizable(true);
  win.setBounds({ x, y, width: QUICK_MENU_WIDTH, height: FLOAT_BALL_EXPANDED_HEIGHT });
  win.setResizable(false);
  win.webContents.send("float-ball-menu", true);
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
