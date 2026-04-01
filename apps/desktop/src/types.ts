export type MessageCategory = "code" | "notice" | "other";


export interface SmsMessage {
    id: number;
    sender: string;
    receiver: string;
    normalized_receiver: string;
    content: string;
    category: MessageCategory;
    code: string | null;
    device_id: string | null;
    contact_name: string | null;
    pushed_at: string | null;
    acknowledged_at: string | null;
    created_at: string;
}


export interface SmsMessageList {
    items: SmsMessage[];
    next_cursor_id: number | null;
}


export interface DesktopSettings {
    backendUrl: string;
    desktopToken: string;
    autoCopyCode: boolean;
}


export interface DesktopApi {
    showNotification(title: string, body: string): Promise<boolean>;
    writeClipboard(text: string): Promise<boolean>;
    showWindow(): Promise<boolean>;
    getAutoLaunch(): Promise<boolean>;
    setAutoLaunch(enabled: boolean): Promise<boolean>;
}


export type ConnectionStatus =
    | "needs_setup"
    | "connecting"
    | "connected"
    | "session_conflict"
    | "auth_error"
    | "server_unreachable"
    | "reconnecting";
