const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, ipcMain } = require("electron");

const SETTINGS_STORAGE_KEY = "sms-desktop-settings/v1";
const DEFAULT_BASE_URL = process.env.SMS_BACKEND_URL || "http://127.0.0.1:8000";
const DEFAULT_ADMIN_TOKEN = process.env.SMS_ADMIN_TOKEN || "admin123";
const DEFAULT_INBOUND_API_KEY = process.env.SMS_INBOUND_API_KEY || "change-this-inbound-key";
const SCENARIO = readArg("--scenario") || "connected";
const RENDERER_ENTRY = pathToFileURL(path.join(__dirname, "../dist/renderer/index.html")).toString();
const PRELOAD_ENTRY = path.join(__dirname, "../dist-electron/preload.js");
const ARTIFACT_DIR = path.join(__dirname, "../artifacts");

const notifications = [];
const clipboardWrites = [];
let autoLaunchEnabled = false;

function makeIsolatedReceiver() {
    const suffix = Date.now() % 100000000;
    return `+86137${String(suffix).padStart(8, "0")}`;
}

function readArg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : process.argv[index + 1] ?? null;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, init = {}) {
    const response = await fetch(url, init);
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    return { response, body };
}

async function createClient(prefix) {
    const { response, body } = await requestJson(`${DEFAULT_BASE_URL}/api/admin/clients`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": DEFAULT_ADMIN_TOKEN,
        },
        body: JSON.stringify({
            display_name: `${prefix}-${Date.now()}`,
            note: "runtime verify",
        }),
    });
    if (!response.ok || !body) throw new Error(`Failed to create client: ${JSON.stringify(body)}`);
    return body;
}

async function ensureBinding(phoneNumber, clientId) {
    const { response, body } = await requestJson(`${DEFAULT_BASE_URL}/api/admin/bindings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": DEFAULT_ADMIN_TOKEN,
        },
        body: JSON.stringify({
            phone_number: phoneNumber,
            client_id: clientId,
            enabled: true,
            note: "runtime route",
        }),
    });
    if (!response.ok || !body) throw new Error(`Failed to create binding: ${JSON.stringify(body)}`);
}

async function deleteClient(clientId) {
    const { response, body } = await requestJson(`${DEFAULT_BASE_URL}/api/admin/clients/${encodeURIComponent(clientId)}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": DEFAULT_ADMIN_TOKEN },
    });
    if (!response.ok) throw new Error(`Failed to delete client: ${JSON.stringify(body)}`);
}

function onceDidFinishLoad(win) {
    return new Promise((resolve) => {
        win.webContents.once("did-finish-load", () => resolve());
    });
}

async function bootstrapRenderer(win, settings) {
    const initialLoad = onceDidFinishLoad(win);
    void win.loadURL(RENDERER_ENTRY);
    await initialLoad;
    await win.webContents.executeJavaScript(
        `localStorage.setItem(${JSON.stringify(SETTINGS_STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(settings))}); true;`,
        true,
    );
    const reloaded = onceDidFinishLoad(win);
    win.webContents.reload();
    await reloaded;
    await delay(350);
}

async function readUiSnapshot(win) {
    return await win.webContents.executeJavaScript(
        `(() => {
            const shell = document.querySelector(".floating-window");
            const status = document.querySelector('[data-testid="status-pill"]');
            const focus = document.querySelector(".focus-card");
            const drawer = document.querySelector('[data-testid="side-drawer"]');
            const recent = Array.from(document.querySelectorAll(".recent-item")).map((node) => ({
                id: Number(node.getAttribute("data-message-id") || 0),
                category: node.getAttribute("data-category"),
                code: node.getAttribute("data-code") || null,
                text: node.textContent ? node.textContent.replace(/\\s+/g, " ").trim() : "",
            }));
            return {
                connectionStatus: shell ? shell.getAttribute("data-connection-status") : null,
                drawerView: drawer ? drawer.getAttribute("data-drawer-view") : null,
                statusTone: status ? status.getAttribute("data-status-tone") : null,
                focusState: focus ? focus.getAttribute("data-focus-state") : null,
                focusCode: focus ? focus.getAttribute("data-code") : null,
                recent,
            };
        })()`,
        true,
    );
}

async function waitForUi(win, predicate, description, timeoutMs = 15000) {
    const startedAt = Date.now();
    let snapshot = await readUiSnapshot(win);
    while (Date.now() - startedAt < timeoutMs) {
        if (predicate(snapshot)) return snapshot;
        await delay(150);
        snapshot = await readUiSnapshot(win);
    }
    throw new Error(`Timed out waiting for ${description}. Last snapshot: ${JSON.stringify(snapshot)}`);
}

async function captureWindow(win, name) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const image = await win.webContents.capturePage();
    const filePath = path.join(ARTIFACT_DIR, name);
    fs.writeFileSync(filePath, image.toPNG());
    return filePath;
}

async function runNeedsSetup(win) {
    await bootstrapRenderer(win, { backendUrl: DEFAULT_BASE_URL, desktopToken: "", autoCopyCode: true });
    const ui = await waitForUi(win, (snapshot) => snapshot.connectionStatus === "needs_setup" && snapshot.drawerView === "settings", "needs_setup state");
    return { scenario: "needs_setup", connection_status: ui.connectionStatus, drawer_view: ui.drawerView, screenshot: await captureWindow(win, "runtime-needs-setup.png") };
}

async function runAuthError(win) {
    await bootstrapRenderer(win, { backendUrl: DEFAULT_BASE_URL, desktopToken: "invalid-desktop-token", autoCopyCode: true });
    const ui = await waitForUi(win, (snapshot) => snapshot.connectionStatus === "auth_error", "auth_error state");
    return { scenario: "auth_error", connection_status: ui.connectionStatus, status_tone: ui.statusTone, screenshot: await captureWindow(win, "runtime-auth-error.png") };
}

async function runServerUnreachable(win) {
    await bootstrapRenderer(win, { backendUrl: "http://127.0.0.1:65530", desktopToken: "unreachable-token", autoCopyCode: true });
    const ui = await waitForUi(win, (snapshot) => snapshot.connectionStatus === "server_unreachable", "server_unreachable state");
    return { scenario: "server_unreachable", connection_status: ui.connectionStatus, status_tone: ui.statusTone, screenshot: await captureWindow(win, "runtime-server-unreachable.png") };
}

async function waitForAcknowledge(messageId, code, desktopToken) {
    const startedAt = Date.now();
    let body = null;
    while (Date.now() - startedAt < 10000) {
        const response = await requestJson(`${DEFAULT_BASE_URL}/api/messages?limit=1`, {
            headers: { "X-Desktop-Token": desktopToken },
        });
        body = response.body;
        const topMessage = body?.items?.[0];
        if (topMessage && topMessage.id === messageId && topMessage.code === code && topMessage.acknowledged_at) return topMessage;
        await delay(150);
    }
    throw new Error(`Timed out waiting for acknowledgement. Last history: ${JSON.stringify(body)}`);
}

async function runConnected(win) {
    const client = await createClient("runtime-connected");
    const receiver = makeIsolatedReceiver();
    await ensureBinding(receiver, client.client_id);

    try {
        await bootstrapRenderer(win, {
            backendUrl: DEFAULT_BASE_URL,
            desktopToken: client.access_token,
            autoCopyCode: true,
        });

        const connectedUi = await waitForUi(win, (snapshot) => snapshot.connectionStatus === "connected", "connected state");
        const { response: healthResponse, body: healthBody } = await requestJson(`${DEFAULT_BASE_URL}/health`);
        if (!healthResponse.ok || !healthBody || (healthBody.online_clients ?? 0) < 1) {
            throw new Error(`Desktop client did not register online: ${JSON.stringify(healthBody)}`);
        }

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const { response: inboundResponse, body: inboundBody } = await requestJson(`${DEFAULT_BASE_URL}/api/sms/inbound`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": DEFAULT_INBOUND_API_KEY,
            },
            body: JSON.stringify({
                sender: "106900001234",
                content: `\u3010\u8fd0\u884c\u65f6\u9a8c\u8bc1\u3011\u60a8\u7684\u9a8c\u8bc1\u7801\u662f ${code}\uff0c5 \u5206\u949f\u5185\u6709\u6548\u3002`,
                dev: "runtime-verify",
                receiver,
            }),
        });
        if (!inboundResponse.ok || !inboundBody || inboundBody.status !== "success") {
            throw new Error(`Inbound request failed: ${JSON.stringify(inboundBody)}`);
        }

        const propagatedUi = await waitForUi(
            win,
            (snapshot) => snapshot.focusState === "code" && snapshot.focusCode === code && snapshot.recent[0] && snapshot.recent[0].code === code,
            "latest code propagated to UI",
            20000,
        );

        const { body: historyBody } = await requestJson(`${DEFAULT_BASE_URL}/api/messages?limit=10`, {
            headers: { "X-Desktop-Token": client.access_token },
        });
        const topMessage = historyBody?.items?.find((item) => item.code === code);
        if (!topMessage) throw new Error(`History top item mismatch: ${JSON.stringify(historyBody)}`);

        const acknowledged = await waitForAcknowledge(topMessage.id, code, client.access_token);
        const notification = notifications.at(-1) ?? null;
        if (!notification || !String(notification.title || "").includes(code)) {
            throw new Error(`Expected desktop notification for ${code}, got ${JSON.stringify(notification)}`);
        }
        const clipboard = clipboardWrites.at(-1) ?? null;
        if (clipboard !== code) throw new Error(`Expected clipboard write ${code}, got ${JSON.stringify(clipboardWrites)}`);

        return {
            scenario: "connected",
            connection_status: connectedUi.connectionStatus,
            online_clients: healthBody.online_clients,
            client_id: client.client_id,
            receiver,
            message_id: topMessage.id,
            pushed_clients: inboundBody.pushed_clients,
            latest_code: propagatedUi.focusCode,
            notification_title: notification.title,
            clipboard_value: clipboard,
            acknowledged_at: acknowledged.acknowledged_at,
            screenshot: await captureWindow(win, "runtime-connected.png"),
        };
    } finally {
        await deleteClient(client.client_id).catch(() => null);
    }
}

function createWindow() {
    return new BrowserWindow({
        show: false,
        width: 460,
        height: 720,
        backgroundColor: "#0f1115",
        paintWhenInitiallyHidden: true,
        webPreferences: {
            preload: PRELOAD_ENTRY,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
}

async function main() {
    const scenarioUserData = path.join(os.tmpdir(), "sms-desktop-runtime-verify", `${SCENARIO}-${Date.now()}`);
    fs.rmSync(scenarioUserData, { recursive: true, force: true });
    fs.mkdirSync(scenarioUserData, { recursive: true });
    app.setPath("userData", scenarioUserData);

    ipcMain.handle("desktop:notify", async (_event, payload) => {
        notifications.push(payload);
        return true;
    });
    ipcMain.handle("desktop:copy", async (_event, text) => {
        clipboardWrites.push(text);
        return true;
    });
    ipcMain.handle("desktop:showWindow", async () => true);
    ipcMain.handle("desktop:getAutoLaunch", async () => autoLaunchEnabled);
    ipcMain.handle("desktop:setAutoLaunch", async (_event, enabled) => {
        autoLaunchEnabled = Boolean(enabled);
        return autoLaunchEnabled;
    });

    await app.whenReady();
    const win = createWindow();

    try {
        const result =
            SCENARIO === "needs_setup" ? await runNeedsSetup(win) :
            SCENARIO === "auth_error" ? await runAuthError(win) :
            SCENARIO === "server_unreachable" ? await runServerUnreachable(win) :
            SCENARIO === "connected" ? await runConnected(win) :
            (() => { throw new Error(`Unknown scenario: ${SCENARIO}`); })();
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        const failureScreenshot = await captureWindow(win, `runtime-${SCENARIO}-failure.png`).catch(() => null);
        console.error(JSON.stringify({
            scenario: SCENARIO,
            error: error instanceof Error ? error.message : String(error),
            notifications,
            clipboardWrites,
            failure_screenshot: failureScreenshot,
        }, null, 2));
        process.exitCode = 1;
    } finally {
        if (!win.isDestroyed()) win.destroy();
        await app.quit();
    }
}

void main();
