const copy = {
    meta: { title: "短信路由后台" },
    common: {
        close: "关闭",
        save: "保存",
        notRecorded: "未记录",
        none: "暂无",
    },
    hero: {
        kicker: "后台管理",
        title: "短信路由控制台",
        description: "维护桌面客户端、手机号路由和请求日志。一个客户端可以绑定多个手机号，同一个手机号也可以同时分发到多个客户端。",
        step1: "先建客户端",
        step2: "再绑手机号",
        step3: "最后把令牌给桌面端",
    },
    session: {
        label: "当前会话",
        signedOut: "未登录",
        signedOutDetail: "登录后即可管理桌面客户端、手机号路由和请求日志。",
        signedIn: (username) => `当前登录：${username}`,
        signedInDetail: "建议按“创建客户端 → 绑定手机号 → 把令牌给桌面端”的顺序配置。",
    },
    login: {
        kicker: "管理员登录",
        title: "进入路由控制台",
        description: "这是单管理员版短信接收器后台，只维护你自己的桌面客户端与路由关系。",
        username: "账号",
        usernamePlaceholder: "admin",
        password: "密码",
        passwordPlaceholder: "输入管理员密码",
        submit: "登录",
        hintKicker: "使用方式",
        hintTitle: "后台主要做三件事",
        hint1Title: "创建桌面客户端",
        hint1Body: "每个桌面接收器都有独立令牌，可以单独启停和重置。",
        hint2Title: "绑定手机号",
        hint2Body: "短信不再全量广播，只有命中绑定关系的客户端才会收到。",
        hint3Title: "查看请求日志",
        hint3Body: "快捷指令或桌面端请求失败时，可以直接在这里看到状态码和错误详情。",
    },
    dashboard: {
        kicker: "运行概览",
        title: "按任务处理，而不是把所有功能堆在一起",
        description: "登录后只显示一个工作区：需要新建设备时看客户端，需要改手机号关系时看路由，需要排障时看日志。",
        refresh: "刷新数据",
        logout: "退出登录",
        summaryClients: "客户端",
        summaryClientsHint: "已创建的桌面接收器数量",
        summaryOnline: "在线客户端",
        summaryOnlineHint: "当前仍与后端保持连接的桌面端",
        summaryBindings: "路由规则",
        summaryBindingsHint: "已保存的手机号绑定关系",
    },
    nav: {
        clients: "客户端",
        bindings: "手机号路由",
        logs: "请求日志",
        description: "每次只处理一类任务，避免同屏堆满创建表单、路由列表和日志内容。",
    },
    clients: {
        kicker: "客户端",
        title: "桌面客户端列表",
        description: "每个客户端对应一台电脑或一个桌面应用实例，都有独立令牌。",
        createPanelTitle: "创建新的桌面客户端",
        createPanelDescription: "先给客户端起名，必要时可自定义令牌；留空则自动生成。",
        nameLabel: "显示名称",
        namePlaceholder: "例如：联想客户端",
        tokenLabel: "自定义令牌",
        tokenPlaceholder: "留空则自动生成",
        noteLabel: "备注",
        notePlaceholder: "可选，用来说明这个客户端的用途",
        create: "创建客户端",
        tokenValue: "客户端令牌",
        copyToken: "复制令牌",
        rotateToken: "重置令牌",
        saveClient: "保存修改",
        deleteClient: "删除客户端",
        boundPhones: "已绑定手机号",
        noClients: "还没有客户端",
        noRoutes: "暂无绑定手机号",
        connectedAt: "上次连接",
        lastSeen: "最近心跳",
        enabledToggle: "启用这个客户端",
    },
    bindings: {
        kicker: "路由规则",
        title: "手机号路由列表",
        description: "这里维护手机号与桌面客户端的多对多绑定关系。",
        createPanelTitle: "新增手机号路由",
        createPanelDescription: "给客户端添加多个手机号，或把同一个手机号同时分发给多个客户端。",
        phoneLabel: "手机号",
        phonePlaceholder: "+8613812345678",
        clientLabel: "目标客户端",
        noteLabel: "备注",
        notePlaceholder: "可选，用来说明这条路由",
        enabled: "启用这条路由",
        save: "保存路由",
        noBindings: "还没有路由规则",
        emptyClientOption: "请先创建客户端",
        targetClient: "目标客户端",
        updatedAt: "最近更新",
        deleteBinding: "删除路由",
    },
    logs: {
        kicker: "请求日志",
        title: "最近请求与错误",
        description: "这里会显示 /api 和 /health 请求，用于排查快捷指令、后台和桌面端的问题。",
        refresh: "刷新日志",
        emptyTitle: "暂无日志",
        emptyDescription: "等有新的请求后，这里就会出现记录。",
        status: "状态",
        level: "级别",
        duration: "耗时",
        ip: "IP",
        requestBody: "请求体",
        responseDetail: "错误详情",
        noDetail: "无",
        filtersKicker: "日志筛选",
        filtersTitle: "按问题缩小范围",
        filtersDescription: "可以只看错误、只看入站接口，或按状态码过滤。",
        limitLabel: "条数",
        levelLabel: "级别",
        pathLabel: "路径",
        statusLabel: "状态码",
        applyFilters: "应用筛选",
        resetFilters: "重置筛选",
        levelAll: "全部级别",
        levelInfo: "仅看正常",
        levelError: "仅看错误",
        pathAll: "全部路径",
        pathInbound: "仅看入站短信",
        pathMessages: "仅看消息接口",
        pathAdmin: "仅看后台接口",
        pathHealth: "仅看 Health",
        statusAll: "全部状态码",
    },
    badges: {
        online: "在线",
        offline: "离线",
        enabled: "已启用",
        disabled: "已停用",
        routes: (count) => `绑定 ${count} 个号码`,
        targetClient: (name) => `目标客户端：${name}`,
    },
    status: {
        refreshed: "已刷新",
        refreshedDetail: "已加载最新后台数据。",
        logsRefreshed: "请求日志已刷新。",
        filtersApplied: "已应用日志筛选。",
        filtersReset: "已重置日志筛选。",
        clientCreated: (name) => `已创建客户端：${name}。`,
        clientUpdated: (name) => `已保存客户端：${name}。`,
        clientDeleted: (name) => `已删除客户端：${name}。`,
        tokenCopied: "客户端令牌已复制到剪贴板。",
        tokenRotated: (token) => `令牌已重置：${token}`,
        bindingSaved: "路由规则已保存。",
        bindingUpdated: (phone) => `已更新 ${phone} 的路由规则。`,
        bindingDeleted: (phone) => `已删除 ${phone} 的路由规则。`,
    },
    errors: {
        sessionCheck: "会话检查失败",
        signIn: "登录失败",
        signOut: "退出失败",
        refresh: "刷新失败",
        createClient: "创建客户端失败",
        clientAction: "客户端操作失败",
        saveBinding: "保存路由失败",
        bindingAction: "路由操作失败",
        logs: "日志加载失败",
        invalidLogin: "账号或密码不正确。",
        clientNotFound: "未找到对应的客户端。",
        targetClientNotFound: "未找到目标客户端。",
        bindingNotFound: "未找到对应的路由规则。",
        bindingExists: "这个手机号已经绑定到该客户端。",
        phoneRequired: "手机号不能为空。",
    },
    confirm: {
        deleteClient: (name) => `确定删除客户端 ${name} 吗？它已绑定的手机号路由也会一起删除。`,
        deleteBinding: (phone) => `确定删除 ${phone} 的路由规则吗？`,
    },
};

const state = {
    overview: { clients: [], bindings: [] },
    logs: [],
    activeView: "clients",
    logFilters: { limit: "80", level: "", path: "", status: "" },
};

const sessionState = document.getElementById("session-state");
const sessionDetail = document.getElementById("session-detail");
const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const statusPanel = document.getElementById("status");
const statusTitle = document.getElementById("status-title");
const statusDetail = document.getElementById("status-detail");
const clientList = document.getElementById("client-list");
const bindingList = document.getElementById("binding-list");
const bindingClientSelect = document.getElementById("binding-client");
const bindingEnabled = document.getElementById("binding-enabled");
const summaryClients = document.getElementById("summary-clients");
const summaryOnline = document.getElementById("summary-online");
const summaryBindings = document.getElementById("summary-bindings");
const requestLogList = document.getElementById("request-log-list");
const navButtons = Array.from(document.querySelectorAll("[data-admin-nav]"));
const adminViews = Array.from(document.querySelectorAll("[data-admin-view]"));
const logsLimitSelect = document.getElementById("logs-limit");
const logsLevelSelect = document.getElementById("logs-level");
const logsPathSelect = document.getElementById("logs-path");
const logsStatusSelect = document.getElementById("logs-status");

function getFormElement(event) {
    const formElement = event.currentTarget;
    return formElement instanceof HTMLFormElement ? formElement : null;
}

function getCopy(path) {
    return path.split(".").reduce((value, key) => value?.[key], copy);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
    return value
        ? new Intl.DateTimeFormat("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(value))
        : copy.common.notRecorded;
}

function formatRelativeTime(value) {
    if (!value) return copy.common.notRecorded;
    const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return formatDateTime(value);
}

function translateError(detail) {
    const map = new Map([
        ["Invalid username or password.", copy.errors.invalidLogin],
        ["Client not found.", copy.errors.clientNotFound],
        ["Target client not found.", copy.errors.targetClientNotFound],
        ["Binding not found.", copy.errors.bindingNotFound],
        ["Phone number is required.", copy.errors.phoneRequired],
        ["Binding already exists for this phone number and client.", copy.errors.bindingExists],
    ]);
    return map.get(detail) || detail;
}

function applyStaticCopy() {
    document.title = copy.meta.title;
    document.querySelectorAll("[data-copy]").forEach((element) => {
        const value = getCopy(element.dataset.copy);
        if (typeof value === "string") element.textContent = value;
    });
    document.querySelectorAll("[data-copy-placeholder]").forEach((element) => {
        const value = getCopy(element.dataset.copyPlaceholder);
        if (typeof value === "string") element.placeholder = value;
    });
}

function showStatus(title, detail, tone = "success") {
    statusTitle.textContent = title;
    statusDetail.textContent = detail;
    statusPanel.dataset.tone = tone;
    statusPanel.classList.remove("hidden");
}

function hideStatus() {
    statusPanel.classList.add("hidden");
}

function setAdminView(view) {
    state.activeView = view;
    navButtons.forEach((button) => {
        const active = button.dataset.adminNav === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    });
    adminViews.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.adminView === view);
    });
}

async function requestJson(url, init = {}) {
    const response = await fetch(url, { credentials: "same-origin", ...init });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(translateError(body?.detail || `HTTP ${response.status}`));
    return body;
}

function syncLogFilterInputs() {
    logsLimitSelect.value = state.logFilters.limit;
    logsLevelSelect.value = state.logFilters.level;
    logsPathSelect.value = state.logFilters.path;
    logsStatusSelect.value = state.logFilters.status;
}

function readLogFiltersFromInputs() {
    state.logFilters = {
        limit: logsLimitSelect.value || "80",
        level: logsLevelSelect.value || "",
        path: logsPathSelect.value || "",
        status: logsStatusSelect.value || "",
    };
}

function buildLogQuery() {
    const params = new URLSearchParams();
    params.set("limit", state.logFilters.limit || "80");
    if (state.logFilters.level) params.set("level", state.logFilters.level);
    if (state.logFilters.path) params.set("path", state.logFilters.path);
    if (state.logFilters.status) params.set("status", state.logFilters.status);
    return params.toString();
}

function renderSummary() {
    const totalClients = state.overview.clients.length;
    const onlineClients = state.overview.clients.filter((client) => client.is_online).length;
    const totalBindings = state.overview.bindings.length;
    summaryClients.textContent = String(totalClients);
    summaryOnline.textContent = String(onlineClients);
    summaryBindings.textContent = String(totalBindings);
}

function renderBindingClientOptions() {
    const hasClients = state.overview.clients.length > 0;
    bindingClientSelect.innerHTML = hasClients
        ? state.overview.clients
            .map((client) => `<option value="${escapeHtml(client.client_id)}">${escapeHtml(client.display_name || client.client_id)}</option>`)
            .join("")
        : `<option value="">${escapeHtml(copy.bindings.emptyClientOption)}</option>`;
    bindingClientSelect.disabled = !hasClients;
}

function renderClients() {
    if (!state.overview.clients.length) {
        clientList.innerHTML = `
            <div class="list-empty">
                <strong>${escapeHtml(copy.clients.noClients)}</strong>
                <p class="muted empty-copy">${escapeHtml(copy.clients.createPanelDescription)}</p>
            </div>
        `;
        return;
    }

    clientList.innerHTML = state.overview.clients.map((client) => `
        <article class="client-card" data-client-id="${escapeHtml(client.client_id)}">
            <div class="card-head">
                <div class="card-title-group">
                    <h3>${escapeHtml(client.display_name || client.client_id)}</h3>
                    <span class="subtle">${escapeHtml(client.client_id)}</span>
                    <div class="meta">
                        <span class="badge ${client.is_online ? "ok" : "off"}">${client.is_online ? copy.badges.online : copy.badges.offline}</span>
                        <span class="badge ${client.enabled ? "ok" : "off"}">${client.enabled ? copy.badges.enabled : copy.badges.disabled}</span>
                        <span class="badge warn">${copy.badges.routes(client.binding_count)}</span>
                    </div>
                </div>
                <div class="inline-actions">
                    <button class="button small ghost" type="button" data-action="copy-token">${copy.clients.copyToken}</button>
                    <button class="button small" type="button" data-action="regen-token">${copy.clients.rotateToken}</button>
                </div>
            </div>
            <div class="entity-shell">
                <section class="entity-pane">
                    <span class="pane-label">${copy.clients.tokenValue}</span>
                    <div class="token-box">${escapeHtml(client.access_token)}</div>
                    <div class="metric-list">
                        <div class="metric-item">
                            <span>${copy.clients.connectedAt}</span>
                            <strong>${escapeHtml(formatDateTime(client.connected_at))}</strong>
                        </div>
                        <div class="metric-item">
                            <span>${copy.clients.lastSeen}</span>
                            <strong>${escapeHtml(formatRelativeTime(client.last_seen_at))}</strong>
                        </div>
                    </div>
                    <div class="field">
                        <span>${copy.clients.boundPhones}</span>
                        <div class="phones">
                            ${client.phone_numbers.length
        ? client.phone_numbers.map((phone) => `<span class="phone-chip">${escapeHtml(phone)}</span>`).join("")
        : `<span class="subtle">${escapeHtml(copy.clients.noRoutes)}</span>`}
                        </div>
                    </div>
                </section>
                <section class="entity-pane">
                    <label class="field">
                        <span>${copy.clients.nameLabel}</span>
                        <input type="text" data-field="display_name" value="${escapeHtml(client.display_name || "")}" />
                    </label>
                    <label class="field">
                        <span>${copy.clients.noteLabel}</span>
                        <textarea data-field="note">${escapeHtml(client.note || "")}</textarea>
                    </label>
                    <label class="row toggle-row">
                        <input type="checkbox" data-field="enabled" ${client.enabled ? "checked" : ""} />
                        <span>${copy.clients.enabledToggle}</span>
                    </label>
                    <div class="actions end">
                        <button class="button primary" type="button" data-action="save-client">${copy.clients.saveClient}</button>
                        <button class="button danger" type="button" data-action="delete-client">${copy.clients.deleteClient}</button>
                    </div>
                </section>
            </div>
        </article>
    `).join("");
}

function renderBindings() {
    if (!state.overview.bindings.length) {
        bindingList.innerHTML = `
            <div class="list-empty">
                <strong>${escapeHtml(copy.bindings.noBindings)}</strong>
                <p class="muted empty-copy">${escapeHtml(copy.bindings.createPanelDescription)}</p>
            </div>
        `;
        return;
    }

    bindingList.innerHTML = state.overview.bindings.map((binding) => `
        <article class="binding-card" data-binding-id="${binding.id}">
            <div class="card-head">
                <div class="card-title-group">
                    <h3>${escapeHtml(binding.phone_number)}</h3>
                    <div class="meta">
                        <span class="badge warn">${escapeHtml(copy.badges.targetClient(binding.client_display_name || binding.client_id))}</span>
                        <span class="badge ${binding.client_online ? "ok" : "off"}">${binding.client_online ? copy.badges.online : copy.badges.offline}</span>
                        <span class="badge ${binding.enabled ? "ok" : "off"}">${binding.enabled ? copy.badges.enabled : copy.badges.disabled}</span>
                    </div>
                </div>
                <span class="subtle">${escapeHtml(`${copy.bindings.updatedAt} ${formatDateTime(binding.updated_at)}`)}</span>
            </div>
            <div class="entity-shell is-binding">
                <section class="entity-pane">
                    <div class="form-grid">
                        <label class="field">
                            <span>${copy.bindings.phoneLabel}</span>
                            <input type="text" data-field="phone_number" value="${escapeHtml(binding.phone_number)}" />
                        </label>
                        <label class="field">
                            <span>${copy.bindings.clientLabel}</span>
                            <select data-field="client_id">
                                ${state.overview.clients
        .map((client) => `<option value="${escapeHtml(client.client_id)}" ${client.client_id === binding.client_id ? "selected" : ""}>${escapeHtml(client.display_name || client.client_id)}</option>`)
        .join("")}
                            </select>
                        </label>
                        <label class="field field-span">
                            <span>${copy.bindings.noteLabel}</span>
                            <textarea data-field="note">${escapeHtml(binding.note || "")}</textarea>
                        </label>
                    </div>
                    <label class="row toggle-row">
                        <input type="checkbox" data-field="enabled" ${binding.enabled ? "checked" : ""} />
                        <span>${copy.bindings.enabled}</span>
                    </label>
                    <div class="actions end">
                        <button class="button primary" type="button" data-action="save-binding">${copy.common.save}</button>
                        <button class="button danger" type="button" data-action="delete-binding">${copy.bindings.deleteBinding}</button>
                    </div>
                </section>
            </div>
        </article>
    `).join("");
}

function formatStructuredValue(value) {
    if (value === null || value === undefined || value === "") return copy.logs.noDetail;
    const raw = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const shortened = raw.length > 1800 ? `${raw.slice(0, 1800)}\n...` : raw;
    return escapeHtml(shortened).replaceAll("\n", "<br />");
}

function renderLogs() {
    if (!state.logs.length) {
        requestLogList.innerHTML = `
            <div class="list-empty">
                <strong>${escapeHtml(copy.logs.emptyTitle)}</strong>
                <p class="muted empty-copy">${escapeHtml(copy.logs.emptyDescription)}</p>
            </div>
        `;
        return;
    }

    requestLogList.innerHTML = state.logs.map((entry) => {
        const statusCode = Number(entry.status_code || 0);
        const tone = statusCode >= 500 ? "off" : statusCode >= 400 ? "warn" : "ok";
        const levelTone = String(entry.level || "").toLowerCase() === "error" ? "warn" : "ok";
        return `
            <article class="binding-card">
                <div class="card-head">
                    <div class="card-title-group">
                        <h3>${escapeHtml(`${entry.method || "GET"} ${entry.path || "/"}`)}</h3>
                        <div class="meta">
                            <span class="badge ${tone}">${escapeHtml(`${copy.logs.status} ${statusCode || 0}`)}</span>
                            <span class="badge ${levelTone}">${escapeHtml(`${copy.logs.level} ${entry.level || copy.common.none}`)}</span>
                            <span class="badge">${escapeHtml(`${copy.logs.duration} ${entry.duration_ms ?? copy.common.notRecorded} ms`)}</span>
                            <span class="badge">${escapeHtml(`${copy.logs.ip} ${entry.client_ip || copy.common.notRecorded}`)}</span>
                        </div>
                    </div>
                    <span class="subtle">${escapeHtml(formatDateTime(entry.timestamp))}</span>
                </div>
                <div class="entity-shell is-binding">
                    <section class="entity-pane">
                        <div class="field">
                            <span>${escapeHtml(copy.logs.requestBody)}</span>
                            <div class="token-box">${formatStructuredValue(entry.request_body)}</div>
                        </div>
                        <div class="field">
                            <span>${escapeHtml(copy.logs.responseDetail)}</span>
                            <div class="token-box">${formatStructuredValue(entry.response_detail)}</div>
                        </div>
                    </section>
                </div>
            </article>
        `;
    }).join("");
}

function renderOverview() {
    renderSummary();
    renderBindingClientOptions();
    renderClients();
    renderBindings();
}

// __RENDER__

async function loadOverview() {
    state.overview = await requestJson("/api/admin/overview");
    renderOverview();
}

async function loadLogs() {
    const payload = await requestJson(`/api/admin/logs?${buildLogQuery()}`);
    state.logs = Array.isArray(payload?.items) ? payload.items : [];
    renderLogs();
}

async function loadSession() {
    try {
        const session = await requestJson("/api/admin/session");
        if (session.authenticated) {
            sessionState.textContent = copy.session.signedIn(session.username);
            sessionDetail.textContent = copy.session.signedInDetail;
            loginPanel.classList.add("hidden");
            adminPanel.classList.remove("hidden");
            syncLogFilterInputs();
            await Promise.all([loadOverview(), loadLogs()]);
            setAdminView(state.activeView);
        } else {
            sessionState.textContent = copy.session.signedOut;
            sessionDetail.textContent = copy.session.signedOutDetail;
            loginPanel.classList.remove("hidden");
            adminPanel.classList.add("hidden");
        }
    } catch (error) {
        showStatus(copy.errors.sessionCheck, error.message, "danger");
    }
}

async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
}

document.getElementById("status-close").addEventListener("click", hideStatus);

navButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        const nextView = button.dataset.adminNav || "clients";
        setAdminView(nextView);
        if (nextView === "logs" && state.logs.length === 0) {
            try {
                await loadLogs();
            } catch (error) {
                showStatus(copy.errors.logs, error.message, "danger");
            }
        }
    });
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = getFormElement(event);
    if (!formElement) return;
    const form = new FormData(formElement);
    try {
        await requestJson("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: String(form.get("username") || "").trim(),
                password: String(form.get("password") || ""),
            }),
        });
        formElement.reset();
        hideStatus();
        await loadSession();
    } catch (error) {
        showStatus(copy.errors.signIn, error.message, "danger");
    }
});

document.getElementById("logout").addEventListener("click", async () => {
    try {
        await requestJson("/api/admin/logout", { method: "POST" });
        hideStatus();
        await loadSession();
    } catch (error) {
        showStatus(copy.errors.signOut, error.message, "danger");
    }
});

document.getElementById("refresh").addEventListener("click", async () => {
    try {
        await Promise.all([loadOverview(), loadLogs()]);
        showStatus(copy.status.refreshed, copy.status.refreshedDetail);
    } catch (error) {
        showStatus(copy.errors.refresh, error.message, "danger");
    }
});

document.getElementById("refresh-logs").addEventListener("click", async () => {
    try {
        await loadLogs();
        showStatus(copy.logs.refresh, copy.status.logsRefreshed);
    } catch (error) {
        showStatus(copy.errors.logs, error.message, "danger");
    }
});

document.getElementById("apply-log-filters").addEventListener("click", async () => {
    readLogFiltersFromInputs();
    try {
        await loadLogs();
        setAdminView("logs");
        showStatus(copy.logs.title, copy.status.filtersApplied);
    } catch (error) {
        showStatus(copy.errors.logs, error.message, "danger");
    }
});

document.getElementById("reset-log-filters").addEventListener("click", async () => {
    state.logFilters = { limit: "80", level: "", path: "", status: "" };
    syncLogFilterInputs();
    try {
        await loadLogs();
        showStatus(copy.logs.title, copy.status.filtersReset);
    } catch (error) {
        showStatus(copy.errors.logs, error.message, "danger");
    }
});

document.getElementById("client-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = getFormElement(event);
    if (!formElement) return;
    const form = new FormData(formElement);
    try {
        const client = await requestJson("/api/admin/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                display_name: String(form.get("display_name") || "").trim(),
                note: String(form.get("note") || "").trim() || null,
                access_token: String(form.get("access_token") || "").trim() || null,
            }),
        });
        formElement.reset();
        await loadOverview();
        showStatus(copy.clients.create, copy.status.clientCreated(client.display_name || client.client_id));
    } catch (error) {
        showStatus(copy.errors.createClient, error.message, "danger");
    }
});

document.getElementById("binding-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = getFormElement(event);
    if (!formElement) return;
    const form = new FormData(formElement);
    try {
        await requestJson("/api/admin/bindings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone_number: String(form.get("phone_number") || "").trim(),
                client_id: String(form.get("client_id") || "").trim(),
                note: String(form.get("note") || "").trim() || null,
                enabled: form.get("enabled") === "on",
            }),
        });
        formElement.reset();
        if (bindingEnabled instanceof HTMLInputElement) bindingEnabled.checked = true;
        await loadOverview();
        showStatus(copy.bindings.save, copy.status.bindingSaved);
    } catch (error) {
        showStatus(copy.errors.saveBinding, error.message, "danger");
    }
});

clientList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest("[data-client-id]");
    const clientId = card?.dataset.clientId;
    if (!clientId) return;

    const nameField = card.querySelector('[data-field="display_name"]');
    const noteField = card.querySelector('[data-field="note"]');
    const enabledField = card.querySelector('[data-field="enabled"]');
    const displayName = nameField?.value.trim() || "";
    const note = noteField?.value.trim() || "";
    const enabled = Boolean(enabledField?.checked);
    const client = state.overview.clients.find((item) => item.client_id === clientId);

    try {
        if (button.dataset.action === "copy-token") {
            await copyToClipboard(client?.access_token || "");
            showStatus(copy.clients.copyToken, copy.status.tokenCopied);
            return;
        }

        if (button.dataset.action === "regen-token") {
            const result = await requestJson(`/api/admin/clients/${encodeURIComponent(clientId)}/regenerate-token`, { method: "POST" });
            await loadOverview();
            showStatus(copy.clients.rotateToken, copy.status.tokenRotated(result.access_token));
            return;
        }

        if (button.dataset.action === "save-client") {
            await requestJson(`/api/admin/clients/${encodeURIComponent(clientId)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    display_name: displayName,
                    note: note || null,
                    enabled,
                }),
            });
            await loadOverview();
            showStatus(copy.clients.saveClient, copy.status.clientUpdated(displayName || clientId));
            return;
        }

        if (!window.confirm(copy.confirm.deleteClient(displayName || clientId))) return;
        await requestJson(`/api/admin/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" });
        await loadOverview();
        showStatus(copy.clients.deleteClient, copy.status.clientDeleted(displayName || clientId));
    } catch (error) {
        showStatus(copy.errors.clientAction, error.message, "danger");
    }
});

bindingList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest("[data-binding-id]");
    const bindingId = card?.dataset.bindingId;
    if (!bindingId) return;

    const phoneField = card.querySelector('[data-field="phone_number"]');
    const clientField = card.querySelector('[data-field="client_id"]');
    const noteField = card.querySelector('[data-field="note"]');
    const enabledField = card.querySelector('[data-field="enabled"]');
    const phoneNumber = phoneField?.value.trim() || "";
    const clientId = clientField?.value.trim() || "";
    const note = noteField?.value.trim() || "";
    const enabled = Boolean(enabledField?.checked);

    try {
        if (button.dataset.action === "save-binding") {
            await requestJson(`/api/admin/bindings/${bindingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    client_id: clientId,
                    note: note || null,
                    enabled,
                }),
            });
            await loadOverview();
            showStatus(copy.bindings.save, copy.status.bindingUpdated(phoneNumber));
            return;
        }

        if (!window.confirm(copy.confirm.deleteBinding(phoneNumber))) return;
        await requestJson(`/api/admin/bindings/${bindingId}`, { method: "DELETE" });
        await loadOverview();
        showStatus(copy.bindings.deleteBinding, copy.status.bindingDeleted(phoneNumber));
    } catch (error) {
        showStatus(copy.errors.bindingAction, error.message, "danger");
    }
});

applyStaticCopy();
syncLogFilterInputs();
setAdminView(state.activeView);
void loadSession();
