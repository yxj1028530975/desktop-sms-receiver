import type { ConnectionStatus, SmsMessage } from "../types";

const zh = {
    app: {
        kicker: "\u5e38\u9a7b\u63a5\u6536",
        title: "\u684c\u9762\u77ed\u4fe1\u63a5\u6536\u5668",
        subtitle: "\u53ea\u63a5\u6536\u540e\u53f0\u5df2\u7ed1\u5b9a\u624b\u673a\u53f7\u7684\u77ed\u4fe1\uff0c\u7cfb\u7edf\u901a\u77e5\u4e0e\u526a\u8d34\u677f\u540c\u6b65\u751f\u6548\u3002",
        lastSyncPrefix: "\u6700\u8fd1\u540c\u6b65",
    },
    common: {
        closeGlyph: "\u00d7",
        openSettings: "\u6253\u5f00\u8bbe\u7f6e",
        copy: "\u590d\u5236",
        save: "\u4fdd\u5b58",
        reset: "\u6062\u590d\u5f53\u524d\u914d\u7f6e",
        sync: "\u7acb\u5373\u540c\u6b65",
        syncing: "\u540c\u6b65\u4e2d...",
        markRead: "\u8bbe\u4e3a\u5df2\u8bfb",
        acknowledged: "\u5df2\u786e\u8ba4",
        unread: "\u672a\u786e\u8ba4",
        read: "\u5df2\u8bfb",
        notRecorded: "\u672a\u8bb0\u5f55",
        notSynced: "\u672a\u540c\u6b65",
    },
    status: {
        labels: {
            needs_setup: "\u5f85\u914d\u7f6e",
            connecting: "\u8fde\u63a5\u4e2d",
            connected: "\u5df2\u8fde\u63a5",
            session_conflict: "\u53e6\u5904\u5df2\u767b\u5f55",
            auth_error: "\u4ee4\u724c\u65e0\u6548",
            server_unreachable: "\u670d\u52a1\u4e0d\u53ef\u8fbe",
            reconnecting: "\u91cd\u8fde\u4e2d",
        },
        details: {
            needs_setup: "\u5c1a\u672a\u5b8c\u6210\u63a5\u6536\u5668\u914d\u7f6e\u3002",
            connecting: "\u6b63\u5728\u68c0\u67e5\u540e\u7aef\u5e76\u6253\u5f00\u5b9e\u65f6\u901a\u9053\u3002",
            connected: "\u5b9e\u65f6\u63a8\u9001\u5df2\u63a5\u901a\u3002",
            session_conflict: "\u540c\u4e00\u4e2a\u684c\u9762\u4ee4\u724c\u5df2\u5728\u53e6\u4e00\u5904\u8fde\u63a5\u3002",
            auth_error: "\u5f53\u524d\u684c\u9762\u4ee4\u724c\u65e0\u6548\u6216\u5df2\u88ab\u505c\u7528\u3002",
            server_unreachable: "\u65e0\u6cd5\u8fde\u901a\u540e\u7aef\u5730\u5740\u3002",
            reconnecting: "\u5b9e\u65f6\u901a\u9053\u5df2\u65ad\u5f00\uff0c\u6b63\u5728\u81ea\u52a8\u91cd\u8fde\u3002",
        },
        helper: {
            needs_setup: "\u8bf7\u5148\u5728\u540e\u53f0\u521b\u5efa\u684c\u9762\u5ba2\u6237\u7aef\uff0c\u7136\u540e\u5c06\u4ee4\u724c\u586b\u56de\u8fd9\u91cc\u3002",
            connecting: "\u540e\u7aef\u68c0\u6d4b\u901a\u8fc7\u540e\uff0c\u4f1a\u81ea\u52a8\u5efa\u7acb WebSocket \u901a\u9053\u3002",
            connected: "\u540e\u53f0\u7ed1\u5b9a\u7684\u624b\u673a\u53f7\u4e00\u65e6\u6709\u65b0\u77ed\u4fe1\uff0c\u4f1a\u7acb\u5373\u51fa\u73b0\u5728\u8fd9\u91cc\u3002",
            session_conflict: "\u8bf7\u68c0\u67e5\u662f\u5426\u540c\u65f6\u6253\u5f00\u4e86\u5b89\u88c5\u7248\u3001\u4fbf\u643a\u7248\u6216\u53e6\u4e00\u53f0\u7535\u8111\uff0c\u540c\u4e00\u4e2a\u4ee4\u724c\u53ea\u80fd\u4fdd\u6301\u4e00\u6761\u5728\u7ebf\u8fde\u63a5\u3002",
            auth_error: "\u56de\u5230\u8bbe\u7f6e\u62bd\u5c49\u68c0\u67e5\u684c\u9762\u4ee4\u724c\uff0c\u6216\u8005\u5728\u540e\u53f0\u91cd\u7f6e\u4ee4\u724c\u540e\u91cd\u65b0\u7c98\u8d34\u3002",
            server_unreachable: "\u786e\u8ba4\u540e\u7aef\u5730\u5740\u3001\u672c\u5730\u670d\u52a1\u72b6\u6001\u4ee5\u53ca\u5185\u7f51\u7a7f\u900f\u914d\u7f6e\u662f\u5426\u6b63\u5e38\u3002",
            reconnecting: "\u786e\u8ba4\u5b8c\u6574\u914d\u7f6e\u540e\uff0c\u5e94\u7528\u4f1a\u7ee7\u7eed\u5728\u540e\u53f0\u5c1d\u8bd5\u6062\u590d\u8fde\u63a5\u3002",
        },
        messages: {
            historyAuthError: "\u540e\u7aef\u62d2\u7edd\u4e86\u5f53\u524d\u684c\u9762\u4ee4\u724c\u3002",
            historyFailed: "\u5386\u53f2\u8bb0\u5f55\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u540e\u7aef\u8fde\u63a5\u3002",
            socketReplaced: "\u8fd9\u4e2a\u684c\u9762\u4ee4\u724c\u5df2\u5728\u53e6\u4e00\u4e2a\u5ba2\u6237\u7aef\u767b\u5f55\u3002",
            socketRejected: "WebSocket \u8ba4\u8bc1\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u684c\u9762\u4ee4\u724c\u3002",
            socketDropped: "\u5b9e\u65f6\u901a\u9053\u5df2\u65ad\u5f00\uff0c\u7b49\u5f85\u91cd\u8bd5\u3002",
            socketHeartbeatExpired: "\u5b9e\u65f6\u901a\u9053\u957f\u65f6\u95f4\u6ca1\u6709\u54cd\u5e94\uff0c\u6b63\u5728\u4e3b\u52a8\u91cd\u8fde\u3002",
            socketRetrying: "\u6b63\u5728\u91cd\u65b0\u6253\u5f00\u5b9e\u65f6\u901a\u9053\u3002",
            socketOpening: "\u6b63\u5728\u68c0\u67e5\u540e\u7aef\u5e76\u6253\u5f00\u5b9e\u65f6\u901a\u9053\u3002",
            socketInitFailed: "WebSocket \u521d\u59cb\u5316\u5931\u8d25\uff0c\u5df2\u8fdb\u5165\u91cd\u8fde\u7b49\u5f85\u3002",
            connectedAs: (_name: string) => "\u5b9e\u65f6\u901a\u9053\u5df2\u5c31\u7eea\uff0c\u6b63\u5728\u7b49\u5f85\u65b0\u77ed\u4fe1\u3002",
            connectedSimple: "\u5b9e\u65f6\u901a\u9053\u5df2\u8fde\u63a5\u3002",
        },
    },
    focus: {
        codeEyebrow: "\u6700\u65b0\u9a8c\u8bc1\u7801",
        copyCode: "\u590d\u5236\u9a8c\u8bc1\u7801",
        setupEyebrow: "\u51c6\u5907\u5f00\u59cb",
        setupTitle: "\u5148\u5728\u540e\u53f0\u521b\u5efa\u5ba2\u6237\u7aef",
        setupDescription: "\u6253\u5f00\u540e\u53f0\u7ba1\u7406\u53f0\uff0c\u65b0\u5efa\u684c\u9762\u5ba2\u6237\u7aef\u540e\uff0c\u5c06\u4ee4\u724c\u7c98\u8d34\u56de\u8fd9\u4e2a\u5c0f\u7a97\u53e3\u3002",
        adminHint: "\u624b\u673a\u53f7\u7ed1\u5b9a\u4e0e\u5ba2\u6237\u7aef\u4ee4\u724c\u90fd\u5728\u540e\u53f0\u7ef4\u62a4\u3002",
        idleEyebrow: "\u5b9e\u65f6\u6536\u4ef6\u7bb1",
        idleTitle: "\u8fd8\u6ca1\u6709\u9a8c\u8bc1\u7801",
        idleFallback: "\u8fde\u63a5\u5b8c\u6210\u540e\uff0c\u6700\u65b0\u7684\u9a8c\u8bc1\u7801\u4f1a\u56fa\u5b9a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
        idleFromLatest: (sender: string) => `\u6700\u8fd1\u4e00\u6761\u77ed\u4fe1\u6765\u81ea ${sender}\uff0c\u4f46\u5b83\u4e0d\u662f\u9a8c\u8bc1\u7801\u77ed\u4fe1\u3002`,
    },
    stats: {
        total: "\u6700\u8fd1\u6d88\u606f",
        codes: "\u9a8c\u8bc1\u7801",
        unread: "\u672a\u786e\u8ba4",
    },
    recent: {
        kicker: "\u8fd1\u671f\u6d88\u606f",
        title: "\u6536\u4ef6\u6d41",
        emptyTitle: "\u8fd8\u6ca1\u6709\u6536\u5230\u77ed\u4fe1",
        emptyDescription: "\u5f53\u540e\u53f0\u5c06\u624b\u673a\u53f7\u8def\u7531\u5230\u5f53\u524d\u5ba2\u6237\u7aef\u540e\uff0c\u77ed\u4fe1\u4f1a\u7acb\u5373\u51fa\u73b0\u5728\u8fd9\u91cc\u3002",
    },
    history: {
        kicker: "\u5386\u53f2\u8bb0\u5f55",
        title: "\u6d88\u606f\u5386\u53f2",
        emptyTitle: "\u5f53\u524d\u7b5b\u9009\u4e0b\u6ca1\u6709\u6d88\u606f",
        emptyDescription: "\u5207\u6362\u7b5b\u9009\u6761\u4ef6\uff0c\u6216\u7b49\u5f85\u66f4\u591a\u77ed\u4fe1\u5230\u8fbe\u3002",
        filters: {
            all: "\u5168\u90e8",
            code: "\u9a8c\u8bc1\u7801",
            notice: "\u901a\u77e5",
        },
    },
    settings: {
        kicker: "\u8fde\u63a5\u8bbe\u7f6e",
        title: "\u63a5\u6536\u5668\u914d\u7f6e",
        presetTitle: "\u9996\u6b21\u63a5\u5165",
        presetDescription: "\u5148\u5728\u540e\u53f0\u521b\u5efa\u684c\u9762\u5ba2\u6237\u7aef\uff0c\u7ed1\u5b9a\u624b\u673a\u53f7\uff0c\u518d\u628a\u5ba2\u6237\u7aef\u4ee4\u724c\u8d34\u5230\u8fd9\u91cc\u3002",
        adminUrlLabel: "\u540e\u53f0\u5165\u53e3",
        adminHint: "\u684c\u9762\u7aef\u53ea\u8d1f\u8d23\u63a5\u6536\uff0c\u624b\u673a\u53f7\u8def\u7531\u548c\u4ee4\u724c\u90fd\u5728\u540e\u53f0\u7ef4\u62a4\u3002",
        quickLocal: "\u586b\u5165\u672c\u673a\u5730\u5740",
        testConnection: "\u6d4b\u8bd5\u8fde\u63a5",
        testingConnection: "\u6d4b\u8bd5\u4e2d...",
        connectionTitle: "\u8fde\u63a5\u4fe1\u606f",
        connectionDescription: "\u53ea\u9700\u586b\u5199\u540e\u7aef\u5730\u5740\u548c\u5ba2\u6237\u7aef\u4ee4\u724c\u3002",
        backendUrl: "\u540e\u7aef\u5730\u5740",
        token: "\u684c\u9762\u4ee4\u724c",
        tokenPlaceholder: "\u7c98\u8d34\u540e\u53f0\u521b\u5efa\u7684\u5ba2\u6237\u7aef\u4ee4\u724c",
        tokenNote: "\u8fd9\u4e2a\u4ee4\u724c\u7531\u540e\u53f0\u4e3a\u684c\u9762\u5ba2\u6237\u7aef\u751f\u6210\uff0c\u4e0d\u662f\u767b\u5f55\u5bc6\u7801\u3002",
        autoCopyTitle: "\u6536\u5230\u9a8c\u8bc1\u7801\u540e\u81ea\u52a8\u590d\u5236",
        autoCopyDescription: "\u5173\u95ed\u540e\u4ecd\u53ef\u4ee5\u5728\u4e3b\u5361\u7247\u6216\u5217\u8868\u4e2d\u624b\u52a8\u590d\u5236\u3002",
        autoLaunchTitle: "\u5f00\u673a\u81ea\u52a8\u542f\u52a8",
        autoLaunchDescription: "\u767b\u5f55 Windows \u540e\u81ea\u52a8\u5728\u540e\u53f0\u542f\u52a8\uff0c\u5e76\u7f29\u5230\u7cfb\u7edf\u6258\u76d8\u7ee7\u7eed\u63a5\u6536\u77ed\u4fe1\u3002",
        autoLaunchLoading: "\u6b63\u5728\u8bfb\u53d6\u7cfb\u7edf\u542f\u52a8\u9879\u72b6\u6001...",
        diagnosticTitle: "\u8fde\u63a5\u8bca\u65ad",
        diagnosticDescription: "\u4f9d\u6b21\u68c0\u67e5 /health\u3001\u5386\u53f2\u63a5\u53e3\u4e0e WebSocket \u63e1\u624b\uff0c\u5feb\u901f\u786e\u8ba4\u95ee\u9898\u5728\u540e\u7aef\u3001\u4ee4\u724c\u8fd8\u662f\u5b9e\u65f6\u901a\u9053\u3002",
        saveAndConnect: "\u4fdd\u5b58\u5e76\u8fde\u63a5",
    },
    test: {
        missingTokenTitle: "\u5c1a\u672a\u586b\u5199\u4ee4\u724c",
        missingTokenDetail: "\u8bf7\u5148\u5728\u540e\u53f0\u521b\u5efa\u684c\u9762\u5ba2\u6237\u7aef\uff0c\u518d\u5c06\u4ee4\u724c\u7c98\u8d34\u5230\u8fd9\u91cc\u3002",
        backendDownTitle: "\u540e\u7aef\u4e0d\u53ef\u8fbe",
        tokenRejectedTitle: "\u4ee4\u724c\u88ab\u62d2\u7edd",
        restReadyDetail: "REST \u63a5\u53e3\u68c0\u6d4b\u5df2\u901a\u8fc7\u3002",
        wsReadyTitle: "\u8fde\u63a5\u6210\u529f",
        wsReadyDetail: (_name?: string) => "\u5b9e\u65f6\u901a\u9053\u5df2\u5c31\u7eea\uff0c\u540e\u7eed\u65b0\u77ed\u4fe1\u4f1a\u76f4\u63a5\u63a8\u9001\u5230\u8fd9\u91cc\u3002",
        wsFailedTitle: "\u5b9e\u65f6\u901a\u9053\u63e1\u624b\u5931\u8d25",
    },
    category: {
        code: "\u9a8c\u8bc1\u7801",
        notice: "\u901a\u77e5",
        other: "\u5176\u4ed6",
    },
    notification: {
        code: (code: string) => `\u9a8c\u8bc1\u7801 ${code}`,
        messageFrom: (sender: string) => `\u65b0\u77ed\u4fe1\u00b7${sender}`,
    },
} as const;

type StatusTone = "success" | "warning" | "danger" | "neutral";

export function presentStatus(status: ConnectionStatus): { label: string; detail: string; tone: StatusTone } {
    switch (status) {
        case "connected":
            return { label: zh.status.labels.connected, detail: zh.status.details.connected, tone: "success" };
        case "session_conflict":
            return { label: zh.status.labels.session_conflict, detail: zh.status.details.session_conflict, tone: "danger" };
        case "connecting":
            return { label: zh.status.labels.connecting, detail: zh.status.details.connecting, tone: "warning" };
        case "reconnecting":
            return { label: zh.status.labels.reconnecting, detail: zh.status.details.reconnecting, tone: "warning" };
        case "auth_error":
            return { label: zh.status.labels.auth_error, detail: zh.status.details.auth_error, tone: "danger" };
        case "server_unreachable":
            return { label: zh.status.labels.server_unreachable, detail: zh.status.details.server_unreachable, tone: "danger" };
        default:
            return { label: zh.status.labels.needs_setup, detail: zh.status.details.needs_setup, tone: "neutral" };
    }
}

export function formatCategoryLabel(category: SmsMessage["category"]) {
    return zh.category[category];
}

export function formatDateTime(value: string | null) {
    return value
        ? new Intl.DateTimeFormat("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(value))
        : zh.common.notRecorded;
}

export function formatRelativeTime(value: string | null) {
    if (!value) return zh.common.notSynced;
    const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 60) return `${minutes} \u5206\u949f\u524d`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} \u5c0f\u65f6\u524d`;
    return formatDateTime(value);
}

export function buildNotificationTitle(message: SmsMessage) {
    return message.code
        ? zh.notification.code(message.code)
        : zh.notification.messageFrom(message.contact_name || message.sender);
}

export function describeIdleMessage(message: SmsMessage | undefined) {
    if (!message) return zh.focus.idleFallback;
    return zh.focus.idleFromLatest(message.contact_name || message.sender);
}

export const copy = zh;
