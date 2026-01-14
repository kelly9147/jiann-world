const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

const WORLD_FILE = "worldMap.dat";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: "#0b0f14",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
  return win;
}

app.whenReady().then(() => {
  const win = createWindow();

  const menu = Menu.buildFromTemplate([
    {
      label: "World",
      submenu: [
        {
          label: "Regenerate Map",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => win.webContents.send("regenerate-world")
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("load-world", async () => {
  const fs = require("fs");
  const filePath = path.join(app.getPath("userData"), WORLD_FILE);
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return null;
  }
});

ipcMain.handle("save-world", async (_event, data) => {
  const fs = require("fs");
  const filePath = path.join(app.getPath("userData"), WORLD_FILE);
  try {
    fs.writeFileSync(filePath, data, "utf8");
    return true;
  } catch (err) {
    return false;
  }
});
