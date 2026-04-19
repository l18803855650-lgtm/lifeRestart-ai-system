/**
 * 人生重开 AI 系统 —— 主应用控制器
 *
 * 负责页面路由、DOM 交互、模块编排，将所有子系统串联为完整的游戏体验。
 * 所有 UI 逻辑的唯一入口，统一管理页面切换、事件绑定与状态同步。
 */

import { aiService, PROVIDERS } from './ai-service.js';
import { gameEngine, TALENT_POOL, PROPERTIES, getDeathReasonText } from './game-engine.js';
import { systemManager, PRESET_SYSTEMS } from './system-manager.js';
import { memoryEngine } from './memory-engine.js';
import { chatTerminal } from './chat-terminal.js';
import { shareSystem } from './share-system.js';

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/** querySelector 简写 */
function _$(selector) {
    return document.querySelector(selector);
}

/** querySelectorAll 简写 */
function _$$(selector) {
    return document.querySelectorAll(selector);
}

/** 快速创建 DOM 元素 */
function _createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML !== undefined) el.innerHTML = innerHTML;
    return el;
}

/** 数字格式化显示 */
function _formatNumber(n) {
    if (n === undefined || n === null) return '0';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

/** HTML 实体转义，防止 XSS */
function _escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, ch => map[ch]);
}

/** 根据品质等级生成星级文本 */
function _renderStars(grade) {
    const count = Math.max(1, Math.min(5, (grade || 0) + 1));
    return '★'.repeat(count) + '☆'.repeat(5 - count);
}

// 品质对应边框颜色
const GRADE_BORDER = {
    0: '#b0b0b0',
    1: '#4caf50',
    2: '#2196f3',
    3: '#9c27b0',
    4: '#ff9800',
};

// 品质对应 CSS 类名
const GRADE_CLASS = {
    0: 'grade-common',
    1: 'grade-uncommon',
    2: 'grade-rare',
    3: 'grade-epic',
    4: 'grade-legendary',
};

// 语气风格选项
const TONE_OPTIONS = [
    { value: 'tsundere', label: '傲娇' },
    { value: 'sarcastic', label: '毒舌' },
    { value: 'devoted', label: '忠犬' },
    { value: 'cold', label: '冷淡' },
    { value: 'mysterious', label: '神秘' },
    { value: 'cheerful', label: '开朗' },
];

// 版本号
const VERSION = 'v3.0.0';

// ═══════════════════════════════════════════════════════════════
// App 主应用类
// ═══════════════════════════════════════════════════════════════

class App {
    constructor() {
        /** 核心服务引用 */
        this.aiService = aiService;
        this.gameEngine = gameEngine;
        this.systemManager = systemManager;
        this.memoryEngine = memoryEngine;
        this.chatTerminal = chatTerminal;
        this.shareSystem = shareSystem;

        /** 当前激活页面 ID */
        this.currentPage = 'page-start';
        /** 页面 DOM 引用缓存 */
        this.pages = {};
        /** 是否已初始化 */
        this.initialized = false;
        /** 已选择系统的引用 */
        this._selectedSystemId = null;
        /** 天赋抽取结果缓存 */
        this._drawnTalents = [];
        /** 已选天赋 ID 集合 */
        this._selectedTalentIds = new Set();
        /** 属性分配暂存 */
        this._allocation = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };
        /** 系统编辑器是否打开 */
        this._editorOpen = false;
    }

    // ────────────────────────────────────────────────────────
    // 公开方法
    // ────────────────────────────────────────────────────────

    /** 初始化应用，绑定所有事件 */
    init() {
        if (this.initialized) return;

        // 缓存所有页面 DOM 节点
        const pageIds = [
            'page-start', 'page-api-setup', 'page-system-select',
            'page-talent-draw', 'page-property-allocate',
            'page-life-simulation', 'page-chat', 'page-life-summary',
        ];
        pageIds.forEach(id => {
            this.pages[id] = document.getElementById(id);
        });

        // 确保起始页可见
        if (this.pages['page-start']) {
            this.pages['page-start'].classList.add('active');
        }

        // 恢复已保存的 AI 配置与继续游戏入口
        try {
            this._restoreAiConfig();
        } catch (err) {
            console.warn('[App] 恢复 AI 配置失败：', err.message);
        }
        this._updateContinueButton();

        // 初始化起始页
        this._initStartPage();

        this.initialized = true;

        // v3.0 Ripple effect on buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            if (!btn) return;
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });

        console.log(`[App] 人生重开 AI 系统 ${VERSION} 已启动`);
    }

    /**
     * 页面导航（带动画）
     * @param {string} pageId - 目标页面 ID
     */
    navigateTo(pageId) {
        if (!this.pages[pageId]) {
            console.warn(`[App] 未知页面: ${pageId}`);
            return;
        }
        if (pageId === this.currentPage) return;

        const oldPage = this.pages[this.currentPage];
        const newPage = this.pages[pageId];

        // 退出动画
        if (oldPage) {
            oldPage.classList.remove('active');
            oldPage.classList.add('page-exit');
        }

        const previousPage = this.currentPage;
        this.currentPage = pageId;

        setTimeout(() => {
            // 清除旧页面动画类
            if (oldPage) {
                oldPage.classList.remove('page-exit');
            }

            // 进入动画
            newPage.classList.add('active', 'page-enter');

            // 调用页面特定初始化
            this._onPageEnter(pageId);

            // 清除进入动画类
            setTimeout(() => {
                newPage.classList.remove('page-enter');
            }, 300);
        }, 300);
    }

    /**
     * 显示 Toast 通知
     * @param {string} message - 提示文字
     * @param {'success'|'error'|'warning'|'info'} type - 类型
     */
    showToast(message, type = 'info') {
        let container = _$('#toast-container');
        if (!container) {
            container = _createElement('div', 'toast-container');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = _createElement('div', `toast toast-${type}`, _escapeHtml(message));
        container.appendChild(toast);

        // 滑入动画
        requestAnimationFrame(() => {
            toast.classList.add('toast-enter');
        });

        // 3 秒后自动移除
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * 设置主题
     * @param {string} themeName - 主题名称
     */
    setTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName || 'default');
    }

    _getSaveKey() {
        return 'liferestart-modern-ui-save-v1';
    }

    _readProgress() {
        try {
            const raw = localStorage.getItem(this._getSaveKey());
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.warn('[App] 读取存档失败：', err.message);
            return null;
        }
    }

    _persistProgress(options = {}) {
        const { manual = false } = options;
        try {
            const snapshot = {
                version: VERSION,
                savedAt: Date.now(),
                currentPage: this.currentPage,
                selectedSystemId: this._selectedSystemId || this.gameEngine.getState().system?.id || null,
                aiConfig: this.aiService.getConfig(),
                game: this.gameEngine.exportSaveData(),
            };
            localStorage.setItem(this._getSaveKey(), JSON.stringify(snapshot));
            this._updateSaveStatus(snapshot.savedAt, manual ? '已手动保存' : '已自动保存');
            this._updateContinueButton();
            return true;
        } catch (err) {
            console.warn('[App] 保存进度失败：', err.message);
            return false;
        }
    }

    _clearProgress() {
        try {
            localStorage.removeItem(this._getSaveKey());
        } catch (err) {
            console.warn('[App] 清空存档失败：', err.message);
        }
        this._updateSaveStatus(null, '未存档');
        this._updateContinueButton();
    }

    _updateSaveStatus(savedAt = null, label = '未存档') {
        const el = document.getElementById('save-status');
        if (!el) return;
        if (!savedAt) {
            el.textContent = label;
            return;
        }
        const time = new Date(savedAt);
        const hh = String(time.getHours()).padStart(2, '0');
        const mm = String(time.getMinutes()).padStart(2, '0');
        el.textContent = `${label} ${hh}:${mm}`;
    }

    _updateContinueButton() {
        const btn = document.getElementById('btn-continue');
        if (!btn) return;
        const save = this._readProgress();
        btn.style.display = save?.game ? '' : 'none';
    }

    _restoreAiConfig() {
        return this.aiService.getConfig();
    }

    _resumeProgress() {
        const save = this._readProgress();
        if (!save?.game) {
            this.showToast('没有找到可继续的存档', 'warning');
            return;
        }

        const systemId = save.selectedSystemId || save.game.systemId;
        const restoredSystem = systemId ? this.systemManager.getSystem(systemId) : null;
        if (restoredSystem) {
            this.systemManager.activateSystem(restoredSystem.id);
            this.setTheme(restoredSystem.theme || 'default');
        }
        this.gameEngine.importSaveData(save.game, restoredSystem);
        this._selectedSystemId = systemId || null;

        if (save.aiConfig?.provider) {
            this.aiService.configure({
                provider: save.aiConfig.provider,
                apiKey: save.aiConfig.apiKey || '',
                baseUrl: save.aiConfig.baseUrl || '',
                model: save.aiConfig.model || '',
            });
        }

        this._updateSimulationUI();
        this._updateContinueButton();
        this._updateSaveStatus(save.savedAt, '继续存档');
        const targetPage = save.currentPage && this.pages[save.currentPage] ? save.currentPage : 'page-life-simulation';
        this.navigateTo(targetPage);
        this.showToast('已恢复上次人生进度', 'success');
    }

    // ────────────────────────────────────────────────────────
    // 页面入口分发
    // ────────────────────────────────────────────────────────

    /** 根据页面 ID 调用对应的初始化方法 */
    _onPageEnter(pageId) {
        const handlers = {
            'page-start': () => this._initStartPage(),
            'page-api-setup': () => this._initApiSetupPage(),
            'page-system-select': () => this._initSystemSelectPage(),
            'page-talent-draw': () => this._initTalentDrawPage(),
            'page-property-allocate': () => this._initPropertyAllocatePage(),
            'page-life-simulation': () => this._initLifeSimulationPage(),
            'page-chat': () => this._initChatPage(),
            'page-life-summary': () => this._initLifeSummaryPage(),
        };
        if (handlers[pageId]) handlers[pageId]();
    }

    // ────────────────────────────────────────────────────────
    // 开始页
    // ────────────────────────────────────────────────────────

    _initStartPage() {
        const page = this.pages['page-start'];
        if (!page) return;

        // 版本信息
        const versionEl = page.querySelector('.version-info');
        if (versionEl) versionEl.textContent = VERSION;

        // v3.0 Tagline rotation
        const taglines = page.querySelectorAll('.tagline-item');
        if (taglines.length > 1) {
            let tagIdx = 0;
            setInterval(() => {
                taglines[tagIdx].classList.remove('active');
                tagIdx = (tagIdx + 1) % taglines.length;
                taglines[tagIdx].classList.add('active');
            }, 3000);
        }

        // 标题淡入动画
        const title = page.querySelector('.title');
        if (title) {
            title.classList.remove('fade-in');
            requestAnimationFrame(() => title.classList.add('fade-in'));
        }

        // 绑定「开始新人生」按钮
        const startBtn = page.querySelector('#btn-start');
        if (startBtn) {
            startBtn.onclick = () => {
                this._clearProgress();
                this.navigateTo('page-api-setup');
            };
        }

        const continueBtn = page.querySelector('#btn-continue');
        if (continueBtn) {
            continueBtn.style.display = this._readProgress()?.game ? '' : 'none';
            continueBtn.onclick = () => this._resumeProgress();
        }
    }

    // ────────────────────────────────────────────────────────
    // API 配置页
    // ────────────────────────────────────────────────────────

    _initApiSetupPage() {
        const page = this.pages['page-api-setup'];
        if (!page) return;

        const providerSelect = page.querySelector('#provider-select');
        const apiKeyInput = page.querySelector('#api-key-input');
        const baseUrlInput = page.querySelector('#base-url-input');
        const baseUrlGroup = page.querySelector('#base-url-group');
        const modelSelect = page.querySelector('#model-select');
        const confirmBtn = page.querySelector('#btn-api-confirm');
        const skipBtn = page.querySelector('#btn-api-skip');

        // 填充供应商下拉
        if (providerSelect) {
            providerSelect.innerHTML = '';
            for (const [key, provider] of Object.entries(PROVIDERS)) {
                const opt = _createElement('option', '', _escapeHtml(provider.name));
                opt.value = key;
                providerSelect.appendChild(opt);
            }

            // 供应商切换时更新表单
            providerSelect.onchange = () => {
                const key = providerSelect.value;
                const provider = PROVIDERS[key];
                if (!provider) return;

                // 基础地址
                if (baseUrlInput) {
                    baseUrlInput.value = provider.baseUrl || '';
                    baseUrlInput.placeholder = provider.baseUrl || '请输入 API 地址';
                }

                // 自定义供应商显示基础地址输入框
                if (baseUrlGroup) {
                    baseUrlGroup.style.display = (key === 'custom') ? 'block' : 'none';
                }

                // 模型选择
                if (modelSelect) {
                    modelSelect.innerHTML = '';
                    if (key === 'custom') {
                        const opt = _createElement('option', '', '自定义模型');
                        opt.value = '';
                        modelSelect.appendChild(opt);
                    } else {
                        (provider.models || []).forEach(model => {
                            const opt = _createElement('option', '', _escapeHtml(model));
                            opt.value = model;
                            if (model === provider.defaultModel) opt.selected = true;
                            modelSelect.appendChild(opt);
                        });
                    }
                }
            };

            // 触发一次初始化
            providerSelect.dispatchEvent(new Event('change'));
        }

        // 恢复已有配置
        const existingConfig = aiService.getConfig ? aiService.getConfig() : null;
        if (existingConfig && existingConfig.provider && providerSelect) {
            providerSelect.value = existingConfig.provider;
            providerSelect.dispatchEvent(new Event('change'));
            if (apiKeyInput && existingConfig.apiKey) apiKeyInput.value = existingConfig.apiKey;
            if (baseUrlInput && existingConfig.baseUrl) baseUrlInput.value = existingConfig.baseUrl;
        }

        // 确认按钮
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const provider = providerSelect ? providerSelect.value : 'custom';
                const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
                const baseUrl = baseUrlInput ? baseUrlInput.value.trim() : '';
                const model = modelSelect ? modelSelect.value : '';

                if (!apiKey && provider !== 'custom') {
                    this.showToast('请输入 API Key', 'warning');
                    return;
                }

                try {
                    aiService.configure({ provider, apiKey, baseUrl, model });
                    this.showToast('AI 服务配置成功', 'success');
                    this.navigateTo('page-system-select');
                } catch (err) {
                    this.showToast('配置失败: ' + err.message, 'error');
                }
            };
        }

        // 跳过按钮（本地模式）
        if (skipBtn) {
            skipBtn.onclick = () => {
                this.showToast('已进入本地模式', 'info');
                this.navigateTo('page-system-select');
            };
        }
    }

    // ────────────────────────────────────────────────────────
    // 系统选择页
    // ────────────────────────────────────────────────────────

    _initSystemSelectPage() {
        const page = this.pages['page-system-select'];
        if (!page) return;

        const grid = page.querySelector('#system-grid');
        const confirmBtn = page.querySelector('#btn-system-confirm');
        const customBtn = page.querySelector('#btn-custom-system');
        const importBtn = page.querySelector('#btn-import-share');

        this._selectedSystemId = null;
        if (confirmBtn) confirmBtn.disabled = true;

        // 渲染系统卡片
        if (grid) {
            grid.innerHTML = '';

            const presets = systemManager.getPresetSystems();
            const customs = systemManager.getCustomSystems ? systemManager.getCustomSystems() : [];
            const allSystems = [...presets, ...customs];

            allSystems.forEach(sys => {
                const card = _createElement('div', 'system-card');
                card.dataset.systemId = sys.id;
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', `选择系统 ${sys.name}`);
                card.innerHTML = `
                    <div class="system-card-emoji">${sys.emoji || '🎮'}</div>
                    <div class="system-card-name">${_escapeHtml(sys.name)}</div>
                    <div class="system-card-grade">${_renderStars(sys.grade || 0)}</div>
                    <div class="system-card-desc">${_escapeHtml(sys.description || '')}</div>
                `;
                const activateCard = () => {
                    // 清除其他选中状态
                    grid.querySelectorAll('.system-card').forEach(c => c.classList.remove('selected', 'glow'));
                    card.classList.add('selected', 'glow');
                    this._selectedSystemId = sys.id;
                    if (confirmBtn) confirmBtn.disabled = false;
                };
                card.onclick = activateCard;
                card.onkeydown = (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        activateCard();
                    }
                };
                grid.appendChild(card);
            });
        }

        // 自定义系统按钮
        if (customBtn) {
            customBtn.onclick = () => this._openSystemEditor();
        }

        // 导入分享码按钮
        if (importBtn) {
            importBtn.onclick = () => {
                const code = prompt('请输入分享码:');
                if (!code || !code.trim()) return;
                try {
                    const result = systemManager.importShareCode(code.trim());
                    if (result) {
                        this.showToast('系统导入成功', 'success');
                        this._initSystemSelectPage();
                    }
                } catch (err) {
                    this.showToast('导入失败: ' + err.message, 'error');
                }
            };
        }

        // 确认选择按钮
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (!this._selectedSystemId) {
                    this.showToast('请先选择一个系统', 'warning');
                    return;
                }
                try {
                    const system = systemManager.activateSystem(this._selectedSystemId);
                    if (system) {
                        gameEngine.setSystem(system);
                        // 切换主题
                        if (system.theme) this.setTheme(system.theme);
                        this.showToast(`已激活「${system.name}」`, 'success');
                    }
                    this.navigateTo('page-talent-draw');
                } catch (err) {
                    this.showToast('系统激活失败: ' + err.message, 'error');
                }
            };
        }
    }

    // ────────────────────────────────────────────────────────
    // 天赋抽取页
    // ────────────────────────────────────────────────────────

    _initTalentDrawPage() {
        const page = this.pages['page-talent-draw'];
        if (!page) return;

        const drawBtn = page.querySelector('#btn-draw-talents');
        const redrawBtn = page.querySelector('#btn-redraw');
        const talentGrid = page.querySelector('#talent-grid');
        const confirmBtn = page.querySelector('#btn-talent-confirm');
        const countDisplay = page.querySelector('#talent-select-count');

        this._drawnTalents = [];
        this._selectedTalentIds = new Set();
        this._talentRedrawsLeft = 2;
        if (drawBtn) drawBtn.style.display = '';
        if (redrawBtn) {
            redrawBtn.style.display = 'none';
            redrawBtn.disabled = false;
            redrawBtn.textContent = `🔄 重新抽取（${this._talentRedrawsLeft}）`;
        }
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.display = '';
        }

        // 清空已有内容
        if (talentGrid) talentGrid.innerHTML = '';
        if (countDisplay) countDisplay.textContent = '已选择 0/3';
        if (confirmBtn) confirmBtn.disabled = true;

        const performDraw = async () => {
                // Bug #3: 尝试 AI 生成天赋（基于系统类型的网文风格天赋）
                let aiTalents = null;
                const activeSystem = systemManager.getActiveSystem();
                if (aiService.isConfigured && aiService.isConfigured() && activeSystem) {
                    try {
                        drawBtn && (drawBtn.textContent = '🎲 天命降临中...');
                        drawBtn && (drawBtn.disabled = true);
                        aiTalents = await this._generateAITalents(activeSystem);
                    } catch (err) {
                        console.warn('AI 天赋生成失败，使用默认天赋池：', err.message);
                    }
                }

                try {
                    if (aiTalents && aiTalents.length >= 10) {
                        this._drawnTalents = aiTalents.slice(0, 10);
                    } else {
                        this._drawnTalents = gameEngine.drawTalents(10);
                    }
                } catch (err) {
                    this.showToast('天赋抽取失败: ' + err.message, 'error');
                    if (drawBtn) { drawBtn.textContent = '🎲 十连抽！'; drawBtn.disabled = false; }
                    return;
                }

                    this._selectedTalentIds = new Set();
                    if (countDisplay) countDisplay.textContent = '已选择 0/3';
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.style.display = '';
                }

                // 渲染天赋卡片
                    if (talentGrid) {
                        talentGrid.innerHTML = '';
                        this._drawnTalents.forEach((talent, index) => {
                            const grade = talent.grade || 0;
                            const card = _createElement('div', `talent-card ${GRADE_CLASS[grade] || ''}`);
                            card.dataset.talentId = talent.id;
                            card.tabIndex = 0;
                            card.setAttribute('role', 'button');
                            card.setAttribute('aria-label', `选择天赋 ${talent.name}`);
                            card.style.borderColor = GRADE_BORDER[grade] || '#b0b0b0';

                        // 高品质添加闪光效果
                        if (grade >= 3) card.classList.add('sparkle');
                        if (grade >= 4) card.classList.add('sparkle-animated');

                        card.innerHTML = `
                            <div class="talent-card-name">${_escapeHtml(talent.name)}</div>
                            <div class="talent-card-desc">${_escapeHtml(talent.description || '')}</div>
                            <div class="talent-card-grade" style="color:${GRADE_BORDER[grade]}">${_renderStars(grade)}</div>
                        `;

                        // 翻牌动画延时
                        card.style.animationDelay = `${index * 0.1}s`;
                        card.classList.add('card-flip');

                        // 点击选择
                            const toggleTalent = () => this._toggleTalent(card, talent, countDisplay, confirmBtn);
                            card.onclick = toggleTalent;
                            card.onkeydown = (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    toggleTalent();
                                }
                            };

                            talentGrid.appendChild(card);
                        });
                    }

                    // 隐藏抽取按钮
                    if (drawBtn) drawBtn.style.display = 'none';
                    if (redrawBtn) {
                        redrawBtn.style.display = this._talentRedrawsLeft > 0 ? '' : 'none';
                        redrawBtn.textContent = `🔄 重新抽取（${this._talentRedrawsLeft}）`;
                    }
                    this.showToast('天赋已揭晓！请选择最多3个天赋', 'info');
                    // v3.0 Rarity announcement
                    const maxGrade = Math.max(...this._drawnTalents.map(t => t.grade || 0));
                    if (maxGrade >= 3) {
                        const gradeNames = { 3: '史诗天赋', 4: '传说天赋' };
                        const announce = _createElement('div', 'rarity-announce', `✨ 获得${gradeNames[maxGrade] || '稀有天赋'}！✨`);
                        document.body.appendChild(announce);
                        setTimeout(() => announce.remove(), 1500);
                    }
                };

        // 十连抽按钮
        if (drawBtn) {
            drawBtn.onclick = performDraw;
        }

        if (redrawBtn) {
            redrawBtn.onclick = () => {
                if (this._talentRedrawsLeft <= 0) return;
                this._talentRedrawsLeft -= 1;
                performDraw();
                redrawBtn.textContent = `🔄 重新抽取（${this._talentRedrawsLeft}）`;
                if (this._talentRedrawsLeft <= 0) {
                    redrawBtn.style.display = 'none';
                }
            };
        }

        // 确认天赋按钮
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (this._selectedTalentIds.size === 0) {
                    this.showToast('请至少选择一个天赋', 'warning');
                    return;
                }
                try {
                    gameEngine.selectTalents(Array.from(this._selectedTalentIds));
                    this.showToast('天赋已确认', 'success');
                    this.navigateTo('page-property-allocate');
                } catch (err) {
                    this.showToast('天赋选择失败: ' + err.message, 'error');
                }
            };
        }
    }

    /** 切换天赋选中状态 */
    _toggleTalent(card, talent, countDisplay, confirmBtn) {
        const id = talent.id;
        if (this._selectedTalentIds.has(id)) {
            // 取消选中
            this._selectedTalentIds.delete(id);
            card.classList.remove('selected');
        } else {
            // 最多选3个
            if (this._selectedTalentIds.size >= 3) {
                this.showToast('最多只能选择3个天赋', 'warning');
                return;
            }
            this._selectedTalentIds.add(id);
            card.classList.add('selected');
        }

        const count = this._selectedTalentIds.size;
        if (countDisplay) countDisplay.textContent = `已选择 ${count}/3`;
        if (confirmBtn) confirmBtn.disabled = (count === 0);
    }

    /**
     * Bug #3: AI 生成天赋（基于系统类型的网文小说风格）
     * 只在有 AI 服务时调用，否则使用默认天赋池
     */
    async _generateAITalents(activeSystem) {
        const systemName = activeSystem.name || '伴生系统';
        const systemId = activeSystem.id || 'default';
        const systemDesc = activeSystem.description || '';

        const systemStyleMap = {
            cultivation: '修仙/修真小说',
            tycoon: '商战/都市大亨小说',
            villain: '反派系统/反派崛起小说',
            checkin: '签到系统/日常签到小说',
            signin: '签到系统/每日签到小说',
            apocalypse: '末世/末日求生小说',
            cthulhu: '克苏鲁/恐怖小说',
        };
        const novelStyle = systemStyleMap[systemId] || `${systemName}类型的网文小说`;

        const prompt = [
            { role: 'system', content: `你是一个网文小说天赋生成器。请根据"${novelStyle}"风格，生成10个天赋。
要求：
1. 每个天赋包含 name(名称), description(描述), grade(品级0-4), effect(属性效果对象)
2. 品级分布：4个grade0(普通), 3个grade1(优秀), 2个grade2(稀有), 1个grade3(史诗)
3. 天赋名称要符合${novelStyle}的风格和世界观
4. effect 是一个对象，键是属性名(CHR/INT/STR/MNY/SPR)，值是整数加成
5. 直接返回 JSON 数组，不要多余解释
6. description 简短描述效果，比如"智力+3"

系统描述：${systemDesc}` },
            { role: 'user', content: `请生成10个符合"${novelStyle}"风格的天赋，直接返回JSON数组。` }
        ];

        const reply = await aiService.chat(prompt, { temperature: 0.9, max_tokens: 1200 });

        // 解析 AI 返回的 JSON
        let talents;
        try {
            // 尝试提取 JSON 数组
            const jsonMatch = reply.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                talents = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('未找到 JSON 数组');
            }
        } catch (e) {
            throw new Error('AI 天赋解析失败: ' + e.message);
        }

        // 验证和规范化
        if (!Array.isArray(talents) || talents.length < 10) {
            throw new Error('AI 生成天赋数量不足');
        }

        return talents.slice(0, 10).map((t, idx) => ({
            id: 9000 + idx,
            name: String(t.name || `天赋${idx + 1}`).substring(0, 12),
            description: String(t.description || '').substring(0, 50),
            grade: Math.min(4, Math.max(0, parseInt(t.grade) || 0)),
            effect: (t.effect && typeof t.effect === 'object') ? t.effect : {},
        }));
    }

    // ────────────────────────────────────────────────────────
    // 属性分配页
    // ────────────────────────────────────────────────────────

    _initPropertyAllocatePage() {
        const page = this.pages['page-property-allocate'];
        if (!page) return;

        const container = page.querySelector('#property-controls');
        const remainDisplay = page.querySelector('#remaining-points');
        const confirmBtn = page.querySelector('#btn-property-confirm');
        const recommendBtn = page.querySelector('#btn-property-recommend');
        const randomBtn = page.querySelector('#btn-property-random');
        const resetBtn = page.querySelector('#btn-property-reset');
        const customStatsPanel = page.querySelector('#dynamic-stats-panel');
        const customStatsArea = page.querySelector('#custom-stats-area');

        // 初始化分配值
        const totalPoints = gameEngine.getPropertyPoints();
        this._allocation = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };

        const updateRemaining = () => {
            const used = Object.values(this._allocation).reduce((s, v) => s + v, 0);
            const remain = totalPoints - used;
            if (remainDisplay) remainDisplay.textContent = `剩余点数: ${remain}`;
            return remain;
        };

        const renderAllocation = () => {
            Object.keys(this._allocation).forEach((key) => this._updatePropertyDisplay(key));
            updateRemaining();
        };

        const resetAllocation = () => {
            this._allocation = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };
            renderAllocation();
        };

        // 渲染属性控制条
        if (container) {
            container.innerHTML = '';
            for (const [key, config] of Object.entries(PROPERTIES)) {
                const row = _createElement('div', 'property-row');
                row.innerHTML = `
                    <span class="property-label">${config.icon} ${config.name}</span>
                    <button class="btn-minus" data-prop="${key}">−</button>
                    <span class="property-value" id="prop-val-${key}">0</span>
                    <button class="btn-plus" data-prop="${key}">+</button>
                    <div class="property-bar-track">
                        <div class="property-bar-fill" id="prop-bar-${key}" style="width:0%;background:${config.color}"></div>
                    </div>
                `;
                container.appendChild(row);

                // 减少按钮
                row.querySelector('.btn-minus').onclick = () => {
                    if (this._allocation[key] <= 0) return;
                    this._allocation[key]--;
                    this._updatePropertyDisplay(key);
                    updateRemaining();
                };

                // 增加按钮
                row.querySelector('.btn-plus').onclick = () => {
                    if (this._allocation[key] >= 10) {
                        this.showToast('单项属性不能超过10', 'warning');
                        return;
                    }
                    if (updateRemaining() <= 0) {
                        this.showToast('没有剩余点数了', 'warning');
                        return;
                    }
                    this._allocation[key]++;
                    this._updatePropertyDisplay(key);
                    updateRemaining();
                };
            }
        }

        // 系统自定义属性展示
        if (customStatsArea) {
            const activeSystem = systemManager.getActiveSystem();
            if (activeSystem && activeSystem.customStats && activeSystem.customStats.length > 0) {
                customStatsArea.innerHTML = '';
                activeSystem.customStats.forEach(stat => {
                    const div = _createElement('div', 'custom-stat-row',
                        `<span>${_escapeHtml(stat.name || stat.label)}</span>: <span>${stat.initial || 0}</span>`
                    );
                    customStatsArea.appendChild(div);
                });
                if (customStatsPanel) customStatsPanel.style.display = 'block';
            } else {
                if (customStatsPanel) customStatsPanel.style.display = 'none';
            }
        }

        renderAllocation();

        if (recommendBtn) {
            recommendBtn.onclick = () => {
                const activeSystem = systemManager.getActiveSystem();
                const weights = activeSystem?.weights || {};
                const weightEntries = Object.keys(PROPERTIES).map((key) => [key, Math.max(1, weights[key] || 1)]);
                const weightSum = weightEntries.reduce((sum, [, weight]) => sum + weight, 0);

                resetAllocation();

                let remaining = totalPoints;
                weightEntries.forEach(([key, weight], index) => {
                    const suggested = index === weightEntries.length - 1
                        ? remaining
                        : Math.min(10, Math.floor((totalPoints * weight) / weightSum));
                    this._allocation[key] = Math.min(10, suggested);
                    remaining -= this._allocation[key];
                });

                const sortedKeys = [...weightEntries].sort((a, b) => b[1] - a[1]).map(([key]) => key);
                let cursor = 0;
                while (remaining > 0) {
                    const key = sortedKeys[cursor % sortedKeys.length];
                    if (this._allocation[key] < 10) {
                        this._allocation[key] += 1;
                        remaining -= 1;
                    }
                    cursor += 1;
                }

                renderAllocation();
                this.showToast('已按当前系统推荐完成分配', 'success');
            };
        }

        if (randomBtn) {
            randomBtn.onclick = () => {
                resetAllocation();
                let remaining = totalPoints;
                const keys = Object.keys(PROPERTIES);
                while (remaining > 0) {
                    const key = keys[Math.floor(Math.random() * keys.length)];
                    if (this._allocation[key] >= 10) continue;
                    this._allocation[key] += 1;
                    remaining -= 1;
                }
                renderAllocation();
                this.showToast('已随机完成分配', 'info');
            };
        }

        if (resetBtn) {
            resetBtn.onclick = () => {
                resetAllocation();
                this.showToast('已重置属性分配', 'info');
            };
        }

        // 确认按钮
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                try {
                    // 逐个设置属性
                    for (const [key, val] of Object.entries(this._allocation)) {
                        gameEngine.allocateProperty(key, val);
                    }
                    gameEngine.confirmAllocation();
                    this.showToast('属性分配完成，人生即将开始！', 'success');
                    this.navigateTo('page-life-simulation');
                    this._persistProgress();
                } catch (err) {
                    this.showToast('属性确认失败: ' + err.message, 'error');
                }
            };
        }
    }

    /** 更新单个属性的显示 */
    _updatePropertyDisplay(key) {
        const valEl = _$(`#prop-val-${key}`);
        const barEl = _$(`#prop-bar-${key}`);
        const val = this._allocation[key] || 0;
        if (valEl) valEl.textContent = val;
        if (barEl) barEl.style.width = `${val * 10}%`;
    }

    // ────────────────────────────────────────────────────────
    // 人生模拟页
    // ────────────────────────────────────────────────────────

    _initLifeSimulationPage() {
        const page = this.pages['page-life-simulation'];
        if (!page) return;

        const nextYearBtn = page.querySelector('#btn-next-year');
        const chatBtn = page.querySelector('#btn-open-chat');
        const saveBtn = page.querySelector('#btn-save-game');
        const closeTaskBtn = page.querySelector('#btn-task-close');

        // 初始化底部 Tab 导航
        this._initSimTabs(page);

        if (gameEngine.getPhase() !== 'living' && gameEngine.getCurrentAge() < 0) {
            try {
                gameEngine.startLife();
            } catch (_) {
                /* 可能已经启动 */
            }
        }

        this._updateSimulationUI();

        if (nextYearBtn) {
            nextYearBtn.onclick = async () => {
                nextYearBtn.disabled = true;
                nextYearBtn.textContent = '模拟中...';

                try {
                    const result = await gameEngine.nextYear();
                    this._appendYearRecord(result);
                    this._updateSimulationUI();
                    this._persistProgress();

                    // 处理任务系统（Bug #6）
                    if (result.task) {
                        this._showTaskOverlay(result.task);
                    }

                    // 更新任务面板
                    this._updateQuestPanel();

                    if (result.isEnd) {
                        nextYearBtn.style.display = 'none';
                        setTimeout(() => {
                            this.navigateTo('page-life-summary');
                        }, 1200);
                    }
                } catch (err) {
                    this.showToast('模拟出错: ' + err.message, 'error');
                } finally {
                    nextYearBtn.disabled = false;
                    nextYearBtn.textContent = '⏭️ 下一年';
                }
            };
        }

        if (chatBtn) {
            chatBtn.onclick = () => this.navigateTo('page-chat');
        }

        // v3.0 Fast forward
        const ffBtn = page.querySelector('#btn-fast-forward');
        if (ffBtn) {
            this._fastForwardActive = false;
            ffBtn.onclick = () => {
                this._fastForwardActive = !this._fastForwardActive;
                ffBtn.classList.toggle('active', this._fastForwardActive);
                if (this._fastForwardActive) {
                    this._runFastForward(nextYearBtn);
                }
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => {
                if (this._persistProgress({ manual: true })) {
                    this.showToast('已保存当前人生进度', 'success');
                } else {
                    this.showToast('保存失败，请稍后重试', 'error');
                }
            };
        }

        if (closeTaskBtn) {
            closeTaskBtn.onclick = () => this._hideTaskOverlay();
        }
    }

    /** 初始化模拟页底部 Tab 切换 */
    _initSimTabs(page) {
        const tabBtns = page.querySelectorAll('.sim-tab-btn');
        const tabPanels = page.querySelectorAll('.sim-tab-panel');

        tabBtns.forEach(btn => {
            btn.onclick = () => {
                const targetId = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const target = page.querySelector(`#${targetId}`);
                if (target) target.classList.add('active');

                // 更新对应面板内容
                if (targetId === 'tab-tasks') this._updateQuestPanel();
                if (targetId === 'tab-inventory' || targetId === 'tab-relations') this._renderWorldPanels();
            };
        });
    }

    /** 更新任务/主线/支线面板（Bug #6） */
    _updateQuestPanel() {
        const page = this.pages['page-life-simulation'];
        if (!page) return;
        const questList = page.querySelector('#quest-list');
        const taskSummary = page.querySelector('#current-task-summary');
        if (!questList) return;

        const quests = gameEngine.getQuests ? gameEngine.getQuests() : [];
        const world = gameEngine.getWorldPanels();

        // 当前动态任务
        if (taskSummary) {
            const task = world.currentTask;
            taskSummary.innerHTML = task
                ? `<strong>${_escapeHtml(task.title || '系统任务')}</strong><span>${_escapeHtml(task.description || '')}</span>`
                : '暂无进行中的任务';
        }

        // 渲染任务列表
        questList.innerHTML = '';
        if (quests.length === 0) {
            questList.innerHTML = '<p class="muted-text" style="font-size:0.85rem;">暂无活跃任务，继续推进人生吧！</p>';
            return;
        }
        quests.forEach(quest => {
            const isComplete = quest.status === 'completed';
            const isMain = quest.type === 'main';
            const card = _createElement('div', `quest-card ${isMain ? 'quest-main' : 'quest-side'} ${isComplete ? 'quest-completed' : ''}`);
            const progress = quest.progress || 0;
            const target = quest.target || 1;
            const pct = Math.min(100, Math.round((progress / target) * 100));
            card.innerHTML = `
                <div class="quest-card-header">
                    <span class="quest-card-title">${_escapeHtml(quest.title)}</span>
                    <span class="quest-card-type ${isMain ? '' : 'side'}">${isMain ? '主线' : '支线'}</span>
                </div>
                <div class="quest-card-desc">${_escapeHtml(quest.description)}</div>
                <div class="quest-card-progress">
                    <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
                    <span>${isComplete ? '✅ 已完成' : `${pct}%`}</span>
                </div>
                ${quest.reward ? `<div class="quest-reward">🏆 ${_escapeHtml(quest.reward)}</div>` : ''}
            `;
            questList.appendChild(card);
        });
    }

    _updateSimulationUI() {
        const page = this.pages['page-life-simulation'];
        if (!page) return;

        const ageBadge = page.querySelector('#age-badge');
        const systemEmoji = page.querySelector('#system-emoji');
        const systemName = page.querySelector('#system-name');
        const statsInline = page.querySelector('#stats-inline');
        const customStatsInline = page.querySelector('#sim-custom-stats-inline');
        const eventLog = page.querySelector('#event-log');
        const nextYearBtn = page.querySelector('#btn-next-year');

        const activeSystem = systemManager.getActiveSystem() || (this._selectedSystemId ? systemManager.getSystem(this._selectedSystemId) : null);
        if (systemName && activeSystem) systemName.textContent = activeSystem.name;
        if (systemEmoji && activeSystem) systemEmoji.textContent = activeSystem.emoji || '🎮';
        if (ageBadge) ageBadge.textContent = `${Math.max(0, gameEngine.getCurrentAge())}`;

        // Bug #2: 紧凑内联属性显示
        this._renderStatsInline(statsInline);
        this._renderCustomStatsInline(customStatsInline);
        this._renderWorldPanels();

        if (eventLog) {
            eventLog.innerHTML = '';
            gameEngine.getLifeEvents().forEach(record => this._appendYearRecord(record, { rerendering: true }));
        }

        if (nextYearBtn) {
            nextYearBtn.style.display = gameEngine.isAlive() ? '' : 'none';
        }
    }

    _renderWorldPanels() {
        const page = this.pages['page-life-simulation'];
        if (!page) return;

        // Bug #4: 元素现在在 tab 面板里
        const inventorySummary = page.querySelector('#inventory-summary');
        const relationshipSummary = page.querySelector('#relationship-summary');
        const world = gameEngine.getWorldPanels();

        if (inventorySummary) {
            const items = world.inventory || [];
            if (!items.length) {
                inventorySummary.textContent = '尚未获得关键物品';
            } else {
                const itemIcons = { common: '📦', rare: '💎', epic: '🌟', legendary: '👑' };
                const groups = {};
                items.forEach(item => {
                    const r = item.rarity || 'common';
                    if (!groups[r]) groups[r] = [];
                    groups[r].push(item);
                });
                const rarityOrder = ['legendary', 'epic', 'rare', 'common'];
                const rarityLabels = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
                inventorySummary.innerHTML = `<div class="inventory-categories">${
                    rarityOrder.filter(r => groups[r]).map(r => `<div class="inv-category"><div class="inv-category-title">${itemIcons[r] || '📦'} ${rarityLabels[r] || r}</div><div class="inv-items">${
                        groups[r].map(item => `<span class="inv-item rarity-${r}"><span class="item-icon">${itemIcons[r] || '📦'}</span>${_escapeHtml(item.name)}</span>`).join('')
                    }</div></div>`).join('')
                }</div>`;
            }
        }

        if (relationshipSummary) {
            const relations = world.relationships || [];
            if (!relations.length) {
                relationshipSummary.textContent = '你的人生故事还没有重要人物登场';
            } else {
                const avatarEmojis = ['👨', '👩', '👴', '👵', '🧑', '👦', '👧', '🧔', '👱', '🤵'];
                relationshipSummary.innerHTML = `<div class="relation-cards">${relations.map((rel, i) => {
                    const att = Math.max(0, Math.min(100, (rel.attitude ?? 0)));
                    const avatar = avatarEmojis[i % avatarEmojis.length];
                    return `<div class="relation-card">
                        <span class="relation-avatar">${avatar}</span>
                        <div class="relation-info">
                            <div class="relation-name">${_escapeHtml(rel.name)}</div>
                            <div class="relation-affinity">
                                <div class="affinity-bar"><div class="affinity-fill" style="width:${att}%"></div></div>
                                <span class="affinity-val">${att}</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}</div>`;
            }
        }
    }

    _appendYearRecord(result, options = {}) {
        const { rerendering = false } = options;
        const page = this.pages['page-life-simulation'];
        const eventLog = page?.querySelector('#event-log');
        if (!eventLog || !result) return;

        // Bug #1: 可折叠的年度面板
        const yearBlock = _createElement('div', 'year-block');

        // v3.0 Year block mood coloring
        const hasMilestone = (result.events || []).some(e => e.type === 'milestone');
        const hasNegative = (result.events || []).some(e => e.type === 'death' || e.type === 'aging');
        const hasPositive = (result.events || []).some(e => e.importance >= 3 && e.type !== 'death');
        if (hasMilestone) yearBlock.setAttribute('data-mood', 'milestone');
        else if (hasNegative) yearBlock.setAttribute('data-mood', 'negative');
        else if (hasPositive) yearBlock.setAttribute('data-mood', 'positive');

        // 生成预览文本（第一个事件的简短描述）
        const firstEvent = (result.events || [])[0];
        const previewText = firstEvent ? (firstEvent.text || String(firstEvent)).substring(0, 40) : '平静的一年';

        // 年份标题栏（可点击折叠）
        const header = _createElement('div', 'year-block-header');
        header.innerHTML = `
            <span class="age-tag">${result.age} 岁</span>
            <span class="year-preview">${_escapeHtml(previewText)}${previewText.length > 40 ? '...' : ''}</span>
            <span class="year-toggle">▼</span>
        `;
        yearBlock.appendChild(header);

        // 年份详情（默认折叠，最新几年展开）
        const body = _createElement('div', 'year-block-body');

        (result.events || []).forEach(evt => {
            const evtEl = _createElement('div', `event-item event-${evt.type || 'normal'}`, _escapeHtml(evt.text || evt));
            body.appendChild(evtEl);
        });

        if (result.systemMessage) {
            body.appendChild(_createElement('div', 'event-item event-system', `【系统】${_escapeHtml(result.systemMessage)}`));
        }

        if (result.choices && result.choices.length > 0) {
            const choiceDiv = _createElement('div', 'choice-container');
            result.choices.forEach(choice => {
                const btn = _createElement('button', 'btn-choice', _escapeHtml(choice.text));
                btn.onclick = async () => {
                    choiceDiv.querySelectorAll('.btn-choice').forEach(b => b.disabled = true);
                    btn.classList.add('selected');
                    if (choice.callback) {
                        const choiceResult = await choice.callback();
                        if (choiceResult?.result) {
                            body.appendChild(_createElement('div', 'event-item event-choice-result', _escapeHtml(choiceResult.result)));
                        }
                        this._updateSimulationUI();
                        this._persistProgress();
                    }
                };
                choiceDiv.appendChild(btn);
            });
            body.appendChild(choiceDiv);
        }

        // v3.0 Random encounter display
        if (result.encounter && !rerendering) {
            const enc = result.encounter;
            const encDiv = _createElement('div', 'encounter-inline');
            encDiv.innerHTML = `<div class="event-item event-special"><strong>${_escapeHtml(enc.title)}</strong> ${_escapeHtml(enc.description)}</div>`;
            const encChoices = _createElement('div', 'choice-container');
            (enc.choices || []).forEach(choice => {
                const btn = _createElement('button', 'btn-choice', _escapeHtml(choice.text));
                btn.onclick = () => {
                    encChoices.querySelectorAll('.btn-choice').forEach(b => b.disabled = true);
                    btn.classList.add('selected');
                    if (choice.effect) {
                        for (const [k, v] of Object.entries(choice.effect)) {
                            gameEngine.applyExternalEffects({ [k]: v }, { source: '随机事件' });
                        }
                    }
                    body.appendChild(_createElement('div', 'event-item event-choice-result', _escapeHtml(choice.result)));
                    this._updateSimulationUI();
                    this._persistProgress();
                };
                encChoices.appendChild(btn);
            });
            body.appendChild(encDiv);
            body.appendChild(encChoices);
        }

        if (result.propertyChanges) {
            const customStatMap = new Map(gameEngine.getCustomStats().map((stat) => [stat.id, stat]));
            const changesText = Object.entries(result.propertyChanges)
                .filter(([, v]) => v !== 0)
                .map(([k, v]) => {
                    const prop = PROPERTIES[k];
                    const customStat = customStatMap.get(k);
                    const sign = v > 0 ? '+' : '';
                    if (prop) {
                        return `${prop.icon} ${sign}${v}`;
                    }
                    return `${customStat?.icon || '✨'} ${customStat?.name || k} ${sign}${v}`;
                })
                .join('  ');
            if (changesText) {
                body.appendChild(_createElement('div', 'property-change-hint', changesText));
            }
        }

        if (result.isEnd) {
            const deathOverlay = _createElement('div', 'death-overlay');
            deathOverlay.innerHTML = `
                    <div class="death-content">
                        <div class="death-icon">💀</div>
                        <div class="death-text">${_escapeHtml(getDeathReasonText(result.deathReason) || '你的一生结束了')}</div>
                    </div>
                `;
            body.appendChild(deathOverlay);
        }

        yearBlock.appendChild(body);

        // 点击标题栏切换展开/折叠
        header.onclick = () => {
            yearBlock.classList.toggle('expanded');
        };

        eventLog.appendChild(yearBlock);

        // 自动展开最新的记录，折叠旧的
        if (!rerendering) {
            yearBlock.classList.add('expanded');
            // 折叠旧的年份块（只保留最近3个展开）
            const allBlocks = eventLog.querySelectorAll('.year-block');
            if (allBlocks.length > 3) {
                for (let i = 0; i < allBlocks.length - 3; i++) {
                    allBlocks[i].classList.remove('expanded');
                }
            }
            requestAnimationFrame(() => {
                eventLog.scrollTo({ top: eventLog.scrollHeight, behavior: 'smooth' });
            });
        } else {
            // 重新渲染时：展开最近3个，折叠其余
            const allBlocks = eventLog.querySelectorAll('.year-block');
            const total = allBlocks.length;
            if (total > 3) {
                // 计算当前索引
                const idx = Array.from(allBlocks).indexOf(yearBlock);
                if (idx >= total - 3) {
                    yearBlock.classList.add('expanded');
                }
            } else {
                yearBlock.classList.add('expanded');
            }
        }
    }

    _showTaskOverlay(task) {
        const overlay = this.pages['page-life-simulation']?.querySelector('#task-overlay');
        if (!overlay || !task) return;
        const title = overlay.querySelector('#task-title');
        const desc = overlay.querySelector('#task-description');
        const choices = overlay.querySelector('#task-choices');
        if (title) title.textContent = task.title || '系统任务';
        if (desc) desc.textContent = task.description || '';
        if (choices) {
            choices.innerHTML = '';
            (task.choices || []).forEach(choice => {
                const btn = _createElement('button', 'btn btn-task-choice', _escapeHtml(choice.text));
                btn.onclick = async () => {
                    choices.querySelectorAll('button').forEach(b => b.disabled = true);
                    const result = choice.callback ? await choice.callback() : null;
                    this._hideTaskOverlay();
                    if (result?.result) {
                        this.showToast(result.result, 'success');
                    }
                    this._updateSimulationUI();
                    this._persistProgress();
                };
                choices.appendChild(btn);
            });
        }
        overlay.style.display = 'flex';
    }

    _hideTaskOverlay() {
        const overlay = this.pages['page-life-simulation']?.querySelector('#task-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    /** Bug #2: 紧凑内联属性显示（替代进度条） */
    _renderStatsInline(container) {
        if (!container) return;
        const props = gameEngine.getProperties();
        container.innerHTML = '';
        for (const [key, config] of Object.entries(PROPERTIES)) {
            const val = props[key] || 0;
            const chip = _createElement('span', 'stat-chip', `
                <span class="stat-icon">${config.icon}</span>
                <span class="stat-val">${_formatNumber(val)}</span>
            `);
            container.appendChild(chip);
        }
    }

    /** Bug #2: 紧凑内联系统自定义属性显示 */
    _renderCustomStatsInline(container) {
        if (!container) return;
        const customStats = gameEngine.getCustomStats();
        if (!customStats || customStats.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = '';
        customStats.forEach(stat => {
            const val = stat.current !== undefined ? stat.current : (stat.initial || 0);
            const chip = _createElement('span', 'stat-chip', `
                <span class="stat-icon">${_escapeHtml(stat.icon || '✨')}</span>
                <span style="font-size:0.68rem;">${_escapeHtml(stat.name || stat.label)}</span>
                <span class="stat-val">${_formatNumber(val)}</span>
            `);
            container.appendChild(chip);
        });
    }

    // ────────────────────────────────────────────────────────
    // 聊天覆盖层
    // ────────────────────────────────────────────────────────

    _initChatPage() {
        const page = this.pages['page-chat'];
        if (!page) return;

        const msgContainer = page.querySelector('#chat-messages');
        const inputField = page.querySelector('#chat-input');
        const sendBtn = page.querySelector('#btn-chat-send');
        const closeBtn = page.querySelector('#btn-chat-close');
        const typingIndicator = page.querySelector('#typing-indicator');
        const quickCmds = page.querySelector('#quick-commands');

        // Bug #5: 始终设置 AI 服务（无论是否已配置，chatTerminal 内部会降级）
        chatTerminal.setAIService(aiService);

        // v3.0 Update chat avatar
        const activeSystem = systemManager.getActiveSystem();
        const chatAvatar = page.querySelector('#chat-system-avatar');
        if (chatAvatar && activeSystem) {
            chatAvatar.textContent = activeSystem.emoji || '🤖';
        }

        // 设置系统人格（如果有活跃系统）
        if (activeSystem && !chatTerminal.systemPersonality) {
            chatTerminal.setPersonality({
                tone: activeSystem.tone || 'cheerful',
                greeting: activeSystem.greeting || `【${activeSystem.name}】已上线，有什么想和我说的？`,
                systemPrompt: activeSystem.systemPrompt || `你是${activeSystem.name}的伴生系统AI。${activeSystem.personality || ''}`,
            });
        }

        chatTerminal.setGameStateProvider(() => ({
            age: gameEngine.getCurrentAge(),
            properties: gameEngine.getProperties(),
            customStats: gameEngine.getCustomStats(),
            alive: gameEngine.isAlive(),
            systemName: systemManager.getActiveSystem()?.name || gameEngine.getState().system?.name,
            talents: gameEngine.getSelectedTalents(),
            memories: memoryEngine.getRecentEvents ? memoryEngine.getRecentEvents(8) : [],
        }));

        // 渲染已有消息
        if (msgContainer) {
            msgContainer.innerHTML = '';
            const messages = chatTerminal.getMessages();
            messages.forEach(msg => this._renderChatMessage(msgContainer, msg));
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        // 消息回调
        chatTerminal.onMessage = (msg) => {
            if (msgContainer) {
                this._renderChatMessage(msgContainer, msg);
                msgContainer.scrollTop = msgContainer.scrollHeight;
            }
        };

        // 打字状态回调
        chatTerminal.onTypingChange = (typing) => {
            if (typingIndicator) {
                typingIndicator.style.display = typing ? 'block' : 'none';
            }
        };

        // 属性变化回调
        chatTerminal.onPropertyChange = (effects) => {
            const applied = gameEngine.applyExternalEffects(effects, { source: '系统对话' });
            this._updateSimulationUI();
            this._persistProgress();

            // 显示效果提示
            if (applied && typeof applied === 'object') {
                const customStatMap = new Map(gameEngine.getCustomStats().map((stat) => [stat.id, stat]));
                const parts = Object.entries(applied)
                    .filter(([, v]) => v !== 0)
                    .map(([k, v]) => {
                        const p = PROPERTIES[k];
                        const customStat = customStatMap.get(k);
                        if (p) {
                            return `${p.icon} ${v > 0 ? '+' : ''}${v}`;
                        }
                        return `${customStat?.icon || '✨'}${customStat?.name || k} ${v > 0 ? '+' : ''}${v}`;
                    });
                if (parts.length > 0) {
                    this.showToast(`属性变化: ${parts.join(' ')}`, 'info');
                }
            }
        };

        // 发送消息
        const doSend = async () => {
            const text = inputField ? inputField.value.trim() : '';
            if (!text) return;
            if (inputField) inputField.value = '';
            try {
                await chatTerminal.sendMessage(text);
            } catch (err) {
                this.showToast('发送失败: ' + err.message, 'error');
            }
        };

        if (sendBtn) sendBtn.onclick = doSend;
        if (inputField) {
            inputField.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    doSend();
                }
            };
        }

        // 快捷命令按钮
        if (quickCmds) {
            quickCmds.innerHTML = '';
            const commands = [
                { label: '许愿', cmd: '/许愿' },
                { label: '求技能', cmd: '/求技能' },
                { label: '建议', cmd: '/建议' },
            ];
            commands.forEach(({ label, cmd }) => {
                const btn = _createElement('button', 'btn-quick-cmd', label);
                btn.onclick = async () => {
                    try {
                        await chatTerminal.sendMessage(cmd);
                    } catch (err) {
                        this.showToast('命令执行失败', 'error');
                    }
                };
                quickCmds.appendChild(btn);
            });
        }

        // 关闭按钮（返回模拟页）
        if (closeBtn) {
            closeBtn.onclick = () => this.navigateTo('page-life-simulation');
        }

        // 滑入动画
        page.classList.add('slide-up');
    }

    /** 渲染单条聊天消息 */
    _renderChatMessage(container, msg) {
        if (!container || !msg) return;
        const isUser = msg.role === 'user';
        const bubble = _createElement('div', `chat-bubble ${isUser ? 'chat-user' : 'chat-system'}`);
        bubble.innerHTML = `
            <div class="chat-sender">${_escapeHtml(isUser ? '你' : '系统')}</div>
            <div class="chat-text">${_escapeHtml(msg.content || msg.text || '')}</div>
        `;
        container.appendChild(bubble);
    }

    // ────────────────────────────────────────────────────────
    // 人生总结页
    // ────────────────────────────────────────────────────────

    _initLifeSummaryPage() {
        const page = this.pages['page-life-summary'];
        if (!page) return;

        const scoreDisplay = page.querySelector('#life-score');
        const judgeDisplay = page.querySelector('#life-judge');
        const radarCanvas = page.querySelector('#radar-chart');
        const bioText = page.querySelector('#biography-text');
        const milestoneTimeline = page.querySelector('#milestone-timeline');
        const copyBtn = page.querySelector('#btn-copy-report');
        const downloadBtn = page.querySelector('#btn-download-report');
        const shareBtn = page.querySelector('#btn-share-report');
        const restartBtn = page.querySelector('#btn-restart');

        // 获取最终数据
        const finalStats = gameEngine.getFinalStats();
        const lifeScore = gameEngine.getLifeScore();
        const judgeResult = shareSystem.getJudge(lifeScore);

        // 构建完整的人生数据
        const lifeData = {
            ...finalStats,
            system: finalStats.system,
            deathReasonText: finalStats.deathReasonText,
            score: lifeScore,
            judge: judgeResult,
            lifeEvents: gameEngine.getLifeEvents(),
        };

        // 分数显示（带动画）
        if (scoreDisplay) {
            scoreDisplay.textContent = '0';
            this._animateNumber(scoreDisplay, 0, lifeScore, 1500);
        }

        // v3.0 Score ring wrapper
        if (scoreDisplay) {
            const ringDeg = Math.min(360, Math.round((lifeScore / 120) * 360));
            scoreDisplay.parentElement?.style.setProperty('--ring-deg', ringDeg + 'deg');
        }

        // 评价显示
        if (judgeDisplay) {
            const judgeObj = typeof judgeResult === 'object' ? judgeResult : { emoji: '🎭', text: judgeResult };
            judgeDisplay.innerHTML = `
                <span class="judge-emoji">${judgeObj.emoji || '🎭'}</span>
                <span class="judge-text">${_escapeHtml(judgeObj.text || String(judgeResult))}</span>
            `;
            judgeDisplay.classList.add('fade-in');
        }

        // 雷达图
        if (radarCanvas) {
            try {
                const reportCanvas = shareSystem.generateReportCard(lifeData);
                if (reportCanvas) {
                    radarCanvas.parentNode.replaceChild(reportCanvas, radarCanvas);
                    reportCanvas.id = 'radar-chart';
                }
            } catch (err) {
                console.warn('[App] 雷达图生成失败:', err);
            }
        }

        // 传记文本（先显示结构化摘要，再异步补上完整传记）
        if (bioText) {
            const deathText = finalStats.deathReasonText || getDeathReasonText(finalStats.deathReason);
            const propSummary = Object.entries(finalStats.propEvaluations || {})
                .map(([, p]) => `${p.icon} ${p.name}: ${p.value}（${p.judge}）`)
                .join(' · ');
            const customStatSummary = (finalStats.customStats || [])
                .map((stat) => `${stat.icon || '✨'} ${stat.name}: ${stat.current ?? stat.initial ?? 0}`)
                .join(' · ');
            const highlightSummary = (finalStats.highlights || []).slice(0, 3)
                .map((text) => `<li>${_escapeHtml(text)}</li>`)
                .join('');

            bioText.innerHTML = `
                <p>享年 <strong>${finalStats.age}</strong> 岁，${_escapeHtml(deathText)}。</p>
                <p>伴生系统：${_escapeHtml(finalStats.system?.emoji || '🎮')} ${_escapeHtml(finalStats.system?.name || '无')}</p>
                <p>属性总评：${propSummary}</p>
                <p>天赋：${(finalStats.talents || []).map(t => _escapeHtml(t.name)).join('、') || '无'}</p>
                ${customStatSummary ? `<p>系统成长：${customStatSummary}</p>` : ''}
                ${highlightSummary ? `<div class="bio-highlights"><strong>高光片段</strong><ul>${highlightSummary}</ul></div>` : ''}
                <p class="bio-loading">正在整理完整人生传记...</p>
            `;

            const loadingEl = bioText.querySelector('.bio-loading');
            gameEngine.generateSummary()
                .then((summary) => {
                    const loading = bioText.querySelector('.bio-loading');
                    if (!loading) return;
                    const paragraph = document.createElement('p');
                    paragraph.className = 'bio-full-text';
                    paragraph.textContent = summary?.biography || '这是一段尚待书写的人生。';
                    loading.replaceWith(paragraph);
                })
                .catch((err) => {
                    if (loadingEl) {
                        loadingEl.textContent = `完整传记整理失败：${err.message}`;
                    }
                });
        }

        // 里程碑时间线
        if (milestoneTimeline) {
            milestoneTimeline.innerHTML = '';
            const milestones = finalStats.milestones || [];
            if (milestones.length > 0) {
                milestones.forEach(text => {
                    const item = _createElement('div', 'milestone-item', `<span class="milestone-dot">🏆</span> ${_escapeHtml(text)}`);
                    milestoneTimeline.appendChild(item);
                });
            } else {
                milestoneTimeline.innerHTML = '<div class="no-milestones">这一生没有特殊成就...</div>';
            }
        }

        // v3.0 Achievements display
        const achievementsDisplay = page.querySelector('#achievements-display');
        if (achievementsDisplay) {
            const achievements = this._computeAchievements(finalStats, lifeScore);
            if (achievements.length > 0) {
                achievementsDisplay.innerHTML = achievements.map(ach => `
                    <div class="achievement-badge${ach.unlocked ? '' : ' locked'}">
                        <span class="ach-icon">${ach.icon}</span>
                        <span class="ach-name">${_escapeHtml(ach.name)}</span>
                        <span class="ach-desc">${_escapeHtml(ach.desc)}</span>
                    </div>
                `).join('');
            } else {
                achievementsDisplay.innerHTML = '<p class="muted-text">暂无成就</p>';
            }
        }

        // 复制战报
        if (copyBtn) {
            copyBtn.onclick = async () => {
                try {
                    const text = shareSystem.generateShareText(lifeData);
                    await shareSystem.copyToClipboard(text);
                    this.showToast('战报已复制到剪贴板', 'success');
                } catch (err) {
                    this.showToast('复制失败: ' + err.message, 'error');
                }
            };
        }

        // 下载战报图
        if (downloadBtn) {
            downloadBtn.onclick = async () => {
                try {
                    await shareSystem.downloadReportImage(lifeData);
                    this.showToast('战报图已下载', 'success');
                } catch (err) {
                    this.showToast('下载失败: ' + err.message, 'error');
                }
            };
        }

        // 分享
        if (shareBtn) {
            shareBtn.onclick = async () => {
                try {
                    await shareSystem.shareReportCard(lifeData);
                    this.showToast('分享成功', 'success');
                } catch (err) {
                    this.showToast('分享失败: ' + err.message, 'error');
                }
            };
        }

        // 重新开始
        if (restartBtn) {
            restartBtn.onclick = () => {
                gameEngine.reset();
                memoryEngine.reset();
                chatTerminal.reset();
                if (systemManager.deactivateSystem) systemManager.deactivateSystem();
                this.setTheme('default');
                this._selectedSystemId = null;
                this._drawnTalents = [];
                this._selectedTalentIds = new Set();
                this._allocation = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };
                this._clearProgress();
                this.navigateTo('page-start');
            };
        }
    }

    /** v3.0 Compute achievements for summary */
    _computeAchievements(stats, score) {
        const props = stats.properties || {};
        const age = stats.age || 0;
        const achievements = [
            { id: 'longevity', icon: '🧓', name: '长寿之星', desc: '活到70岁以上', unlocked: age >= 70 },
            { id: 'centenarian', icon: '💯', name: '百岁传奇', desc: '活到100岁', unlocked: age >= 100 },
            { id: 'genius', icon: '🧠', name: '天才头脑', desc: '智力达到8以上', unlocked: (props.INT || 0) >= 8 },
            { id: 'rich', icon: '💰', name: '富甲一方', desc: '家境达到8以上', unlocked: (props.MNY || 0) >= 8 },
            { id: 'beauty', icon: '💅', name: '倾国倾城', desc: '颜值达到8以上', unlocked: (props.CHR || 0) >= 8 },
            { id: 'strong', icon: '💪', name: '铁骨铮铮', desc: '体质达到8以上', unlocked: (props.STR || 0) >= 8 },
            { id: 'happy', icon: '😊', name: '快乐至上', desc: '快乐达到8以上', unlocked: (props.SPR || 0) >= 8 },
            { id: 'legend', icon: '👑', name: '传奇人生', desc: '总评分达到100', unlocked: score >= 100 },
            { id: 'allround', icon: '⭐', name: '全面发展', desc: '所有属性≥5', unlocked: Object.values(props).every(v => v >= 5) },
            { id: 'milestone5', icon: '🏆', name: '里程碑收集者', desc: '达成5个里程碑', unlocked: (stats.milestones || []).length >= 5 },
        ];
        return achievements;
    }

    /** v3.0 Achievement celebration toast */
    showAchievementToast(message) {
        let container = _$('#toast-container');
        if (!container) {
            container = _createElement('div', 'toast-container');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = _createElement('div', 'toast toast-achievement toast-enter', `🏆 ${_escapeHtml(message)}`);
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 4000);
    }

    /** v3.0 Fast forward auto-advance */
    async _runFastForward(nextYearBtn) {
        while (this._fastForwardActive && gameEngine.isAlive()) {
            if (nextYearBtn) nextYearBtn.click();
            await new Promise(r => setTimeout(r, 600));
            if (!gameEngine.isAlive()) {
                this._fastForwardActive = false;
                const ffBtn = this.pages['page-life-simulation']?.querySelector('#btn-fast-forward');
                if (ffBtn) ffBtn.classList.remove('active');
                break;
            }
        }
    }

    /** 数字递增动画 */
    _animateNumber(el, from, to, duration) {
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.round(from + (to - from) * eased);
            el.textContent = current;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // ────────────────────────────────────────────────────────
    // 系统编辑器模态框
    // ────────────────────────────────────────────────────────

    _openSystemEditor() {
        if (this._editorOpen) return;
        this._editorOpen = true;

        // 创建模态框
        let modal = _$('#system-editor-modal');
        if (!modal) {
            modal = _createElement('div', 'modal-overlay');
            modal.id = 'system-editor-modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content system-editor">
                <h2>✏️ 自定义系统</h2>
                <div class="form-group">
                    <label>系统名称</label>
                    <input type="text" id="editor-name" placeholder="输入系统名称" maxlength="20" />
                </div>
                <div class="form-group">
                    <label>系统描述</label>
                    <textarea id="editor-desc" placeholder="描述这个系统的特点" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>性格描述</label>
                    <textarea id="editor-personality" placeholder="系统的性格特征" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>语气风格</label>
                    <select id="editor-tone">
                        ${TONE_OPTIONS.map(t => `<option value="${t.value}">${_escapeHtml(t.label)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>主题颜色</label>
                    <select id="editor-theme">
                        <option value="default">默认</option>
                        <option value="cultivation">修仙</option>
                        <option value="tycoon">商战</option>
                        <option value="cthulhu">克苏鲁</option>
                        <option value="signin">签到</option>
                        <option value="dark">暗黑</option>
                        <option value="light">明亮</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>自定义属性 <button id="btn-add-stat" class="btn-small">+ 添加</button></label>
                    <div id="custom-stat-rows"></div>
                </div>
                <div class="modal-actions">
                    <button id="btn-editor-save" class="btn-primary">保存</button>
                    <button id="btn-editor-cancel" class="btn-secondary">取消</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        // 添加自定义属性行
        const statRows = modal.querySelector('#custom-stat-rows');
        const addStatBtn = modal.querySelector('#btn-add-stat');
        if (addStatBtn && statRows) {
            addStatBtn.onclick = () => {
                const row = _createElement('div', 'custom-stat-edit-row');
                row.innerHTML = `
                    <input type="text" placeholder="属性名" class="stat-name-input" maxlength="10" />
                    <input type="number" placeholder="初始值" class="stat-init-input" value="0" min="0" max="100" />
                    <button class="btn-remove-stat">×</button>
                `;
                row.querySelector('.btn-remove-stat').onclick = () => row.remove();
                statRows.appendChild(row);
            };
        }

        // 保存按钮
        const saveBtn = modal.querySelector('#btn-editor-save');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const name = (modal.querySelector('#editor-name')?.value || '').trim();
                const desc = (modal.querySelector('#editor-desc')?.value || '').trim();
                const personality = (modal.querySelector('#editor-personality')?.value || '').trim();
                const tone = modal.querySelector('#editor-tone')?.value || 'cheerful';
                const theme = modal.querySelector('#editor-theme')?.value || 'default';

                if (!name) {
                    this.showToast('请输入系统名称', 'warning');
                    return;
                }

                // 收集自定义属性
                const customStats = [];
                if (statRows) {
                    statRows.querySelectorAll('.custom-stat-edit-row').forEach(row => {
                        const sn = row.querySelector('.stat-name-input')?.value.trim();
                        const sv = parseInt(row.querySelector('.stat-init-input')?.value, 10) || 0;
                        if (sn) customStats.push({ name: sn, initial: sv, max: 100, color: '#66bbff' });
                    });
                }

                try {
                    const config = {
                        name,
                        description: desc || `${name} - 自定义系统`,
                        emoji: '🛠️',
                        personality: personality || name,
                        tone,
                        theme,
                        grade: 1,
                        greeting: `欢迎来到${name}！`,
                        weights: { CHR: 1, INT: 1, STR: 1, MNY: 1, base: 1 },
                        abilities: [],
                        milestones: [],
                        customStats,
                        systemPrompt: `你是${name}的AI助手。${personality || ''}`,
                    };
                    systemManager.createCustomSystem(config);
                    this.showToast(`系统「${name}」创建成功`, 'success');
                    this._closeSystemEditor();
                    this._initSystemSelectPage();
                } catch (err) {
                    this.showToast('创建失败: ' + err.message, 'error');
                }
            };
        }

        // 取消按钮
        const cancelBtn = modal.querySelector('#btn-editor-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => this._closeSystemEditor();
        }

        // 点击遮罩关闭
        modal.onclick = (e) => {
            if (e.target === modal) this._closeSystemEditor();
        };
    }

    _closeSystemEditor() {
        this._editorOpen = false;
        const modal = _$('#system-editor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 应用启动
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.app = app; // 暴露到全局便于调试
});

export { App };
