import { app, BrowserWindow, Menu, Notification, Tray, clipboard, ipcMain, nativeImage } from "electron";
import fs from "node:fs";
import path from "node:path";

const APP_NAME = "\u684c\u9762\u77ed\u4fe1\u63a5\u6536\u5668";
const START_HIDDEN_ARG = "--hidden";
const hasSingleInstanceLock = app.requestSingleInstanceLock();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let hasShownTrayHint = false;
const shouldStartHidden = process.argv.includes(START_HIDDEN_ARG);

function createFallbackIcon(size = 64) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="bg" x1="8" y1="8" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop stop-color="#17202b" />
            <stop offset="1" stop-color="#0b1017" />
          </linearGradient>
          <linearGradient id="screen" x1="16" y1="20" x2="47" y2="46" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6898af" />
            <stop offset="1" stop-color="#274055" />
          </linearGradient>
          <linearGradient id="bubble" x1="36" y1="10" x2="58" y2="30" gradientUnits="userSpaceOnUse">
            <stop stop-color="#7bb5cb" />
            <stop offset="1" stop-color="#4f8096" />
          </linearGradient>
          <linearGradient id="accent" x1="18" y1="26" x2="31" y2="34" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f3c58b" />
            <stop offset="1" stop-color="#ca8e55" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bg)" />
        <rect x="4" y="4" width="56" height="56" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" />
        <rect x="13" y="20" width="38" height="24" rx="7" fill="#0f1823" stroke="#324353" stroke-width="2" />
        <rect x="16" y="23" width="32" height="18" rx="5" fill="url(#screen)" />
        <path d="M19 28h11" stroke="url(#accent)" stroke-width="3.8" stroke-linecap="round" />
        <path d="M19 33h16" stroke="#eef6fb" stroke-width="3" stroke-linecap="round" />
        <path d="M19 37h10" stroke="#eef6fb" stroke-opacity=".72" stroke-width="2.8" stroke-linecap="round" />
        <path d="M36 12h12c5.523 0 10 4.477 10 10v7c0 5.523-4.477 10-10 10H41.7l-5.5 5c-1.778 1.617-4.7.356-4.7-2.05v-2.95H30c-5.523 0-10-4.477-10-10v-7c0-5.523 4.477-10 10-10Z" fill="url(#bubble)" />
        <path d="M36 20h12M36 25h16M36 30h9" stroke="#f8fcff" stroke-width="2.8" stroke-linecap="round" />
        <path d="M20 50h24M27 55h10" stroke="#d9e3eb" stroke-opacity=".32" stroke-width="3.2" stroke-linecap="round" />
      </svg>
    `;
    return nativeImage
        .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`)
        .resize({ width: size, height: size, quality: "best" });
}

function loadAppIcon(size = 64) {
    const candidates = process.platform === "win32"
        ? ["../assets/app-icon.png", "../assets/app-icon.ico", "../assets/app-icon.svg"]
        : ["../assets/app-icon.png", "../assets/app-icon.svg"];

    for (const relativePath of candidates) {
        const iconPath = path.join(__dirname, relativePath);
        if (!fs.existsSync(iconPath)) continue;
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            return icon.resize({ width: size, height: size, quality: "best" });
        }
    }

    return createFallbackIcon(size);
}

function getLoginItemOptions() {
    if (process.platform !== "win32") {
        return { openAsHidden: true };
    }

    if (app.isPackaged) {
        return { openAsHidden: true, args: [START_HIDDEN_ARG] };
    }

    return {
        openAsHidden: true,
        path: process.execPath,
        args: [app.getAppPath(), START_HIDDEN_ARG],
    };
}

function getAutoLaunchEnabled() {
    return app.getLoginItemSettings(getLoginItemOptions()).openAtLogin;
}

function setAutoLaunchEnabled(enabled: boolean) {
    app.setLoginItemSettings({
        ...getLoginItemOptions(),
        openAtLogin: enabled,
    });

    return getAutoLaunchEnabled();
}

function showMainWindow() {
    if (mainWindow === null) {
        return;
    }

    mainWindow.setSkipTaskbar(false);
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
}

function hideToTray(announce = false) {
    if (mainWindow === null) {
        return;
    }

    mainWindow.setSkipTaskbar(true);
    mainWindow.hide();

    if (announce && tray && !hasShownTrayHint) {
        hasShownTrayHint = true;
        tray.displayBalloon?.({
            iconType: "info",
            title: APP_NAME,
            content: "\u5df2\u7f29\u5230\u7cfb\u7edf\u6258\u76d8\uff0c\u540e\u53f0\u4ecd\u4f1a\u7ee7\u7eed\u63a5\u6536\u77ed\u4fe1\u3002",
        });
    }
}

function attachWindowLifecycleHandlers(window: BrowserWindow) {
    window.on("minimize", () => {
        if (!isQuitting) {
            hideToTray(true);
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 460,
        height: 720,
        minWidth: 420,
        minHeight: 620,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: "#0f1115",
        title: APP_NAME,
        icon: loadAppIcon(256),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        void mainWindow.loadURL(devServerUrl);
    } else {
        void mainWindow.loadFile(path.join(__dirname, "../dist/renderer/index.html"));
    }

    mainWindow.setMenuBarVisibility(false);
    mainWindow.removeMenu();

    mainWindow.once("ready-to-show", () => {
        if (shouldStartHidden) {
            hideToTray(false);
            return;
        }
        mainWindow?.show();
    });

    attachWindowLifecycleHandlers(mainWindow);

    mainWindow.on("close", (event) => {
        if (isQuitting) {
            return;
        }
        event.preventDefault();
        hideToTray(true);
    });
}

function createTray() {
    tray = new Tray(loadAppIcon(18));
    tray.setToolTip(APP_NAME);
    tray.setContextMenu(
        Menu.buildFromTemplate([
            { label: "\u6253\u5f00\u4e3b\u7a97\u53e3", click: () => showMainWindow() },
            {
                label: "\u9000\u51fa",
                click: () => {
                    isQuitting = true;
                    app.quit();
                },
            },
        ]),
    );
    tray.on("click", () => showMainWindow());
    tray.on("double-click", () => showMainWindow());
}

function registerIpcHandlers() {
    ipcMain.handle("desktop:notify", async (_event, payload: { title: string; body: string }) => {
        if (!Notification.isSupported()) {
            return false;
        }

        const notification = new Notification({
            title: payload.title,
            body: payload.body,
            silent: false,
            icon: loadAppIcon(128),
        });
        notification.on("click", () => showMainWindow());
        notification.show();
        return true;
    });

    ipcMain.handle("desktop:copy", async (_event, text: string) => {
        clipboard.writeText(text);
        return true;
    });

    ipcMain.handle("desktop:showWindow", async () => {
        showMainWindow();
        return true;
    });

    ipcMain.handle("desktop:getAutoLaunch", async () => getAutoLaunchEnabled());

    ipcMain.handle("desktop:setAutoLaunch", async (_event, enabled: boolean) => setAutoLaunchEnabled(Boolean(enabled)));
}

if (!hasSingleInstanceLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        showMainWindow();
    });

    app.whenReady().then(() => {
        app.setAppUserModelId("com.codex.sms.desktop");
        app.setName(APP_NAME);
        registerIpcHandlers();
        createTray();
        createWindow();

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
                return;
            }
            showMainWindow();
        });
    });
}

app.on("before-quit", () => {
    isQuitting = true;
});

app.on("window-all-closed", () => {
});
