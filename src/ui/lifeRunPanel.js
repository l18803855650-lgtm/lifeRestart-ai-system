import { lifeSystemAssistant } from '../ai/systemAssistant.js';
import { memoryManager } from '../domain/memoryManager.js';

const PAGE_SIZE = 6;

const TAB_TITLES = {
    goal: '当前目标',
    resources: '资源与物品',
    relations: '重要关系',
    tasks: '任务面板',
    history: '人生回朔',
};

const SYSTEM_PRESETS = {
    signin: {
        seedItems: [
            ['首签礼包', '系统奖励'],
            ['补签卡', '签到道具'],
        ],
        seedRelations: [
            ['同班欧皇', '薅羊毛竞争对手'],
            ['签到群管理员', '稳定情报源'],
        ],
        taskBuilder({ properties, system }) {
            const abilities = new Set((system?.abilities || []).map(({ name }) => name));
            return [
                {
                    title: '主线 · 把签到滚成资源雪球',
                    detail: system?.nextGoal || '保持全勤签到，别让系统断档。',
                    progress: `系统点 ${properties.PTS || 0}`,
                    status: '进行中',
                },
                {
                    title: '支线 · 攒够 10 点系统点',
                    detail: '系统点够高，签到流才会从白嫖党变成资源怪。',
                    progress: `${properties.PTS || 0} / 10`,
                    status: (properties.PTS || 0) >= 10 ? '已完成' : '进行中',
                },
                {
                    title: abilities.has('暴击签到') ? '支线 · 维持暴击全勤' : '支线 · 解锁暴击签到',
                    detail: abilities.has('暴击签到')
                        ? '已经进入爽文节奏，别把暴击断了。'
                        : '先把签到体系升上去，再追求暴击兑现。',
                    progress: abilities.has('暴击签到') ? '能力已解锁' : '等待里程碑达成',
                    status: abilities.has('暴击签到') ? '已完成' : '待冲刺',
                },
            ];
        },
    },
    cultivation: {
        seedItems: [
            ['吐纳诀', '功法'],
            ['养气丹', '丹药'],
        ],
        seedRelations: [
            ['器灵前辈', '引路人'],
            ['同门师兄', '竞争同道'],
        ],
        taskBuilder({ properties, system }) {
            const abilities = new Set((system?.abilities || []).map(({ name }) => name));
            return [
                {
                    title: '主线 · 冲击下一个境界',
                    detail: system?.nextGoal || '体质和智力一起抬，别走偏科修仙。',
                    progress: `体质 ${properties.STR || 0} / 智力 ${properties.INT || 0}`,
                    status: '进行中',
                },
                {
                    title: '支线 · 筑基前打牢根基',
                    detail: '修仙文最怕根基虚浮，先把双属性堆稳。',
                    progress: `STR ${properties.STR || 0} / 8 · INT ${properties.INT || 0} / 8`,
                    status: (properties.STR || 0) >= 8 && (properties.INT || 0) >= 8 ? '已完成' : '进行中',
                },
                {
                    title: abilities.has('金丹气场') ? '支线 · 维持金丹威压' : '支线 · 寻找金丹机缘',
                    detail: abilities.has('金丹气场')
                        ? '已经能压人了，接下来要把凡人局打成仙侠局。'
                        : '等筑基之后就该考虑结丹和外界历练。',
                    progress: abilities.has('金丹气场') ? '气场已成' : '机缘未至',
                    status: abilities.has('金丹气场') ? '已完成' : '待解锁',
                },
            ];
        },
    },
    villain: {
        seedItems: [
            ['反派剧本', '布局情报'],
            ['黑名单', '仇敌名册'],
        ],
        seedRelations: [
            ['头号宿敌', '必踩目标'],
            ['第一心腹', '可培养班底'],
        ],
        taskBuilder({ properties, system }) {
            const abilities = new Set((system?.abilities || []).map(({ name }) => name));
            return [
                {
                    title: '主线 · 把小反派玩成幕后棋手',
                    detail: system?.nextGoal || '反派流不能只会嘴硬，要会做局。',
                    progress: `声望 ${properties.REP || 0}`,
                    status: '进行中',
                },
                {
                    title: '支线 · 把声望顶到 8',
                    detail: '没名望就没有打脸后的回响。',
                    progress: `${properties.REP || 0} / 8`,
                    status: (properties.REP || 0) >= 8 ? '已完成' : '进行中',
                },
                {
                    title: abilities.has('收小弟') ? '支线 · 扩张势力网' : '支线 · 解锁收小弟',
                    detail: abilities.has('收小弟')
                        ? '有了班底，就要让别人替你办事。'
                        : '反派没有人手，只能算嘴强王者。',
                    progress: abilities.has('收小弟') ? '势力已成型' : '等待幕后棋手里程碑',
                    status: abilities.has('收小弟') ? '已完成' : '待冲刺',
                },
            ];
        },
    },
    tycoon: {
        seedItems: [
            ['黑金卡', '消费凭证'],
            ['返利额度', '现金流'],
        ],
        seedRelations: [
            ['私人管家', '执行助手'],
            ['投行合伙人', '资本搭子'],
        ],
        taskBuilder({ properties, system }) {
            const abilities = new Set((system?.abilities || []).map(({ name }) => name));
            return [
                {
                    title: '主线 · 让返利闭环跑起来',
                    detail: system?.nextGoal || '神豪流不是单纯有钱，是现金流和人脉一起炸。',
                    progress: `家境 ${properties.MNY || 0}`,
                    status: '进行中',
                },
                {
                    title: '支线 · 打出第一轮豪门圈层',
                    detail: '有钱只是入场券，进圈才有后续资本玩法。',
                    progress: `家境 ${properties.MNY || 0} / 8 · 声望 ${properties.REP || 0}`,
                    status: (properties.MNY || 0) >= 8 ? '已完成' : '进行中',
                },
                {
                    title: abilities.has('资本运作') ? '支线 · 把钱变成规则' : '支线 · 解锁资本运作',
                    detail: abilities.has('资本运作')
                        ? '神豪线后期要能改桌面，不只是买单。'
                        : '先把本金和圈层堆起来。',
                    progress: abilities.has('资本运作') ? '资本模块已解锁' : '等待高阶返利节点',
                    status: abilities.has('资本运作') ? '已完成' : '待解锁',
                },
            ];
        },
    },
};

function escapeHtml(text = '') {
    return `${text}`
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function normalizeLine(text = '') {
    return `${text}`.trim();
}

function uniqueByText(items = []) {
    const seen = new Set();
    return items.filter(item => {
        const key = `${item[0]}::${item[1]}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

class LifeRunPanel {
    #mounted = false;
    #elements = {};
    #actions = {
        onNext: null,
        onSaveLoad: null,
    };
    #state = {
        activeTab: 'goal',
        historyPage: 0,
        history: [],
    };

    mount() {
        if (this.#mounted || typeof document === 'undefined') return;
        this.#mounted = true;
        this.#injectStyles();
        this.#createDom();
        this.#bindEvents();
        this.render();
    }

    attach({ onNext = null, onSaveLoad = null } = {}) {
        this.mount();
        this.#actions = { onNext, onSaveLoad };
        this.#elements.root.classList.add('active');
        this.render();
    }

    detach() {
        if (!this.#mounted) return;
        this.#elements.root.classList.remove('active');
        this.#elements.root.classList.remove('open');
    }

    openTab(tab) {
        this.mount();
        this.#state.activeTab = tab;
        if (tab === 'history') {
            this.#state.historyPage = Math.max(0, this.#pageCount() - 1);
        }
        this.#elements.root.classList.add('active');
        this.#elements.root.classList.add('open');
        this.render();
    }

    resetRun({ startContent = [], startLines = [] } = {}) {
        this.mount();
        this.#state = {
            activeTab: 'goal',
            historyPage: 0,
            history: [],
        };
        this.#resetMemoryStructures();
        this.#seedSystemLore();
        this.render();
    }

    pushTrajectory({ age, content = [], lines = [] } = {}) {
        if (!lines.length) return;
        this.#state.history.push({
            age,
            lines: [...lines],
            rewardText: '',
        });
        this.#recordContent({ age, content, lines });
        this.render();
    }

    applyTenPullReward({ age, rewardText = '' } = {}) {
        const text = `${rewardText}`.trim();
        if (!text) return;
        for (let index = this.#state.history.length - 1; index >= 0; index--) {
            if (`${this.#state.history[index].age}` !== `${age}`) continue;
            this.#state.history[index].rewardText = text;
            break;
        }
        text
            .split('\n')
            .map(line => normalizeLine(line))
            .filter(Boolean)
            .forEach(line => {
                const [name] = line.split(/[：:]/);
                if (!name) return;
                memoryManager.addItem(name.replace(/[『』「」]/g, '').trim(), '十连抽天赋', {
                    age,
                    importance: 0.75,
                });
            });
        this.render();
    }

    render() {
        if (!this.#mounted) return;
        this.#renderBar();
        this.#renderSheet();
    }

    #bindEvents() {
        this.#elements.bar.addEventListener('click', event => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const { action } = button.dataset;
            switch (action) {
                case 'goal':
                case 'resources':
                case 'relations':
                case 'tasks':
                case 'history':
                    this.openTab(action);
                    break;
                case 'save':
                    this.#actions.onSaveLoad?.();
                    break;
                case 'next':
                    this.#actions.onNext?.();
                    break;
                case 'chat':
                    lifeSystemAssistant.openPanel(true);
                    break;
            }
        });

        this.#elements.close.addEventListener('click', () => {
            this.#elements.root.classList.remove('open');
        });

        this.#elements.body.addEventListener('click', event => {
            const button = event.target.closest('button[data-history-nav]');
            if (!button) return;
            const direction = button.dataset.historyNav;
            const maxPage = Math.max(0, this.#pageCount() - 1);
            if (direction === 'prev') {
                this.#state.historyPage = Math.max(0, this.#state.historyPage - 1);
            } else {
                this.#state.historyPage = Math.min(maxPage, this.#state.historyPage + 1);
            }
            this.render();
        });
    }

    #renderBar() {
        const activeTab = this.#state.activeTab;
        this.#elements.bar.querySelectorAll('button[data-action]').forEach(button => {
            const { action } = button.dataset;
            button.classList.toggle('is-active', this.#elements.root.classList.contains('open') && action === activeTab);
        });
    }

    #renderSheet() {
        const title = TAB_TITLES[this.#state.activeTab] || '系统面板';
        this.#elements.title.textContent = title;
        this.#elements.body.innerHTML = this.#renderTab(this.#state.activeTab);
    }

    #renderTab(tab) {
        switch (tab) {
            case 'resources':
                return this.#renderResources();
            case 'relations':
                return this.#renderRelations();
            case 'tasks':
                return this.#renderTasks();
            case 'history':
                return this.#renderHistory();
            case 'goal':
            default:
                return this.#renderGoal();
        }
    }

    #renderGoal() {
        const system = core.system;
        const latest = this.#state.history.at(-1);
        if (!system) {
            return '<div class="life-run-empty">先开始一局人生，系统目标才会出现。</div>';
        }
        const latestLines = latest?.lines?.slice(-3).map(line => `<li>${escapeHtml(line)}</li>`).join('') || '<li>还没跑到今年。</li>';
        return `
            <div class="life-run-card">
                <div class="life-run-card-title">主线目标</div>
                <div class="life-run-card-body">${escapeHtml(system.nextGoal || '先把这一局跑起来，让系统进入节奏。')}</div>
            </div>
            <div class="life-run-card">
                <div class="life-run-card-title">当前路线</div>
                <div class="life-run-card-body">${escapeHtml(system.name)} · ${escapeHtml(system.theme || '系统流')}</div>
                <div class="life-run-card-sub">${escapeHtml(system.description || '这局的系统已经接管，你现在走的是明显的网文系统流。')}</div>
            </div>
            <div class="life-run-card">
                <div class="life-run-card-title">最近播报</div>
                <ul class="life-run-list">${latestLines}</ul>
            </div>
        `;
    }

    #renderResources() {
        const properties = core.propertys || {};
        const inventory = Object.entries(memoryManager.getInventory ? memoryManager.getInventory() : {});
        const system = core.system;
        const resources = [
            ['系统等级', properties.SYSLV ?? system?.level ?? 0],
            ['系统点', properties.PTS ?? system?.points ?? 0],
            ['气运', properties.FATE ?? system?.fate ?? 0],
            ['声望', properties.REP ?? system?.reputation ?? 0],
            ['能量', properties.ENG ?? system?.energy ?? 0],
            ['家境', properties.MNY ?? 0],
            ['快乐', properties.SPR ?? 0],
        ];
        const resourceHtml = resources.map(([label, value]) => `
            <div class="life-run-stat">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </div>
        `).join('');
        const inventoryHtml = inventory.length
            ? inventory.map(([name, item]) => `
                <div class="life-run-chip">
                    <strong>${escapeHtml(name)}</strong>
                    <span>${escapeHtml(item.type || '道具')} · x${escapeHtml(item.count || 1)}</span>
                </div>
            `).join('')
            : '<div class="life-run-empty">当前还没有额外道具，先推进主线会逐渐掉东西。</div>';
        return `
            <div class="life-run-grid">${resourceHtml}</div>
            <div class="life-run-card">
                <div class="life-run-card-title">库存</div>
                <div class="life-run-chip-list">${inventoryHtml}</div>
            </div>
        `;
    }

    #renderRelations() {
        const relations = Object.entries(memoryManager.getAllRelationships ? memoryManager.getAllRelationships() : {});
        if (!relations.length) {
            return '<div class="life-run-empty">这一局还没刷出关键关系，多推进系统里程碑会更像网文。</div>';
        }
        return relations.map(([name, list]) => {
            const latest = list[0] || list.at(-1) || {};
            return `
                <div class="life-run-card">
                    <div class="life-run-card-title">${escapeHtml(name)}</div>
                    <div class="life-run-card-body">${escapeHtml(latest.type || '暂无定位')}</div>
                    <div class="life-run-card-sub">累计互动 ${escapeHtml(list.length || 1)} 次</div>
                </div>
            `;
        }).join('');
    }

    #renderTasks() {
        const tasks = this.#buildTasks();
        return tasks.map(task => `
            <div class="life-run-card task-${escapeHtml(task.status)}">
                <div class="life-run-card-title">${escapeHtml(task.title)}</div>
                <div class="life-run-card-body">${escapeHtml(task.detail)}</div>
                <div class="life-run-task-foot">
                    <span>${escapeHtml(task.progress)}</span>
                    <strong>${escapeHtml(task.status)}</strong>
                </div>
            </div>
        `).join('');
    }

    #renderHistory() {
        if (!this.#state.history.length) {
            return '<div class="life-run-empty">还没有可回看的轨迹。</div>';
        }
        const pageCount = this.#pageCount();
        const page = Math.min(this.#state.historyPage, pageCount - 1);
        this.#state.historyPage = Math.max(0, page);
        const start = page * PAGE_SIZE;
        const items = this.#state.history.slice(start, start + PAGE_SIZE);
        const entries = items.map(item => {
            const rewardHtml = item.rewardText
                ? `<div class="life-run-card-sub life-run-reward">十连抽掉落：<br>${escapeHtml(item.rewardText).replaceAll('\n', '<br>')}</div>`
                : '';
            return `
                <div class="life-run-card">
                    <div class="life-run-card-title">${escapeHtml(item.age)}岁</div>
                    <ul class="life-run-list">
                        ${item.lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
                    </ul>
                    ${rewardHtml}
                </div>
            `;
        }).join('');
        return `
            <div class="life-run-history-nav">
                <button data-history-nav="prev" ${page <= 0 ? 'disabled' : ''}>上一页</button>
                <span>${page + 1} / ${pageCount}</span>
                <button data-history-nav="next" ${page >= pageCount - 1 ? 'disabled' : ''}>下一页</button>
            </div>
            ${entries}
        `;
    }

    #buildTasks() {
        const system = core.system;
        const properties = core.propertys || {};
        if (!system) {
            return [{
                title: '主线 · 开局',
                detail: '先跑起来，系统才会给出真正任务。',
                progress: '等待开始',
                status: '待开始',
            }];
        }
        const preset = SYSTEM_PRESETS[system.id];
        if (preset?.taskBuilder) {
            return preset.taskBuilder({ properties, system });
        }
        return [{
            title: '主线 · 推进系统主线',
            detail: system.nextGoal || '继续推进这一局。',
            progress: '进行中',
            status: '进行中',
        }];
    }

    #recordContent({ age, content = [], lines = [] } = {}) {
        lines.forEach(line => {
            memoryManager.addYearlyEvent(age, line, { age });
        });
        const systemId = core.system?.id;
        for (const item of content) {
            if (!item) continue;
            const text = `${item.name || ''}${item.description || ''}`;
            if (item.type === core.PropertyTypes.SYS) {
                memoryManager.addSystemEvent(systemId || 'system', `${age}岁 ${item.name || '系统事件'}：${item.description || ''}`, {
                    age,
                    importance: item.kind === 'milestone' ? 0.9 : 0.7,
                });
            }
            this.#recordSystemLoot({ age, text, item, systemId });
        }
    }

    #recordSystemLoot({ age, text = '', item = {}, systemId }) {
        const source = `${item.name || ''} ${item.description || ''} ${text}`;
        if (/十连抽|Ten Pull/i.test(source)) {
            memoryManager.addItem('十连抽福袋', '系统奖励', { age, importance: 0.8 });
        }
        if (/暴击签到|Critical Check-in/i.test(source)) {
            memoryManager.addItem('暴击签到礼包', '签到奖励', { age, importance: 0.8 });
        }
        if (/灵石|Spirit-Stone/i.test(source)) {
            memoryManager.addItem('灵石', '修炼资源', { age, importance: 0.75 });
        }
        if (/筑基|Foundation/i.test(source)) {
            memoryManager.addItem('筑基丹', '修仙机缘', { age, importance: 0.8 });
        }
        if (/金丹|Golden Core/i.test(source)) {
            memoryManager.addItem('金丹道纹', '大机缘', { age, importance: 0.85 });
            memoryManager.addRelationship('同道强者', '开始主动结交你', { age, importance: 0.8 });
        }
        if (/打脸|Face-Slapping/i.test(source)) {
            memoryManager.addRelationship(`被踩对象·${age}岁`, '仇敌', { age, importance: 0.72 });
        }
        if (/截胡|Interception/i.test(source)) {
            memoryManager.addItem('机缘线索', '布局资源', { age, importance: 0.75 });
        }
        if (/收小弟|Henchmen/i.test(source)) {
            memoryManager.addRelationship(`心腹·${age}岁`, '班底', { age, importance: 0.82 });
        }
        if (/豪门人脉|Elite Network/i.test(source)) {
            memoryManager.addRelationship(`资本圈联系人·${age}岁`, '合作伙伴', { age, importance: 0.8 });
        }
        if (/资本运作|Capital Operation/i.test(source)) {
            memoryManager.addItem('项目股权书', '资本筹码', { age, importance: 0.82 });
        }
        if (/返现|Cashback/i.test(source) && systemId === 'tycoon') {
            memoryManager.addItem('返利到账通知', '现金流', { age, importance: 0.72 });
        }
    }

    #seedSystemLore() {
        const system = core.system;
        if (!system) return;
        const preset = SYSTEM_PRESETS[system.id];
        if (!preset) return;
        uniqueByText(preset.seedItems || []).forEach(([name, type]) => {
            memoryManager.addItem(name, type, { importance: 0.7, age: 0 });
        });
        uniqueByText(preset.seedRelations || []).forEach(([name, relationType]) => {
            memoryManager.addRelationship(name, relationType, { importance: 0.72, age: 0 });
        });
    }

    #resetMemoryStructures() {
        memoryManager.memories = [];
        memoryManager.summary.summaries = [];
        memoryManager.summary.currentYear = 0;
        memoryManager.summary.currentEvents = [];
        memoryManager.relationShips = new Map();
        memoryManager.inventory = new Map();
    }

    #pageCount() {
        return Math.max(1, Math.ceil(this.#state.history.length / PAGE_SIZE));
    }

    #createDom() {
        const root = document.createElement('div');
        root.id = 'life-run-panel';
        root.innerHTML = `
            <div class="life-run-sheet">
                <div class="life-run-sheet-header">
                    <strong class="life-run-sheet-title">系统面板</strong>
                    <button class="life-run-sheet-close">×</button>
                </div>
                <div class="life-run-sheet-body"></div>
            </div>
            <div class="life-run-bar">
                <button data-action="goal">目标</button>
                <button data-action="resources">资源</button>
                <button data-action="relations">关系</button>
                <button data-action="tasks">任务</button>
                <button data-action="history">回朔</button>
                <button data-action="save">保存</button>
                <button data-action="next">下一年</button>
                <button data-action="chat">对话</button>
            </div>
        `;
        document.body.appendChild(root);
        this.#elements = {
            root,
            bar: root.querySelector('.life-run-bar'),
            title: root.querySelector('.life-run-sheet-title'),
            close: root.querySelector('.life-run-sheet-close'),
            body: root.querySelector('.life-run-sheet-body'),
        };
    }

    #injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #life-run-panel {
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: 39;
                opacity: 0;
                transition: opacity .18s ease;
            }
            #life-run-panel.active {
                opacity: 1;
            }
            #life-run-panel .life-run-bar,
            #life-run-panel .life-run-sheet {
                pointer-events: auto;
            }
            #life-run-panel .life-run-bar {
                position: absolute;
                left: 12px;
                right: 12px;
                bottom: 12px;
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
            }
            #life-run-panel .life-run-bar button,
            #life-run-panel .life-run-history-nav button,
            #life-run-panel .life-run-sheet-close {
                border: none;
                border-radius: 14px;
                background: rgba(9, 15, 28, 0.92);
                color: #f4f7ff;
                padding: 12px 10px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
            }
            #life-run-panel .life-run-bar button.is-active {
                background: linear-gradient(135deg, #5865f2, #3aa8ff);
            }
            #life-run-panel .life-run-sheet {
                position: absolute;
                left: 12px;
                right: 12px;
                bottom: 124px;
                max-height: 54vh;
                border-radius: 18px;
                background: rgba(7, 11, 19, 0.97);
                color: #eef3ff;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
                display: none;
                overflow: hidden;
            }
            #life-run-panel.open .life-run-sheet {
                display: block;
            }
            #life-run-panel .life-run-sheet-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 14px 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            #life-run-panel .life-run-sheet-title {
                font-size: 16px;
            }
            #life-run-panel .life-run-sheet-close {
                width: 40px;
                height: 40px;
                padding: 0;
                font-size: 24px;
                line-height: 1;
            }
            #life-run-panel .life-run-sheet-body {
                padding: 12px;
                overflow: auto;
                max-height: calc(54vh - 64px);
            }
            #life-run-panel .life-run-card {
                border-radius: 14px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                margin-bottom: 10px;
            }
            #life-run-panel .life-run-card-title {
                font-size: 15px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            #life-run-panel .life-run-card-body {
                line-height: 1.55;
                font-size: 14px;
            }
            #life-run-panel .life-run-card-sub,
            #life-run-panel .life-run-task-foot,
            #life-run-panel .life-run-history-nav,
            #life-run-panel .life-run-empty {
                color: rgba(238, 243, 255, 0.78);
                font-size: 13px;
            }
            #life-run-panel .life-run-card-sub {
                margin-top: 8px;
                line-height: 1.5;
            }
            #life-run-panel .life-run-list {
                margin: 0;
                padding-left: 18px;
                line-height: 1.5;
            }
            #life-run-panel .life-run-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-bottom: 10px;
            }
            #life-run-panel .life-run-stat {
                border-radius: 14px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.06);
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            #life-run-panel .life-run-stat strong {
                font-size: 22px;
                color: #79d4ff;
            }
            #life-run-panel .life-run-chip-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            #life-run-panel .life-run-chip {
                min-width: 132px;
                border-radius: 12px;
                padding: 10px;
                background: rgba(88, 101, 242, 0.16);
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            #life-run-panel .life-run-chip strong {
                font-size: 14px;
            }
            #life-run-panel .life-run-task-foot,
            #life-run-panel .life-run-history-nav {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-top: 10px;
            }
            #life-run-panel .life-run-history-nav {
                margin: 0 0 10px;
            }
            #life-run-panel .life-run-history-nav button[disabled] {
                opacity: .45;
            }
            #life-run-panel .life-run-reward {
                color: #ffd76d;
            }
            @media (max-width: 720px) {
                #life-run-panel .life-run-sheet {
                    max-height: 58vh;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

export const lifeRunPanel = new LifeRunPanel();
