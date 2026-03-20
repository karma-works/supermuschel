import { contextBridge, ipcRenderer } from "electron";
import { REQUEST_CHANNEL, EVENT_CHANNEL } from "./ipc/handler.js";

contextBridge.exposeInMainWorld("trpcBridge", {
  request: (message: unknown) => ipcRenderer.invoke(REQUEST_CHANNEL, message),
  onEvent: (callback: (event: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: unknown) => callback(event);
    ipcRenderer.on(EVENT_CHANNEL, handler);
    return () => ipcRenderer.off(EVENT_CHANNEL, handler);
  },
});

contextBridge.exposeInMainWorld("shell", {
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
});
