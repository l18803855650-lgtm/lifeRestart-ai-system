/**
 * 人生重开 AI 系统 —— 主应用控制器
 *
 * 负责页面路由、DOM 交互、模块编排，将所有子系统串联为完整的游戏体验。
 * 所有 UI 逻辑的唯一入口，统一管理页面切换、事件绑定与状态同步。
 */

import { aiService, PROVIDERS } from './ai-service.js';
import { gameEngine, TALENT_POOL, PROPERTIES } from './game-engine.js';
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
const VERSION = 'v2.0.0';

// ═══════════════════════════════════════════════════════════════
// App 主应用类
// ═══════════════════════════════════════════════════════════════

class App {
    constructor() {
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

        // 初始化起始页
        this._initStartPage();

        this.initialized = true;
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

        // 标题淡入动画
        const title = page.querySelector('.title');
        if (title) {
            title.classList.remove('fade-in');
            requestAnimationFrame(() => title.classList.add('fade-in'));
        }

        // 绑定「开始新人生」按钮
        const startBtn = page.querySelector('#btn-start');
        if (startBtn) {
            startBtn.onclick = () => this.navigateTo('page-api-setup');
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
                card.innerHTML = `
                    <div class="system-card-emoji">${sys.emoji || '🎮'}</div>
                    <div class="system-card-name">${_escapeHtml(sys.name)}</div>
                    <div class="system-card-grade">${_renderStars(sys.grade || 0)}</div>
                    <div class="system-card-desc">${_escapeHtml(sys.description || '')}</div>
                `;
                card.onclick = () => {
                    // 清除其他选中状态
                    grid.querySelectorAll('.system-card').forEach(c => c.classList.remove('selected', 'glow'));
                    card.classList.add('selected', 'glow');
                    this._selectedSystemId = sys.id;
                    if (confirmBtn) confirmBtn.disabled = false;
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
        const talentGrid = page.querySelector('#talent-grid');
        const confirmBtn = page.querySelector('#btn-talent-confirm');
        const countDisplay = page.querySelector('#talent-select-count');

        this._drawnTalents = [];
        this._selectedTalentIds = new Set();
        if (drawBtn) drawBtn.style.display = '';
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.display = '';
        }

        // 清空已有内容
        if (talentGrid) talentGrid.innerHTML = '';
        if (countDisplay) countDisplay.textContent = '已选择 0/3';
        if (confirmBtn) confirmBtn.disabled = true;

        // 十连抽按钮
        if (drawBtn) {
            drawBtn.onclick = () => {
                try {
                    this._drawnTalents = gameEngine.drawTalents(10);
                } catch (err) {
                    this.showToast('天赋抽取失败: ' + err.message, 'error');
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
                        card.onclick = () => this._toggleTalent(card, talent, countDisplay, confirmBtn);

                        talentGrid.appendChild(card);
                    });
                }

                // 隐藏抽取按钮
                drawBtn.style.display = 'none';
                this.showToast('天赋已揭晓！请选择最多3个天赋', 'info');
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

    // ────────────────────────────────────────────────────────
    // 属性分配页
    // ────────────────────────────────────────────────────────

    _initPropertyAllocatePage() {
        const page = this.pages['page-property-allocate'];
        if (!page) return;

        const container = page.querySelector('#property-controls');
        const remainDisplay = page.querySelector('#remaining-points');
        const confirmBtn = page.querySelector('#btn-property-confirm');
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
                customStatsArea.innerHTML = '<h3>系统特殊属性</h3>';
                activeSystem.customStats.forEach(stat => {
                    const div = _createElement('div', 'custom-stat-row',
                        `<span>${_escapeHtml(stat.name || stat.label)}</span>: <span>${stat.initial || 0}</span>`
                    );
                    customStatsArea.appendChild(div);
                });
                customStatsArea.style.display = 'block';
            } else {
                customStatsArea.style.display = 'none';
            }
        }

        updateRemaining();

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

        const ageBadge = page.querySelector('#age-badge');
        const systemName = page.querySelector('#system-name');
        const eventLog = page.querySelector('#event-log');
        const nextYearBtn = page.querySelector('#btn-next-year');
        const chatBtn = page.querySelector('#btn-open-chat');
        const statsArea = page.querySelector('#stats-bars');

        // 开始人生
        try {
            gameEngine.startLife();
        } catch (_) {
            /* 可能已经启动 */
        }

        // 显示系统名称
        const activeSystem = systemManager.getActiveSystem();
        if (systemName && activeSystem) {
            systemName.textContent = activeSystem.name;
        }

        // 初始化年龄显示
        if (ageBadge) ageBadge.textContent = `${gameEngine.getCurrentAge()} 岁`;

        // 清空事件日志
        if (eventLog) eventLog.innerHTML = '';

        // 初始化属性条
        this._renderStatsBars(statsArea);

        // 初始化系统自定义属性条
        const customStatsArea = page.querySelector('#sim-custom-stats');
        this._renderCustomStatsBars(customStatsArea);

        // 「下一年」按钮
        if (nextYearBtn) {
            nextYearBtn.onclick = async () => {
                nextYearBtn.disabled = true;
                nextYearBtn.textContent = '模拟中...';

                try {
                    const result = await gameEngine.nextYear();

                    // 更新年龄
                    if (ageBadge) ageBadge.textContent = `${result.age} 岁`;

                    // 渲染事件
                    if (eventLog) {
                        const yearBlock = _createElement('div', 'year-block');

                        const yearLabel = _createElement('div', 'year-label',
                            `<span class="age-tag">${result.age} 岁</span>`
                        );
                        yearBlock.appendChild(yearLabel);

                        if (result.events && result.events.length > 0) {
                            result.events.forEach(evt => {
                                const evtEl = _createElement('div', `event-item event-${evt.type || 'normal'}`,
                                    _escapeHtml(evt.text || evt)
                                );
                                yearBlock.appendChild(evtEl);
                            });
                        }

                        // 系统消息
                        if (result.systemMessage) {
                            const sysEl = _createElement('div', 'event-item event-system',
                                `【系统】${_escapeHtml(result.systemMessage)}`
                            );
                            yearBlock.appendChild(sysEl);
                        }

                        // 选择事件
                        if (result.choices && result.choices.length > 0) {
                            const choiceDiv = _createElement('div', 'choice-container');
                            result.choices.forEach(choice => {
                                const btn = _createElement('button', 'btn-choice', _escapeHtml(choice.text));
                                btn.onclick = async () => {
                                    choiceDiv.querySelectorAll('.btn-choice').forEach(b => b.disabled = true);
                                    btn.classList.add('selected');
                                    if (choice.callback) await choice.callback();
                                    this.showToast(`已选择: ${choice.text}`, 'info');
                                };
                                choiceDiv.appendChild(btn);
                            });
                            yearBlock.appendChild(choiceDiv);
                        }

                        // 系统任务
                        if (result.task) {
                            const taskOverlay = _createElement('div', 'task-overlay');
                            taskOverlay.innerHTML = `
                                <div class="task-content">
                                    <h3>📋 系统任务</h3>
                                    <p>${_escapeHtml(result.task.description || result.task.text || '')}</p>
                                    <button class="btn-task-complete">完成任务</button>
                                </div>
                            `;
                            yearBlock.appendChild(taskOverlay);
                            taskOverlay.querySelector('.btn-task-complete').onclick = () => {
                                taskOverlay.classList.add('task-done');
                                setTimeout(() => taskOverlay.remove(), 500);
                            };
                        }

                        // 属性变化提示
                        if (result.propertyChanges) {
                            const changesText = Object.entries(result.propertyChanges)
                                .filter(([, v]) => v !== 0)
                                .map(([k, v]) => {
                                    const prop = PROPERTIES[k];
                                    const sign = v > 0 ? '+' : '';
                                    return `${prop ? prop.icon : k} ${sign}${v}`;
                                })
                                .join('  ');
                            if (changesText) {
                                const changeEl = _createElement('div', 'property-change-hint', changesText);
                                yearBlock.appendChild(changeEl);
                            }
                        }

                        eventLog.appendChild(yearBlock);

                        // 平滑滚动到底部
                        requestAnimationFrame(() => {
                            eventLog.scrollTo({ top: eventLog.scrollHeight, behavior: 'smooth' });
                        });
                    }

                    // 更新属性条
                    this._renderStatsBars(statsArea);
                    this._renderCustomStatsBars(page.querySelector('#sim-custom-stats'));

                    // 检查是否死亡
                    if (result.isEnd) {
                        nextYearBtn.style.display = 'none';

                        const deathOverlay = _createElement('div', 'death-overlay');
                        deathOverlay.innerHTML = `
                            <div class="death-content">
                                <div class="death-icon">💀</div>
                                <div class="death-text">${_escapeHtml(result.deathReason || '你的一生结束了')}</div>
                            </div>
                        `;
                        if (eventLog) eventLog.appendChild(deathOverlay);

                        // 2秒后跳转到总结页
                        setTimeout(() => {
                            this.navigateTo('page-life-summary');
                        }, 2000);
                    }
                } catch (err) {
                    this.showToast('模拟出错: ' + err.message, 'error');
                } finally {
                    nextYearBtn.disabled = false;
                    nextYearBtn.textContent = '下一年';
                }
            };
        }

        // 聊天浮窗按钮
        if (chatBtn) {
            chatBtn.onclick = () => this.navigateTo('page-chat');
        }
    }

    /** 渲染主属性条 */
    _renderStatsBars(container) {
        if (!container) return;
        const props = gameEngine.getProperties();
        container.innerHTML = '';
        for (const [key, config] of Object.entries(PROPERTIES)) {
            const val = props[key] || 0;
            const pct = Math.min(100, Math.max(0, val * 10));
            const row = _createElement('div', 'stat-bar-row', `
                <span class="stat-label">${config.icon} ${config.name}</span>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${pct}%;background:${config.color}"></div>
                </div>
                <span class="stat-value">${_formatNumber(val)}</span>
            `);
            container.appendChild(row);
        }
    }

    /** 渲染系统自定义属性条 */
    _renderCustomStatsBars(container) {
        if (!container) return;
        const activeSystem = systemManager.getActiveSystem();
        if (!activeSystem || !activeSystem.customStats || activeSystem.customStats.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';
        container.innerHTML = '';
        activeSystem.customStats.forEach(stat => {
            const val = stat.current !== undefined ? stat.current : (stat.initial || 0);
            const max = stat.max || 100;
            const pct = Math.min(100, Math.max(0, (val / max) * 100));
            const row = _createElement('div', 'stat-bar-row custom-stat', `
                <span class="stat-label">${_escapeHtml(stat.name || stat.label)}</span>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${pct}%;background:${stat.color || '#aaa'}"></div>
                </div>
                <span class="stat-value">${_formatNumber(val)}</span>
            `);
            container.appendChild(row);
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

        // 设置聊天终端依赖
        if (aiService.isConfigured && aiService.isConfigured()) {
            chatTerminal.setAIService(aiService);
        }
        chatTerminal.setGameStateProvider(() => ({
            age: gameEngine.getCurrentAge(),
            properties: gameEngine.getProperties(),
            alive: gameEngine.isAlive(),
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
            // 更新模拟页面属性条
            const simStats = this.pages['page-life-simulation']?.querySelector('#stats-bars');
            this._renderStatsBars(simStats);

            // 显示效果提示
            if (effects && typeof effects === 'object') {
                const parts = Object.entries(effects)
                    .filter(([, v]) => v !== 0)
                    .map(([k, v]) => {
                        const p = PROPERTIES[k];
                        return `${p ? p.icon : k} ${v > 0 ? '+' : ''}${v}`;
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
            score: lifeScore,
            judge: judgeResult,
            lifeEvents: gameEngine.getLifeEvents(),
        };

        // 分数显示（带动画）
        if (scoreDisplay) {
            scoreDisplay.textContent = '0';
            this._animateNumber(scoreDisplay, 0, lifeScore, 1500);
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

        // 传记文本
        if (bioText) {
            const deathText = finalStats.deathReason || '寿终正寝';
            const propSummary = Object.entries(finalStats.propEvaluations || {})
                .map(([, p]) => `${p.icon} ${p.name}: ${p.value}(${p.judge})`)
                .join(' | ');
            bioText.innerHTML = `
                <p>享年 <strong>${finalStats.age}</strong> 岁，${_escapeHtml(deathText)}。</p>
                <p>属性总评: ${propSummary}</p>
                <p>天赋: ${(finalStats.talents || []).map(t => _escapeHtml(t.name)).join('、') || '无'}</p>
                <p>系统: ${_escapeHtml(finalStats.system || '无')}</p>
            `;
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
                this.navigateTo('page-start');
            };
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
