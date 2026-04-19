const DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';
const DEFAULT_MODEL = 'MiniMax-M2.7-highspeed';
const LOCAL_STORAGE_KEY = 'lifeRestart.ai.config';

function readStoredConfig() {
    if (typeof localStorage === 'undefined') return {};
    return safeJsonParse(localStorage.getItem(LOCAL_STORAGE_KEY), {}) || {};
}

function maskApiKey(apiKey = '') {
    if (!apiKey) return '';
    const visible = `${apiKey}`.slice(-4);
    return `••••••${visible}`;
}

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

async function probeSystemDialogueHealth() {
    if (typeof fetch === 'undefined') return null;
    try {
        const options = { method: 'GET' };
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            options.signal = AbortSignal.timeout(2500);
        }
        const response = await fetch('/api/system-dialogue/health', options);
        if (!response.ok) return null;
        return safeJsonParse(await response.text(), null);
    } catch {
        return null;
    }
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

    const stored = readStoredConfig();
    if (stored.apiKey) {
        return {
            mode: 'browser-direct',
            hasApiKey: true,
            apiKeyMasked: maskApiKey(stored.apiKey),
            baseUrl: stored.baseUrl || DEFAULT_BASE_URL,
            model: stored.model || DEFAULT_MODEL,
        };
    }

    const health = await probeSystemDialogueHealth();
    const proxyReady = Boolean(health?.ok && health?.ready);
    return {
        mode: proxyReady ? 'server-proxy' : 'browser-direct',
        hasApiKey: false,
        apiKeyMasked: '',
        baseUrl: stored.baseUrl || health?.baseUrl || DEFAULT_BASE_URL,
        model: stored.model || health?.model || DEFAULT_MODEL,
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

    const current = readStoredConfig();
    const next = {
        ...current,
        baseUrl: baseUrl || DEFAULT_BASE_URL,
        model: model || DEFAULT_MODEL,
    };
    if (apiKey != null && apiKey !== '') next.apiKey = apiKey;
    if (clearApiKey) delete next.apiKey;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    return loadAiConfig();
}

export async function requestMiniMaxChat({ baseUrl = DEFAULT_BASE_URL, body }) {
    const bridge = getAndroidBridge();
    if (!bridge) {
        const stored = readStoredConfig();
        if (!stored.apiKey) {
            throw new Error('当前环境未保存 MiniMax API Key');
        }
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${stored.apiKey}`,
            },
            body: JSON.stringify(body),
        };
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            options.signal = AbortSignal.timeout(30000);
        }
        const response = await fetch(`${(baseUrl || stored.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')}/chat/completions`, options);
        const rawText = await response.text();
        const data = safeJsonParse(rawText, null);
        if (!response.ok) {
            throw new Error(data?.error?.message || data?.message || `MiniMax 请求失败（HTTP ${response.status}）`);
        }
        if (!data) {
            throw new Error('MiniMax 响应不是有效 JSON');
        }
        return data;
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
