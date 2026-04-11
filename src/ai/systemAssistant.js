import { formatTrajectoryLines } from './formatTrajectoryLines.js';

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function isOfflineAndroidBuild() {
    if (typeof window === 'undefined' || typeof location === 'undefined') return false;
    return location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net';
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
    #state = {
        talents: [],
        propertyAllocate: null,
        recentTrajectory: [],
        messages: [],
        summary: [],
        autoIntroDone: false,
        phase: 'idle',
    };

    mount() {
        if (this.#mounted || typeof document === 'undefined') return;
        this.#mounted = true;
        this.#injectStyles();
        this.#createDom();
        this.#bindEvents();
        this.#render();
    }

    resetRun({ talents = [], propertyAllocate = null, startContent = [] } = {}) {
        this.#state = {
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
        if (isOfflineAndroidBuild()) {
            this.#appendMessage('assistant', '当前是离线单机 APK。为了不依赖服务器，这版先关闭了 AI 在线对话；系统玩法和数值都能本地玩。');
            return;
        }
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
        this.#appendMessage('meta', `本局已结算。你可以让系统复盘这一生，或者追问下一局怎么配。`);
        this.#render();
    }

    async ask({ intent = 'chat', userMessage = '', showUser = true } = {}) {
        if (this.#busy) return;
        if (!core.system) {
            this.#appendMessage('assistant', '先开始一局人生，系统才能真正接管并开口。');
            return;
        }

        if (isOfflineAndroidBuild()) {
            this.#appendMessage('assistant', '这版 APK 是纯离线单机版，不依赖我的服务器，所以 AI 对话默认关闭。后面如果你要，我可以再做一版“你自己填 MiniMax Key”的联网版。');
            return;
        }

        const text = userMessage.trim();
        if (showUser && text) this.#appendMessage('user', text);

        this.#busy = true;
        this.#render();
        try {
            const response = await fetch('/api/system-dialogue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent,
                    userMessage: text,
                    history: this.#state.messages
                        .filter(({ role }) => role === 'user' || role === 'assistant')
                        .slice(-8)
                        .map(({ role, content }) => ({ role, content })),
                    context: {
                        phase: this.#state.phase,
                        system: clone(core.system),
                        properties: clone(core.propertys),
                        talents: clone(this.#state.talents),
                        recentTrajectory: clone(this.#state.recentTrajectory),
                        summary: clone(this.#state.summary),
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.error || '系统暂时离线');
            }
            this.#appendMessage('assistant', data.reply);
        } catch (error) {
            this.#appendMessage('assistant', `系统连接失败：${error.message}`);
        } finally {
            this.#busy = false;
            this.#render();
        }
    }

    #autoIntro() {
        if (this.#state.autoIntroDone || !core.system) return;
        this.#state.autoIntroDone = true;
        setTimeout(() => {
            this.ask({ intent: 'intro', userMessage: '', showUser: false });
        }, 500);
    }

    #appendMessage(role, content) {
        const item = { role, content, at: Date.now() };
        this.#state.messages.push(item);
        this.#state.messages = this.#state.messages.slice(-24);
        if (!this.#elements.messages) return;
        const node = document.createElement('div');
        node.className = `life-ai-msg ${role}`;
        node.textContent = content;
        this.#elements.messages.appendChild(node);
        this.#elements.messages.scrollTop = this.#elements.messages.scrollHeight;
    }

    #bindEvents() {
        const { toggle, close, send, textarea, quicks } = this.#elements;
        toggle.addEventListener('click', () => this.#togglePanel(true));
        close.addEventListener('click', () => this.#togglePanel(false));
        send.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (!text) return;
            textarea.value = '';
            this.ask({ userMessage: text });
        });
        textarea.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send.click();
            }
        });
        quicks.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                this.ask({ intent: button.dataset.intent, userMessage: '', showUser: false });
            });
        });
    }

    #togglePanel(open) {
        this.#elements.panel.classList.toggle('open', open);
    }

    #render() {
        if (!this.#elements.status) return;
        const system = core.system;
        this.#elements.status.textContent = system
            ? `${system.name} · Lv.${system.level}${isOfflineAndroidBuild() ? ' · 离线版' : ''}`
            : (isOfflineAndroidBuild() ? '离线单机版' : '未绑定系统');
        const disabled = this.#busy || isOfflineAndroidBuild();
        this.#elements.send.disabled = disabled;
        this.#elements.send.textContent = isOfflineAndroidBuild()
            ? '离线版'
            : (this.#busy ? '系统思考中…' : '发送');
        this.#elements.quicks.querySelectorAll('button').forEach(button => {
            button.disabled = disabled;
        });
        this.#elements.textarea.disabled = isOfflineAndroidBuild();
        this.#elements.textarea.placeholder = isOfflineAndroidBuild()
            ? '离线单机版已关闭 AI 在线对话'
            : '问系统一句，比如：我这局该走修仙还是神豪？';
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
                        <div class="life-ai-sub">MiniMax M2.7 highspeed / 离线 APK 自动关闭</div>
                    </div>
                    <div class="life-ai-header-right">
                        <span class="life-ai-status"></span>
                        <button class="life-ai-close">×</button>
                    </div>
                </div>
                <div class="life-ai-quicks">
                    <button data-intent="intro">系统播报</button>
                    <button data-intent="advice">下一步建议</button>
                    <button data-intent="commentary">锐评这局</button>
                    <button data-intent="summary">总结复盘</button>
                </div>
                <div class="life-ai-messages"></div>
                <div class="life-ai-compose">
                    <textarea placeholder="问系统一句，比如：我这局该走修仙还是神豪？"></textarea>
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
                width: min(380px, calc(100vw - 24px));
                height: min(560px, calc(100vh - 88px));
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
                grid-template-rows: auto auto 1fr auto;
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
            #life-system-assistant .life-ai-status {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.65);
            }
            #life-system-assistant .life-ai-header-right {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #life-system-assistant .life-ai-close {
                width: 28px;
                height: 28px;
                border-radius: 999px;
                border: 0;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
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
                resize: none;
                min-height: 78px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(7, 10, 19, 0.72);
                color: #fff;
                padding: 10px 12px;
                outline: none;
            }
            #life-system-assistant button:disabled {
                opacity: 0.55;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
}

export const lifeSystemAssistant = new LifeSystemAssistant();
export const ensureLifeSystemAssistant = () => lifeSystemAssistant.mount();
