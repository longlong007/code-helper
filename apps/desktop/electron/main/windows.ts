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
}

export function toggleQuickMenu(anchor?: { x: number; y: number }): void {
  if (quickMenuWindow && !quickMenuWindow.isDestroyed()) {
    destroyQuickMenu();
    return;
  }

  const ball = floatBallWindow;
  const [bx, by] = ball?.getPosition() ?? [100, 100];

  quickMenuWindow = new BrowserWindow({
    width: 280,
    height: 320,
    x: anchor?.x ?? bx - 220,
    y: anchor?.y ?? by - 330,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  quickMenuWindow.loadURL(getRendererUrl("#/quick-menu"));
  quickMenuWindow.on("blur", () => destroyQuickMenu());
  quickMenuWindow.on("closed", () => {
    quickMenuWindow = null;
  });
}

export function applyAlwaysOnTop(value: boolean): void {
  floatBallWindow?.setAlwaysOnTop(value);
  quickMenuWindow?.setAlwaysOnTop(value);
}

export function applyOpacity(level: "high" | "medium" | "low"): void {
  const op = opacityMap[level] ?? 0.92;
  floatBallWindow?.setOpacity(op);
}
