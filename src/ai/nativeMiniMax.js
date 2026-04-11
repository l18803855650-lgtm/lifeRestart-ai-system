const DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';
const DEFAULT_MODEL = 'MiniMax-M2.7-highspeed';
const LOCAL_STORAGE_KEY = 'lifeRestart.ai.config';

function safeJsonParse(text, fallback = null) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

function getAndroidBridge() {
    if (typeof window === 'undefined') return null;
    const bridge = window.LifeRestartAndroid;
    if (!bridge) return null;
    if (typeof bridge.getAiConfig !== 'function' || typeof bridge.invokeMiniMaxChat !== 'function') {
        return null;
    }
    return bridge;
}

export function hasAndroidMiniMaxBridge() {
    return Boolean(getAndroidBridge());
}

export function isAppAssetsOrigin() {
    if (typeof location === 'undefined') return false;
    return location.hostname === 'appassets.androidplatform.net' || location.protocol === 'file:';
}

export async function loadAiConfig() {
    const bridge = getAndroidBridge();
    if (bridge) {
        const raw = bridge.getAiConfig();
        const data = safeJsonParse(raw, {});
        return {
            mode: 'android-direct',
            hasApiKey: Boolean(data?.hasApiKey),
            apiKeyMasked: data?.apiKeyMasked || '',
            baseUrl: data?.baseUrl || DEFAULT_BASE_URL,
            model: data?.model || DEFAULT_MODEL,
        };
    }

    const stored = safeJsonParse(localStorage.getItem(LOCAL_STORAGE_KEY), {}) || {};
    return {
        mode: 'server-proxy',
        hasApiKey: false,
        apiKeyMasked: '',
        baseUrl: stored.baseUrl || DEFAULT_BASE_URL,
        model: stored.model || DEFAULT_MODEL,
    };
}

export async function saveAiConfig({ apiKey, baseUrl, model, clearApiKey = false } = {}) {
    const bridge = getAndroidBridge();
    if (bridge) {
        const payload = {};
        if (apiKey != null) payload.apiKey = apiKey;
        if (clearApiKey) payload.clearApiKey = true;
        if (baseUrl != null) payload.baseUrl = baseUrl;
        if (model != null) payload.model = model;
        const raw = bridge.saveAiConfig(JSON.stringify(payload));
        const data = safeJsonParse(raw, {});
        return {
            mode: 'android-direct',
            hasApiKey: Boolean(data?.hasApiKey),
            apiKeyMasked: data?.apiKeyMasked || '',
            baseUrl: data?.baseUrl || DEFAULT_BASE_URL,
            model: data?.model || DEFAULT_MODEL,
        };
    }

    const next = {
        baseUrl: baseUrl || DEFAULT_BASE_URL,
        model: model || DEFAULT_MODEL,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    return {
        mode: 'server-proxy',
        hasApiKey: false,
        apiKeyMasked: '',
        ...next,
    };
}

export async function requestMiniMaxChat({ baseUrl = DEFAULT_BASE_URL, body }) {
    const bridge = getAndroidBridge();
    if (!bridge) {
        throw new Error('当前环境不支持 APK 直连 MiniMax');
    }
    const raw = bridge.invokeMiniMaxChat(JSON.stringify({ baseUrl, body }));
    const data = safeJsonParse(raw, null);
    if (!data) {
        throw new Error('MiniMax 原生桥返回了无效数据');
    }
    if (!data.ok) {
        throw new Error(data.error || `MiniMax 请求失败（HTTP ${data.status || 'unknown'}）`);
    }
    const response = safeJsonParse(data.responseText, null);
    if (!response) {
        throw new Error('MiniMax 响应不是有效 JSON');
    }
    return response;
}

export { DEFAULT_BASE_URL, DEFAULT_MODEL };
