const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("worldApi", {
  loadWorld: () => ipcRenderer.invoke("load-world"),
  saveWorld: (data) => ipcRenderer.invoke("save-world", data),
  onRegenerate: (handler) => {
    ipcRenderer.on("regenerate-world", handler);
  }
});
