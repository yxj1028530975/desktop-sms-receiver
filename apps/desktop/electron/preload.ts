import { contextBridge, ipcRenderer } from "electron";


contextBridge.exposeInMainWorld("desktopApi", {
    showNotification(title: string, body: string) {
        return ipcRenderer.invoke("desktop:notify", { title, body });
    },
    writeClipboard(text: string) {
        return ipcRenderer.invoke("desktop:copy", text);
    },
    showWindow() {
        return ipcRenderer.invoke("desktop:showWindow");
    },
    getAutoLaunch() {
        return ipcRenderer.invoke("desktop:getAutoLaunch");
    },
    setAutoLaunch(enabled: boolean) {
        return ipcRenderer.invoke("desktop:setAutoLaunch", enabled);
    },
});
