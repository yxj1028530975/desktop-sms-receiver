import { useEffect, useMemo, useRef, useState } from "react";

import {
    buildNotificationTitle,
    copy,
    describeIdleMessage,
    formatCategoryLabel,
    formatDateTime,
    formatRelativeTime,
    presentStatus,
} from "./copy";
import type { ConnectionStatus, DesktopSettings, SmsMessage, SmsMessageList } from "../types";

type DrawerView = "history" | "settings" | null;
type HistoryFilter = "all" | "code" | "notice";
type TestTone = "success" | "warning" | "danger";

interface TestResult {
    title: string;
    detail: string;
    tone: TestTone;
}

const SETTINGS_STORAGE_KEY = "sms-desktop-settings/v1";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");
const shorten = (text: string, maxLength = 86) => (text.length > maxLength ? `${text.slice(0, maxLength)}...` : text);
const recentPriority = (message: SmsMessage) => (message.category === "code" ? 0 : message.category === "notice" ? 1 : 2);
const defaultSettings = (): DesktopSettings => ({ backendUrl: DEFAULT_BACKEND_URL, desktopToken: "", autoCopyCode: true });
const sanitizeSettings = (input: Partial<DesktopSettings>): DesktopSettings => ({
    backendUrl: normalizeBaseUrl(input.backendUrl ?? DEFAULT_BACKEND_URL) || DEFAULT_BACKEND_URL,
    desktopToken: String(input.desktopToken ?? "").trim(),
    autoCopyCode: input.autoCopyCode ?? true,
});

const loadSettings = (): DesktopSettings => {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? sanitizeSettings(JSON.parse(raw) as Partial<DesktopSettings>) : defaultSettings();
    } catch {
        return defaultSettings();
    }
};

const persistSettings = (settings: DesktopSettings) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

const buildWebSocketUrl = (baseUrl: string, token: string) => {
    const url = new URL(normalizeBaseUrl(baseUrl));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/api/ws/desktop";
    url.searchParams.set("token", token);
    return url.toString();
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<{ response: Response; body: T | null }> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const text = await response.text();
        return { response, body: text ? (JSON.parse(text) as T) : null };
    } finally {
        window.clearTimeout(timer);
    }
}

async function showDesktopNotification(title: string, body: string) {
    if (window.desktopApi) return window.desktopApi.showNotification(title, body);
    if (!("Notification" in window)) return false;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") return false;
    new Notification(title, { body });
    return true;
}

async function writeClipboard(text: string) {
    if (window.desktopApi) return window.desktopApi.writeClipboard(text);
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
}

export default function App() {
    const initialSettings = useMemo(() => loadSettings(), []);
    const initialStatus: ConnectionStatus = initialSettings.desktopToken ? "connecting" : "needs_setup";
    const [settings, setSettings] = useState(initialSettings);
    const [draftSettings, setDraftSettings] = useState(initialSettings);
    const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
    const [isLoadingAutoLaunch, setIsLoadingAutoLaunch] = useState(Boolean(window.desktopApi));
    const [isUpdatingAutoLaunch, setIsUpdatingAutoLaunch] = useState(false);
    const [messages, setMessages] = useState<SmsMessage[]>([]);
    const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
    const [statusMessage, setStatusMessage] = useState(presentStatus(initialStatus).detail);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
    const [drawerView, setDrawerView] = useState<DrawerView>(initialSettings.desktopToken ? null : "settings");
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const connectionAttemptRef = useRef(0);
    const intentionalCloseRef = useRef(false);
    const settingsRef = useRef(settings);
    const seenIdsRef = useRef(new Set<number>());
    const lastServerSignalRef = useRef(Date.now());

    useEffect(() => {
        settingsRef.current = settings;
        persistSettings(settings);
    }, [settings]);

    useEffect(() => {
        seenIdsRef.current = new Set(messages.map((message) => message.id));
    }, [messages]);

    useEffect(() => {
        let active = true;

        const syncAutoLaunch = async () => {
            if (!window.desktopApi) {
                setIsLoadingAutoLaunch(false);
                return;
            }

            try {
                const enabled = await window.desktopApi.getAutoLaunch();
                if (!active) return;
                setAutoLaunchEnabled(enabled);
            } catch {
            } finally {
                if (active) setIsLoadingAutoLaunch(false);
            }
        };

        void syncAutoLaunch();
        return () => {
            active = false;
        };
    }, []);

    const clearReconnectTimer = () => {
        if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const markServerSignal = () => {
        lastServerSignalRef.current = Date.now();
    };

    const closeSocket = () => {
        if (!socketRef.current) return;
        intentionalCloseRef.current = true;
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
    };

    const upsertMessages = (incoming: SmsMessage[]) =>
        setMessages((current) => {
            const next = new Map<number, SmsMessage>();
            current.forEach((message) => next.set(message.id, message));
            incoming.forEach((message) => next.set(message.id, message));
            return [...next.values()].sort((left, right) => right.id - left.id).slice(0, 120);
        });

    const fetchHistory = async (customSettings = settings) => {
        if (!customSettings.desktopToken) return false;
        setIsLoadingHistory(true);
        try {
            const { response, body } = await requestJson<SmsMessageList>(`${customSettings.backendUrl}/api/messages?limit=50`, {
                headers: { "X-Desktop-Token": customSettings.desktopToken },
            });
            if (response.status === 401) {
                setStatus("auth_error");
                setStatusMessage(copy.status.messages.historyAuthError);
                return false;
            }
            if (!response.ok || !body) throw new Error("history");
            upsertMessages(body.items);
            return true;
        } catch {
            setStatus("server_unreachable");
            setStatusMessage(copy.status.messages.historyFailed);
            return false;
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const acknowledgeMessage = async (messageId: number, acknowledgedAt: string) => {
        if (!settings.desktopToken) return;
        setMessages((current) => current.map((message) => (message.id === messageId ? { ...message, acknowledged_at: message.acknowledged_at ?? acknowledgedAt } : message)));
        try {
            await fetch(`${settings.backendUrl}/api/messages/${messageId}/ack`, { method: "POST", headers: { "X-Desktop-Token": settings.desktopToken } });
        } catch {}
    };

    const copyCode = async (code: string | null, messageId?: number) => {
        if (!code) return;
        await writeClipboard(code);
        if (messageId !== undefined) await acknowledgeMessage(messageId, new Date().toISOString());
    };

    const preflightApi = async (customSettings: DesktopSettings) => {
        if (!customSettings.desktopToken) return { ok: false, status: "needs_setup" as const, detail: copy.test.missingTokenDetail };
        try {
            const { response } = await requestJson<Record<string, unknown>>(`${customSettings.backendUrl}/health`);
            if (!response.ok) return { ok: false, status: "server_unreachable" as const, detail: `Health \u63a5\u53e3\u5f02\u5e38\uff1aHTTP ${response.status}\u3002` };
        } catch {
            return { ok: false, status: "server_unreachable" as const, detail: "\u65e0\u6cd5\u8fde\u901a\u540e\u7aef\u670d\u52a1\u3002" };
        }
        try {
            const { response } = await requestJson<SmsMessageList>(`${customSettings.backendUrl}/api/messages?limit=1`, {
                headers: { "X-Desktop-Token": customSettings.desktopToken },
            });
            if (response.status === 401) return { ok: false, status: "auth_error" as const, detail: copy.status.details.auth_error };
            if (!response.ok) return { ok: false, status: "server_unreachable" as const, detail: `\u5386\u53f2\u63a5\u53e3\u5f02\u5e38\uff1aHTTP ${response.status}\u3002` };
        } catch {
            return { ok: false, status: "server_unreachable" as const, detail: "\u5386\u53f2\u63a5\u53e3\u65e0\u6cd5\u8fde\u901a\u3002" };
        }
        return { ok: true, status: "connected" as const, detail: copy.test.restReadyDetail };
    };

    const probeWebSocket = async (customSettings: DesktopSettings) =>
        await new Promise<{ display_name?: string; server_time?: string }>((resolve, reject) => {
            let settled = false;
            const socket = new WebSocket(buildWebSocketUrl(customSettings.backendUrl, customSettings.desktopToken));
            const timer = window.setTimeout(() => {
                if (!settled) {
                    settled = true;
                    socket.close();
                    reject(new Error("WebSocket \u63e1\u624b\u8d85\u65f6\u3002"));
                }
            }, 4000);
            const finish = (callback: () => void) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                callback();
            };
            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as { type?: string; data?: { display_name?: string; server_time?: string } };
                    if (payload.type === "system.ready") {
                        finish(() => {
                            socket.close();
                            resolve(payload.data ?? {});
                        });
                    }
                } catch {}
            };
            socket.onerror = () => finish(() => reject(new Error("WebSocket \u63e1\u624b\u5931\u8d25\u3002")));
            socket.onclose = (event) => finish(() => reject(new Error(event.code === 1008 ? copy.status.details.auth_error : "WebSocket \u8fc7\u65e9\u5173\u95ed\u3002")));
        });

    const runConnectionTest = async (customSettings = draftSettings) => {
        const nextSettings = sanitizeSettings(customSettings);
        setIsTestingConnection(true);
        setTestResult(null);
        const api = await preflightApi(nextSettings);
        if (!api.ok) {
            setTestResult({
                title: api.status === "auth_error" ? copy.test.tokenRejectedTitle : api.status === "needs_setup" ? copy.test.missingTokenTitle : copy.test.backendDownTitle,
                detail: api.detail,
                tone: api.status === "needs_setup" ? "warning" : "danger",
            });
            setIsTestingConnection(false);
            return;
        }
        try {
            const ready = await probeWebSocket(nextSettings);
            setTestResult({ title: copy.test.wsReadyTitle, detail: copy.test.wsReadyDetail(ready.display_name), tone: "success" });
        } catch (error) {
            setTestResult({ title: copy.test.wsFailedTitle, detail: error instanceof Error ? error.message : "WebSocket \u63e1\u624b\u5931\u8d25\u3002", tone: "danger" });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const scheduleReconnect = () => {
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
            const attemptId = ++connectionAttemptRef.current;
            void connectWithSettings(settingsRef.current, "reconnecting", attemptId);
        }, 3000);
    };

    const connectWithSettings = async (customSettings: DesktopSettings, mode: ConnectionStatus, attemptId: number) => {
        clearReconnectTimer();
        closeSocket();
        if (!customSettings.desktopToken) {
            setStatus("needs_setup");
            setStatusMessage(copy.status.helper.needs_setup);
            return;
        }
        setStatus(mode);
        setStatusMessage(mode === "reconnecting" ? copy.status.messages.socketRetrying : copy.status.messages.socketOpening);
        const api = await preflightApi(customSettings);
        if (attemptId !== connectionAttemptRef.current) return;
        if (!api.ok) {
            setStatus(api.status);
            setStatusMessage(api.detail);
            return;
        }
        intentionalCloseRef.current = false;
        markServerSignal();
        const socket = new WebSocket(buildWebSocketUrl(customSettings.backendUrl, customSettings.desktopToken));
        socketRef.current = socket;
        socket.onmessage = (event) => {
            if (attemptId !== connectionAttemptRef.current) return;
            try {
                const payload = JSON.parse(event.data) as { type?: string; data?: SmsMessage & { display_name?: string; server_time?: string } };
                markServerSignal();
                if (payload.type === "system.ready") {
                    setStatus("connected");
                    setStatusMessage(payload.data?.display_name ? copy.status.messages.connectedAs(payload.data.display_name) : copy.status.messages.connectedSimple);
                    setLastSyncAt(payload.data?.server_time ?? new Date().toISOString());
                    void fetchHistory(customSettings);
                    return;
                }
                if (payload.type === "system.replaced") {
                    intentionalCloseRef.current = true;
                    setStatus("session_conflict");
                    setStatusMessage(copy.status.messages.socketReplaced);
                    return;
                }
                if (payload.type === "pong") return;
                if (payload.type !== "sms.created" || !payload.data || !("id" in payload.data)) return;
                const message = payload.data as SmsMessage;
                if (seenIdsRef.current.has(message.id)) return;
                setLastSyncAt(message.created_at);
                upsertMessages([message]);
                void showDesktopNotification(buildNotificationTitle(message), shorten(message.content));
                if (customSettings.autoCopyCode && message.code) void copyCode(message.code, message.id);
            } catch {}
        };
        socket.onerror = () => { if (attemptId === connectionAttemptRef.current) setStatusMessage(copy.status.messages.socketInitFailed); };
        socket.onclose = (event) => {
            if (attemptId !== connectionAttemptRef.current) return;
            socketRef.current = null;
            if (intentionalCloseRef.current) return;
            if (event.code === 1008) {
                setStatus("auth_error");
                setStatusMessage(copy.status.messages.socketRejected);
                return;
            }
            if (event.code === 4009) {
                setStatus("session_conflict");
                setStatusMessage(copy.status.messages.socketReplaced);
                return;
            }
            setStatus("reconnecting");
            setStatusMessage(copy.status.messages.socketDropped);
            scheduleReconnect();
        };
    };

    useEffect(() => {
        const attemptId = ++connectionAttemptRef.current;
        void connectWithSettings(settings, "connecting", attemptId);
        return () => {
            connectionAttemptRef.current += 1;
            clearReconnectTimer();
            closeSocket();
        };
    }, [settings]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            const socket = socketRef.current;
            if (!socket || socket.readyState !== WebSocket.OPEN) return;

            const silenceMs = Date.now() - lastServerSignalRef.current;
            if (silenceMs > 75000) {
                setStatus("reconnecting");
                setStatusMessage(copy.status.messages.socketHeartbeatExpired);
                intentionalCloseRef.current = false;
                socket.close(4001, "heartbeat-timeout");
                return;
            }

            try {
                socket.send("ping");
            } catch {}
        }, 30000);
        return () => window.clearInterval(timer);
    }, []);

    const latestCodeMessage = messages.find((message) => message.code);
    const latestMessage = messages[0];
    const recentMessages = [...messages].sort((left, right) => recentPriority(left) - recentPriority(right) || right.id - left.id).slice(0, 8);
    const filteredHistory = messages.filter((message) => historyFilter === "code" ? message.category === "code" : historyFilter === "notice" ? message.category === "notice" : true);
    const activeStatus = presentStatus(status);
    const unreadCount = messages.filter((message) => !message.acknowledged_at).length;
    const codeCount = messages.filter((message) => message.category === "code").length;
    const hasDraftToken = Boolean(draftSettings.desktopToken.trim());
    const adminUrl = `${normalizeBaseUrl(draftSettings.backendUrl) || DEFAULT_BACKEND_URL}/admin`;

    const openSettingsDrawer = () => {
        setDraftSettings(settings);
        setTestResult(null);
        setDrawerView("settings");
    };

    const updateAutoLaunch = async (enabled: boolean) => {
        setAutoLaunchEnabled(enabled);
        if (!window.desktopApi) return;

        setIsUpdatingAutoLaunch(true);
        try {
            const nextState = await window.desktopApi.setAutoLaunch(enabled);
            setAutoLaunchEnabled(nextState);
        } catch {
            setAutoLaunchEnabled((current) => !current);
        } finally {
            setIsUpdatingAutoLaunch(false);
        }
    };

    const renderMessageItem = (message: SmsMessage, variant: "recent" | "history") => (
        <article className={variant === "recent" ? "recent-item" : "history-item"} key={`${variant}-${message.id}`} data-message-id={message.id} data-category={message.category} data-code={message.code ?? ""}>
            <div className="recent-item-head">
                <div className="message-tags">
                    <span className={`tag is-${message.category}`}>{formatCategoryLabel(message.category)}</span>
                    {message.code ? <span className="tag is-code-value">{message.code}</span> : null}
                </div>
                <span>{formatDateTime(message.created_at)}</span>
            </div>
            <strong>{message.contact_name || message.sender}</strong>
            <p>{variant === "recent" ? shorten(message.content) : message.content}</p>
            <div className="recent-item-actions">
                <span>{message.acknowledged_at ? copy.common.read : copy.common.unread}</span>
                <div className="inline-actions">
                    {message.code ? <button className="mini-button" type="button" onClick={() => void copyCode(message.code, message.id)}>{copy.common.copy}</button> : null}
                    {variant === "history" && !message.acknowledged_at ? <button className="mini-button muted" type="button" onClick={() => void acknowledgeMessage(message.id, new Date().toISOString())}>{copy.common.markRead}</button> : null}
                </div>
            </div>
        </article>
    );

    return (
        <div className="app-shell">
            <div className="floating-window" data-connection-status={status} data-drawer-view={drawerView ?? "closed"}>
                <header className="top-bar">
                    <div className="title-group">
                        <p className="app-kicker">{copy.app.kicker}</p>
                        <h1>{copy.app.title}</h1>
                        <p className="top-note">{copy.app.subtitle}</p>
                    </div>
                    <div className="top-bar-actions">
                        <div className={`status-pill is-${activeStatus.tone}`} data-testid="status-pill" data-connection-status={status} data-status-tone={activeStatus.tone}>
                            <span className="status-dot" />
                            <div>
                                <strong>{activeStatus.label}</strong>
                                <span>{`${copy.app.lastSyncPrefix} ${formatRelativeTime(lastSyncAt)}`}</span>
                            </div>
                        </div>
                        <button className="icon-button" type="button" onClick={() => { setDrawerView("history"); void fetchHistory(settings); }} aria-label={copy.history.title}>{copy.history.title}</button>
                        <button className="icon-button" type="button" onClick={openSettingsDrawer} aria-label={copy.settings.title}>{copy.settings.title}</button>
                    </div>
                </header>

                <div className="window-body" data-testid="window-body" tabIndex={0}>
                    <section className={`status-banner is-${activeStatus.tone}`} data-testid="status-banner" data-connection-status={status}>
                        <div>
                            <strong>{activeStatus.detail}</strong>
                            <p>{statusMessage || copy.status.helper[status]}</p>
                        </div>
                        {(status === "needs_setup" || status === "auth_error" || status === "server_unreachable") ? <button className="ghost-button" type="button" onClick={openSettingsDrawer}>{copy.common.openSettings}</button> : null}
                    </section>

                    {latestCodeMessage ? (
                        <section className="focus-card" data-focus-state="code" data-message-id={latestCodeMessage.id} data-code={latestCodeMessage.code ?? ""}>
                            <div className="focus-meta">
                                <span className="eyebrow">{copy.focus.codeEyebrow}</span>
                                <span>{formatDateTime(latestCodeMessage.created_at)}</span>
                            </div>
                            <div className="code-display">{latestCodeMessage.code}</div>
                            <h2>{latestCodeMessage.contact_name || latestCodeMessage.sender}</h2>
                            <p>{latestCodeMessage.content}</p>
                            <div className="action-row">
                                <button className="primary-button" type="button" onClick={() => void copyCode(latestCodeMessage.code, latestCodeMessage.id)}>{copy.focus.copyCode}</button>
                                {!latestCodeMessage.acknowledged_at ? <button className="ghost-button" type="button" onClick={() => void acknowledgeMessage(latestCodeMessage.id, new Date().toISOString())}>{copy.common.markRead}</button> : <span className="inline-note">{copy.common.acknowledged}</span>}
                            </div>
                        </section>
                    ) : status === "needs_setup" ? (
                        <section className="focus-card is-empty" data-focus-state="setup">
                            <span className="eyebrow">{copy.focus.setupEyebrow}</span>
                            <h2>{copy.focus.setupTitle}</h2>
                            <p>{copy.focus.setupDescription}</p>
                            <div className="setup-steps">
                                <span>{`1. ${copy.settings.presetTitle}`}</span>
                                <span>{`2. ${copy.settings.quickLocal}\u6216\u586b\u5165\u6b63\u786e\u540e\u7aef\u5730\u5740\u4e0e\u4ee4\u724c`}</span>
                            </div>
                            <div className="action-row">
                                <button className="primary-button" type="button" onClick={openSettingsDrawer}>{copy.common.openSettings}</button>
                                <span className="inline-note">{copy.focus.adminHint}</span>
                            </div>
                        </section>
                    ) : (
                        <section className="focus-card is-empty" data-focus-state="idle">
                            <span className="eyebrow">{copy.focus.idleEyebrow}</span>
                            <h2>{copy.focus.idleTitle}</h2>
                            <p>{describeIdleMessage(latestMessage)}</p>
                        </section>
                    )}

                    <section className="stats-strip" data-testid="stats-strip">
                        <div><strong>{messages.length}</strong><span>{copy.stats.total}</span></div>
                        <div><strong>{codeCount}</strong><span>{copy.stats.codes}</span></div>
                        <div><strong>{unreadCount}</strong><span>{copy.stats.unread}</span></div>
                    </section>

                    <section className="recent-panel" data-testid="recent-panel" data-message-count={recentMessages.length}>
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">{copy.recent.kicker}</p>
                                <h2>{copy.recent.title}</h2>
                            </div>
                            <button className="ghost-button" type="button" onClick={() => void fetchHistory(settings)}>{isLoadingHistory ? copy.common.syncing : copy.common.sync}</button>
                        </div>
                        {recentMessages.length === 0 ? <div className="placeholder-card"><strong>{copy.recent.emptyTitle}</strong><p>{copy.recent.emptyDescription}</p></div> : <div className="recent-list">{recentMessages.map((message) => renderMessageItem(message, "recent"))}</div>}
                    </section>
                </div>
            </div>

            <div className={`drawer-scrim ${drawerView ? "is-visible" : ""}`} onClick={() => setDrawerView(null)} />
            <aside className={`side-drawer ${drawerView ? "is-open" : ""}`} data-testid="side-drawer" data-drawer-view={drawerView ?? "closed"}>
                {drawerView === "history" ? (
                    <div className="drawer-content">
                        <div className="drawer-head">
                            <div>
                                <p className="section-kicker">{copy.history.kicker}</p>
                                <h2>{copy.history.title}</h2>
                            </div>
                            <button className="icon-button close-button" type="button" onClick={() => setDrawerView(null)} aria-label={copy.history.title}>{copy.common.closeGlyph}</button>
                        </div>
                        <div className="filter-row">
                            {(["all", "code", "notice"] as HistoryFilter[]).map((filter) => <button key={filter} className={`filter-chip ${historyFilter === filter ? "is-active" : ""}`} type="button" onClick={() => setHistoryFilter(filter)}>{copy.history.filters[filter]}</button>)}
                        </div>
                        <div className="drawer-list">
                            {filteredHistory.length === 0 ? <div className="placeholder-card compact"><strong>{copy.history.emptyTitle}</strong><p>{copy.history.emptyDescription}</p></div> : filteredHistory.map((message) => renderMessageItem(message, "history"))}
                        </div>
                    </div>
                ) : drawerView === "settings" ? (
                    <div className="drawer-content is-settings">
                        <div className="drawer-head">
                            <div>
                                <p className="section-kicker">{copy.settings.kicker}</p>
                                <h2>{copy.settings.title}</h2>
                            </div>
                            <button className="icon-button close-button" type="button" onClick={() => setDrawerView(null)} aria-label={copy.settings.title}>{copy.common.closeGlyph}</button>
                        </div>
                        <div className="settings-layout">
                            {!hasDraftToken ? (
                                <section className="settings-preset">
                                    <div className="card-head">
                                        <div>
                                            <strong>{copy.settings.presetTitle}</strong>
                                            <p>{copy.settings.presetDescription}</p>
                                        </div>
                                    </div>
                                    <div className="preset-values">
                                        <span>{`${copy.settings.adminUrlLabel}\uff1a ${adminUrl}`}</span>
                                        <span>{copy.settings.adminHint}</span>
                                    </div>
                                </section>
                            ) : null}
                            <section className="settings-card">
                                <div className="card-head">
                                    <div>
                                        <strong>{copy.settings.connectionTitle}</strong>
                                        <p>{copy.settings.connectionDescription}</p>
                                    </div>
                                    <button className="mini-button" type="button" onClick={() => void runConnectionTest()} disabled={isTestingConnection}>
                                        {isTestingConnection ? copy.settings.testingConnection : copy.settings.testConnection}
                                    </button>
                                </div>
                                <div className="settings-fields">
                                    <label className="field">
                                        <span>{copy.settings.backendUrl}</span>
                                        <input type="url" value={draftSettings.backendUrl} onChange={(event) => setDraftSettings((current) => ({ ...current, backendUrl: event.target.value }))} placeholder={DEFAULT_BACKEND_URL} />
                                    </label>
                                    <label className="field">
                                        <span>{copy.settings.token}</span>
                                        <input type="password" value={draftSettings.desktopToken} onChange={(event) => setDraftSettings((current) => ({ ...current, desktopToken: event.target.value }))} placeholder={copy.settings.tokenPlaceholder} />
                                        <small className="field-note">{copy.settings.tokenNote}</small>
                                    </label>
                                </div>
                                <div className="preset-actions">
                                    <button className="ghost-button" type="button" onClick={() => { setDraftSettings((current) => sanitizeSettings({ ...current, backendUrl: DEFAULT_BACKEND_URL })); setTestResult(null); }}>{copy.settings.quickLocal}</button>
                                </div>
                            </section>
                            <div className="settings-stack">
                                <label className="toggle-card">
                                    <input type="checkbox" checked={draftSettings.autoCopyCode} onChange={(event) => setDraftSettings((current) => ({ ...current, autoCopyCode: event.target.checked }))} />
                                    <div>
                                        <strong>{copy.settings.autoCopyTitle}</strong>
                                        <span>{copy.settings.autoCopyDescription}</span>
                                    </div>
                                </label>
                                <label className="toggle-card">
                                    <input type="checkbox" checked={autoLaunchEnabled} disabled={isLoadingAutoLaunch || isUpdatingAutoLaunch} onChange={(event) => void updateAutoLaunch(event.target.checked)} />
                                    <div>
                                        <strong>{copy.settings.autoLaunchTitle}</strong>
                                        <span>{isLoadingAutoLaunch ? copy.settings.autoLaunchLoading : copy.settings.autoLaunchDescription}</span>
                                    </div>
                                </label>
                            </div>
                            <section className="diagnostic-panel">
                                <strong>{copy.settings.diagnosticTitle}</strong>
                                <p>{copy.settings.diagnosticDescription}</p>
                            </section>
                            {testResult ? <div className={`diagnostic-card is-${testResult.tone}`}><div><strong>{testResult.title}</strong><p>{testResult.detail}</p></div><button className="icon-button close-button" type="button" onClick={() => setTestResult(null)} aria-label={copy.settings.testConnection}>{copy.common.closeGlyph}</button></div> : null}
                        </div>
                        <div className="drawer-actions is-split">
                            <button className="primary-button" type="button" onClick={() => { const next = sanitizeSettings(draftSettings); setDraftSettings(next); setSettings(next); setDrawerView(null); setTestResult(null); }}>{copy.settings.saveAndConnect}</button>
                            <button className="ghost-button" type="button" onClick={() => { setDraftSettings(settings); setTestResult(null); }}>{copy.common.reset}</button>
                        </div>
                    </div>
                ) : null}
            </aside>
        </div>
    );
}
