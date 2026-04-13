import { formatTrajectoryLines } from './formatTrajectoryLines.js';
import { buildSystemMessages } from './systemPrompt.js';
import {
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    hasAndroidMiniMaxBridge,
    isAppAssetsOrigin,
    loadAiConfig,
    requestMiniMaxChat,
    saveAiConfig,
} from './nativeMiniMax.js';
import { localRuleEngine } from '../engine/localRuleEngine.js';
import { memoryManager } from '../domain/memoryManager.js';

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function compactText(text = '') {
    return `${text}`.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function summaryToList() {
    const summary = core.summary;
    return [
        [core.PropertyTypes.HCHR, $lang.UI_Property_Charm],
        [core.PropertyTypes.HINT, $lang.UI_Property_Intelligence],
        [core.PropertyTypes.HSTR, $lang.UI_Property_Strength],
        [core.PropertyTypes.HMNY, $lang.UI_Property_Money],
        [core.PropertyTypes.HSPR, $lang.UI_Property_Spirit],
        [core.PropertyTypes.HAGE, $lang.UI_Final_Age],
        [core.PropertyTypes.SUM, $lang.UI_Total_Judge],
    ].map(([type, label]) => ({
        label,
        value: summary[type]?.value,
        judge: summary[type]?.judge,
        grade: summary[type]?.grade,
    }));
}

class LifeSystemAssistant {
    #mounted = false;
    #busy = false;
    #elements = {};
    #settingsOpen = false;
    #state = {
        talents: [],
        propertyAllocate: null,
        recentTrajectory: [],
        messages: [],
        summary: [],
        autoIntroDone: false,
        phase: 'idle',
        aiConfig: {
            mode: 'loading',
            hasApiKey: false,
            apiKeyMasked: '',
            baseUrl: DEFAULT_BASE_URL,
            model: DEFAULT_MODEL,
        },
    };

    mount() {
        if (this.#mounted || typeof document === 'undefined') return;
        this.#mounted = true;
        this.#injectStyles();
        this.#createDom();
        this.#bindEvents();
        this.#render();
        void this.#hydrateAiConfig();
    }

    resetRun({ talents = [], propertyAllocate = null, startContent = [] } = {}) {
        this.#state = {
            ...this.#state,
            talents: clone(talents),
            propertyAllocate: clone(propertyAllocate),
            recentTrajectory: [],
            messages: [],
            summary: [],
            autoIntroDone: false,
            phase: 'trajectory',
        };
        this.#elements.messages.innerHTML = '';
        const system = core.system;
        if (system) {
            this.#appendMessage('meta', `【${system.name}】已接管这一局人生。\n${system.description || '准备开始你的系统人生。'}`);
        } else {
            this.#appendMessage('meta', '先开一局人生，我再以系统身份和你对话。');
        }
        const startLines = formatTrajectoryLines(startContent);
        if (startLines.length) {
            this.#state.recentTrajectory.push({ age: '启', lines: startLines });
            this.#appendMessage('meta', `开局记录：\n${startLines.join('\n')}`);
        }
        this.#render();
        this.#announceModeIfNeeded();
        this.#autoIntro();
    }

    pushTrajectory({ age, content = [] }) {
        const lines = formatTrajectoryLines(content);
        if (!lines.length) return;
        this.#state.phase = 'trajectory';
        this.#state.recentTrajectory.push({ age, lines });
        this.#state.recentTrajectory = this.#state.recentTrajectory.slice(-8);
        const systemLines = lines.filter(line => /系统/.test(line));
        if (systemLines.length) {
            this.#appendMessage('meta', `${age}岁系统播报：\n${systemLines.join('\n')}`);
        }
        this.#render();
    }

    updateSummary({ talents = [] } = {}) {
        this.#state.phase = 'summary';
        this.#state.talents = clone(talents);
        this.#state.summary = summaryToList();
        this.#appendMessage('meta', '本局已结算。你可以让系统复盘这一生，或者追问下一局怎么配。');
        this.#render();
    }

    async ask({ intent = 'chat', userMessage = '', showUser = true } = {}) {
        if (this.#busy) return;
        if (!core.system) {
            this.#appendMessage('assistant', '先开始一局人生，系统才能真正接管并开口。');
            return;
        }

        const text = userMessage.trim();
        if (showUser && text) this.#appendMessage('user', text);

        this.#busy = true;
        this.#render();
        try {
            const data = await this.#requestReply({ intent, userMessage: text });
            this.#appendMessage('assistant', data.reply);
        } catch (error) {
            this.#appendMessage('assistant', `系统连接失败：${error.message}`);
        } finally {
            this.#busy = false;
            this.#render();
        }
    }

    async #requestReply({ intent, userMessage }) {
        const aiConfig = this.#state.aiConfig;
        const history = this.#state.messages
            .filter(({ role }) => role === 'user' || role === 'assistant')
            .slice(-8)
            .map(({ role, content }) => ({ role, content }));
        const context = {
            phase: this.#state.phase,
            system: clone(core.system),
            properties: clone(core.propertys),
            talents: clone(this.#state.talents),
            recentTrajectory: clone(this.#state.recentTrajectory),
            summary: clone(this.#state.summary),
        };

        // 混合引擎：优先尝试 AI，失败时使用本地规则
        try {
            // 检查是否需要使用 AI
            if (this.#shouldUseAI(aiConfig, context, userMessage)) {
                if (aiConfig.mode === 'android-direct') {
                    if (!aiConfig.hasApiKey) {
                        throw new Error('请先点右上角”设置”，填入你自己的 MiniMax API Key');
                    }
                    const messages = buildSystemMessages({ intent, userMessage, history, context });
                    const response = await requestMiniMaxChat({
                        baseUrl: aiConfig.baseUrl,
                        body: {
                            model: aiConfig.model,
                            temperature: 1,
                            n: 1,
                            max_tokens: 520,
                            messages,
                        },
                    });
                    return {
                        reply: compactText(response?.choices?.[0]?.message?.content || '') || '系统暂时没有给出有效回复，你可以换个问法再试一次。',
                        source: 'ai'
                    };
                }

                if (!isAppAssetsOrigin() || hasAndroidMiniMaxBridge()) {
                    const res = await fetch('/api/system-dialogue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ intent, userMessage, history, context }),
                    });
                    const data = await res.json();
                    if (res.ok && data.ok) {
                        return { ...data, source: 'ai' };
                    }
                }
            }

            // AI 失败或不需要 AI，使用本地规则
            return this.#useLocalRuleEngine(intent, context, userMessage);
        } catch (error) {
            console.warn('AI 请求失败，使用本地规则:', error.message);
            // AI 失败，使用本地规则兜底
            return this.#useLocalRuleEngine(intent, context, userMessage);
        }
    }

    /**
     * 判断是否应该使用 AI
     */
    #shouldUseAI(aiConfig, context, userMessage) {
        // 如果没有 API Key，不使用 AI
        if (aiConfig.mode === 'android-direct' && !aiConfig.hasApiKey) {
            return false;
        }

        // 如果用户主动输入消息，尝试使用 AI
        if (userMessage && userMessage.trim()) {
            return true;
        }

        // 特定意图需要 AI
        const aiRequiredIntents = ['create-event', 'create-talent', 'create-system'];
        const currentIntent = this.#detectIntent(context.phase, userMessage);
        return aiRequiredIntents.includes(currentIntent);
    }

    /**
     * 检测当前意图
     */
    #detectIntent(phase, userMessage) {
        if (userMessage?.includes('共创新事件')) return 'create-event';
        if (userMessage?.includes('共创新天赋')) return 'create-talent';
        if (userMessage?.includes('共创新能力')) return 'create-system';
        if (phase === 'summary') return 'summary';
        if (userMessage?.includes('建议') || userMessage?.includes('怎么做')) return 'advice';
        if (userMessage?.includes('点评') || userMessage?.includes('评价')) return 'commentary';
        if (userMessage?.includes('播报') || userMessage?.includes('开局')) return 'intro';
        return 'chat';
    }

    /**
     * 使用本地规则引擎
     */
    #useLocalRuleEngine(intent, context, userMessage) {
        try {
            switch (intent) {
                case 'advice':
                    const advices = localRuleEngine.generateAdvice(context);
                    return {
                        reply: advices.join('\n'),
                        source: 'local'
                    };
                case 'commentary':
                    const commentary = localRuleEngine.generateCommentary(context);
                    return {
                        reply: commentary,
                        source: 'local'
                    };
                case 'summary':
                    const summary = localRuleEngine.generateSummary(context);
                    const summaryText = `高光：\n${summary.highlights.join('\n')}\n\n遗憾：\n${summary.regrets.join('\n')}\n\n建议：\n${summary.nextSteps.join('\n')}`;
                    return {
                        reply: summaryText,
                        source: 'local'
                    };
                default:
                    const reply = localRuleEngine.generateSystemReply(userMessage || '', context);
                    return reply;
            }
        } catch (error) {
            console.error('本地规则引擎错误:', error);
            return {
                reply: '系统正在处理你的请求，请稍后...',
                source: 'local-error'
            };
        }
    }

    async #hydrateAiConfig() {
        const config = await loadAiConfig();
        this.#state.aiConfig = config;
        this.#syncSettingsForm();
        this.#render();
        this.#announceModeIfNeeded();
        if (core?.system && (config.mode !== 'android-direct' || config.hasApiKey)) {
            this.#autoIntro();
        }
    }

    #announceModeIfNeeded() {
        const { mode, hasApiKey } = this.#state.aiConfig;
        if (mode === 'android-direct' && !hasApiKey && !this.#state.messages.some(({ content }) => content.includes('MiniMax API Key'))) {
            this.#appendMessage('assistant', '这版是手机直连 MiniMax 的联网共创版，不走我的服务器。先点右上角“设置”，填入你自己的 MiniMax API Key，就能边玩边跟系统对话。');
        }
    }

    #autoIntro() {
        if (this.#state.autoIntroDone || !core.system) return;
        if (this.#state.aiConfig.mode === 'loading') return;
        if (this.#state.aiConfig.mode === 'android-direct' && !this.#state.aiConfig.hasApiKey) return;
        this.#state.autoIntroDone = true;
        setTimeout(() => {
            this.ask({ intent: 'intro', userMessage: '', showUser: false });
        }, 500);
    }

    #appendMessage(role, content) {
        const item = { role, content, at: Date.now() };
        this.#state.messages.push(item);
        this.#state.messages = this.#state.messages.slice(-36);
        if (!this.#elements.messages) return;
        const node = document.createElement('div');
        node.className = `life-ai-msg ${role}`;
        node.textContent = content;
        this.#elements.messages.appendChild(node);
        this.#elements.messages.scrollTop = this.#elements.messages.scrollHeight;
    }

    #bindEvents() {
        const {
            toggle,
            close,
            send,
            textarea,
            quicks,
            settingsBtn,
            saveSettings,
            clearApiKey,
        } = this.#elements;
        toggle.addEventListener('click', () => this.#togglePanel(true));
        close.addEventListener('click', () => this.#togglePanel(false));
        settingsBtn.addEventListener('click', () => this.#toggleSettings());
        saveSettings.addEventListener('click', () => {
            void this.#saveSettings();
        });
        clearApiKey.addEventListener('click', () => {
            void this.#clearApiKey();
        });
        send.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (!text) return;
            textarea.value = '';
            void this.ask({ userMessage: text });
        });
        textarea.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send.click();
            }
        });
        quicks.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                void this.ask({ intent: button.dataset.intent, userMessage: '', showUser: false });
            });
        });
    }

    async #saveSettings() {
        const apiKey = this.#elements.apiKey.value.trim();
        const baseUrl = this.#elements.baseUrl.value.trim() || DEFAULT_BASE_URL;
        const model = this.#elements.model.value.trim() || DEFAULT_MODEL;
        this.#elements.settingsHint.textContent = '保存中…';
        try {
            this.#state.aiConfig = await saveAiConfig({
                ...(apiKey ? { apiKey } : {}),
                baseUrl,
                model,
            });
            this.#elements.apiKey.value = '';
            this.#elements.settingsHint.textContent = this.#state.aiConfig.mode === 'android-direct'
                ? '已保存到手机本地'
                : '浏览器调试模式下只保存了 baseUrl/model';
            this.#syncSettingsForm();
            this.#render();
            this.#appendMessage('meta', `AI 设置已更新：${this.#state.aiConfig.model} / ${this.#state.aiConfig.mode === 'android-direct' ? '手机直连' : '本地代理'}`);
            if (core.system && this.#state.aiConfig.hasApiKey && !this.#state.autoIntroDone) {
                this.#autoIntro();
            }
        } catch (error) {
            this.#elements.settingsHint.textContent = `保存失败：${error.message}`;
        }
    }

    async #clearApiKey() {
        this.#elements.settingsHint.textContent = '清空中…';
        try {
            this.#state.aiConfig = await saveAiConfig({ clearApiKey: true });
            this.#elements.apiKey.value = '';
            this.#elements.settingsHint.textContent = '已清空保存的 API Key';
            this.#syncSettingsForm();
            this.#render();
        } catch (error) {
            this.#elements.settingsHint.textContent = `清空失败：${error.message}`;
        }
    }

    #togglePanel(open) {
        this.#elements.panel.classList.toggle('open', open);
    }

    #toggleSettings(force) {
        this.#settingsOpen = typeof force === 'boolean' ? force : !this.#settingsOpen;
        this.#elements.settings.classList.toggle('open', this.#settingsOpen);
    }

    #syncSettingsForm() {
        const config = this.#state.aiConfig;
        if (!this.#elements.apiKey) return;
        this.#elements.baseUrl.value = config.baseUrl || DEFAULT_BASE_URL;
        this.#elements.model.value = config.model || DEFAULT_MODEL;
        this.#elements.apiKey.placeholder = config.hasApiKey
            ? `已保存：${config.apiKeyMasked || '••••••••'}`
            : '填入你自己的 MiniMax API Key';
    }

    #render() {
        if (!this.#elements.status) return;
        const system = core.system;
        const aiConfig = this.#state.aiConfig;
        const canUseAi = aiConfig.mode !== 'loading' && (aiConfig.mode !== 'android-direct' || aiConfig.hasApiKey);
        const shouldDisableAsk = this.#busy || !canUseAi;
        const modeText = aiConfig.mode === 'android-direct'
            ? (aiConfig.hasApiKey ? '手机直连 MiniMax' : '待配置 MiniMax Key')
            : (aiConfig.mode === 'loading' ? '读取 AI 配置…' : '本地代理模式');

        this.#elements.status.textContent = system
            ? `${system.name} · Lv.${system.level}`
            : '未绑定系统';
        this.#elements.sub.textContent = `${aiConfig.model || DEFAULT_MODEL} / ${modeText}`;
        this.#elements.send.disabled = shouldDisableAsk;
        this.#elements.send.textContent = this.#busy ? '系统思考中…' : '发送';
        this.#elements.quicks.querySelectorAll('button').forEach(button => {
            button.disabled = shouldDisableAsk;
        });
        this.#elements.textarea.disabled = shouldDisableAsk;
        this.#elements.textarea.placeholder = aiConfig.mode === 'android-direct' && !aiConfig.hasApiKey
            ? '先点设置，填入你自己的 MiniMax API Key'
            : '问系统一句，比如：我这局该走修仙还是神豪？';
        this.#elements.settingsBtn.style.display = aiConfig.mode === 'android-direct' ? 'inline-flex' : 'none';
    }

    #createDom() {
        const root = document.createElement('div');
        root.id = 'life-system-assistant';
        root.innerHTML = `
            <button class="life-ai-toggle">系统AI</button>
            <div class="life-ai-panel">
                <div class="life-ai-header">
                    <div>
                        <strong>系统对话</strong>
                        <div class="life-ai-sub"></div>
                    </div>
                    <div class="life-ai-header-right">
                        <span class="life-ai-status"></span>
                        <button class="life-ai-settings-btn">设置</button>
                        <button class="life-ai-close">×</button>
                    </div>
                </div>
                <div class="life-ai-settings">
                    <label>
                        <span>MiniMax API Key</span>
                        <input class="life-ai-api-key" type="password" autocomplete="off" />
                    </label>
                    <label>
                        <span>Base URL</span>
                        <input class="life-ai-base-url" type="text" autocomplete="off" />
                    </label>
                    <label>
                        <span>Model</span>
                        <input class="life-ai-model" type="text" autocomplete="off" />
                    </label>
                    <div class="life-ai-settings-actions">
                        <button class="life-ai-save-settings">保存设置</button>
                        <button class="life-ai-clear-key">清空 Key</button>
                    </div>
                    <div class="life-ai-settings-hint">你的 Key 只保存在你自己的手机本地。</div>
                </div>
                <div class="life-ai-quicks">
                    <button data-intent="intro">系统播报</button>
                    <button data-intent="advice">下一步建议</button>
                    <button data-intent="commentary">锐评这局</button>
                    <button data-intent="summary">总结复盘</button>
                    <button data-intent="create-event">共创新事件</button>
                    <button data-intent="create-talent">共创新天赋</button>
                    <button data-intent="create-system">共创新能力</button>
                </div>
                <div class="life-ai-messages"></div>
                <div class="life-ai-compose">
                    <textarea></textarea>
                    <button class="life-ai-send">发送</button>
                </div>
            </div>
        `;
        document.body.appendChild(root);
        this.#elements = {
            root,
            toggle: root.querySelector('.life-ai-toggle'),
            panel: root.querySelector('.life-ai-panel'),
            close: root.querySelector('.life-ai-close'),
            status: root.querySelector('.life-ai-status'),
            sub: root.querySelector('.life-ai-sub'),
            settingsBtn: root.querySelector('.life-ai-settings-btn'),
            settings: root.querySelector('.life-ai-settings'),
            apiKey: root.querySelector('.life-ai-api-key'),
            baseUrl: root.querySelector('.life-ai-base-url'),
            model: root.querySelector('.life-ai-model'),
            saveSettings: root.querySelector('.life-ai-save-settings'),
            clearApiKey: root.querySelector('.life-ai-clear-key'),
            settingsHint: root.querySelector('.life-ai-settings-hint'),
            quicks: root.querySelector('.life-ai-quicks'),
            messages: root.querySelector('.life-ai-messages'),
            textarea: root.querySelector('textarea'),
            send: root.querySelector('.life-ai-send'),
        };
        this.#appendMessage('meta', '系统对话已加载。先开一局人生，我再正式接管。');
    }

    #injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #life-system-assistant {
                position: fixed;
                right: 16px;
                bottom: 16px;
                z-index: 99999;
                font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                color: #f6f7fb;
            }
            #life-system-assistant .life-ai-toggle {
                background: linear-gradient(135deg, #5b6dff, #8f55ff);
                color: #fff;
                border: 0;
                border-radius: 999px;
                padding: 12px 16px;
                font-weight: 700;
                box-shadow: 0 12px 28px rgba(45, 63, 176, 0.35);
                cursor: pointer;
            }
            #life-system-assistant .life-ai-panel {
                width: min(420px, calc(100vw - 24px));
                height: min(640px, calc(100vh - 88px));
                margin-top: 12px;
                background: rgba(15, 20, 36, 0.94);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 18px;
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
                backdrop-filter: blur(14px);
                display: none;
                overflow: hidden;
            }
            #life-system-assistant .life-ai-panel.open {
                display: grid;
                grid-template-rows: auto auto auto 1fr auto;
            }
            #life-system-assistant .life-ai-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 14px 16px 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            #life-system-assistant .life-ai-sub,
            #life-system-assistant .life-ai-status,
            #life-system-assistant .life-ai-settings-hint {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.65);
            }
            #life-system-assistant .life-ai-header-right {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #life-system-assistant .life-ai-close,
            #life-system-assistant .life-ai-settings-btn,
            #life-system-assistant .life-ai-save-settings,
            #life-system-assistant .life-ai-clear-key {
                border-radius: 999px;
                border: 0;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                padding: 8px 12px;
            }
            #life-system-assistant .life-ai-close {
                width: 28px;
                height: 28px;
                padding: 0;
            }
            #life-system-assistant .life-ai-settings {
                display: none;
                padding: 12px 16px;
                gap: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.04);
            }
            #life-system-assistant .life-ai-settings.open {
                display: grid;
            }
            #life-system-assistant .life-ai-settings label {
                display: grid;
                gap: 6px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.82);
            }
            #life-system-assistant .life-ai-settings input,
            #life-system-assistant textarea {
                resize: none;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(7, 10, 19, 0.72);
                color: #fff;
                padding: 10px 12px;
                outline: none;
            }
            #life-system-assistant .life-ai-settings-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            #life-system-assistant .life-ai-quicks {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 12px 16px;
            }
            #life-system-assistant .life-ai-quicks button,
            #life-system-assistant .life-ai-send {
                border: 0;
                cursor: pointer;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                padding: 8px 12px;
                font-size: 13px;
            }
            #life-system-assistant .life-ai-send {
                background: linear-gradient(135deg, #2dbf85, #1aa56f);
                min-width: 88px;
                font-weight: 700;
            }
            #life-system-assistant .life-ai-messages {
                overflow: auto;
                padding: 0 16px 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #life-system-assistant .life-ai-msg {
                white-space: pre-wrap;
                line-height: 1.55;
                padding: 10px 12px;
                border-radius: 14px;
                font-size: 14px;
            }
            #life-system-assistant .life-ai-msg.assistant {
                background: rgba(116, 131, 255, 0.16);
                border: 1px solid rgba(116, 131, 255, 0.2);
                align-self: flex-start;
            }
            #life-system-assistant .life-ai-msg.user {
                background: rgba(45, 191, 133, 0.18);
                border: 1px solid rgba(45, 191, 133, 0.24);
                align-self: flex-end;
            }
            #life-system-assistant .life-ai-msg.meta {
                background: rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.78);
                font-size: 12px;
            }
            #life-system-assistant .life-ai-compose {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 10px;
                padding: 12px 16px 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }
            #life-system-assistant textarea {
                min-height: 88px;
            }
            #life-system-assistant button:disabled,
            #life-system-assistant textarea:disabled {
                opacity: 0.55;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
}

export const lifeSystemAssistant = new LifeSystemAssistant();
export const ensureLifeSystemAssistant = () => lifeSystemAssistant.mount();
