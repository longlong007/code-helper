import { app, Menu } from "electron";
import { registerIpc } from "./ipc";
import { createFloatBallWindow, createMainWindow } from "./windows";
import { appStore } from "./store";

if (process.platform === "win32") {
  app.setAppUserModelId("com.codinghelper.app");
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerIpc();

  if (appStore.get("floatBallVisible")) {
    createFloatBallWindow();
  }

  app.on("activate", () => {
    createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
