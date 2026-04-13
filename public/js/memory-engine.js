/**
 * 记忆管理引擎 - AI人生重开模拟器
 * 确保AI"永不遗忘"：记录关键人生事件、生成周期摘要、管理上下文窗口以优化Token效率
 */

// ============================================================
// 重要事件关键词权重表
// ============================================================

/** 通用高重要性关键词 */
const GENERAL_KEYWORDS = {
    '死': 0.9, '生': 0.8, '婚': 0.85, '离': 0.8,
    '获得': 0.6, '失去': 0.7, '突破': 0.75, '觉醒': 0.8,
    '神器': 0.85, '仇': 0.7, '恩': 0.65, '爱': 0.7, '恨': 0.7,
    '战': 0.6, '胜': 0.65, '败': 0.7, '任务': 0.5,
    '成功': 0.6, '失败': 0.65, '晋升': 0.7, '降级': 0.7,
};

/** 修仙体系关键词 */
const CULTIVATION_KEYWORDS = {
    '修炼': 0.5, '灵力': 0.45, '金丹': 0.8, '元婴': 0.85,
    '渡劫': 0.9, '飞升': 0.95,
};

/** 商业体系关键词 */
const TYCOON_KEYWORDS = {
    '投资': 0.55, '收购': 0.7, '破产': 0.9, '上市': 0.85, '资产': 0.5,
};

/** 克苏鲁体系关键词 */
const CTHULHU_KEYWORDS = {
    '理智': 0.6, 'SAN': 0.6, '疯狂': 0.75, '恐惧': 0.65, '深渊': 0.8,
};

/** 所有关键词合并 */
const ALL_KEYWORDS = {
    ...GENERAL_KEYWORDS,
    ...CULTIVATION_KEYWORDS,
    ...TYCOON_KEYWORDS,
    ...CTHULHU_KEYWORDS,
};

// ============================================================
// 记忆引擎主类
// ============================================================

export class MemoryEngine {
    constructor() {
        /** 所有记忆条目 */
        this.memories = [];
        /** 周期摘要（每10年一次） */
        this.summaries = [];
        /** NPC关系表 { name: { relation, attitude, firstMet, events[] } } */
        this.relationships = {};
        /** 重要物品 { name, description, acquiredAge, source } */
        this.inventory = [];
        /** 人生里程碑 { age, description, importance } */
        this.milestones = [];
        /** 当前年龄 */
        this.currentAge = 0;
        /** 最大记忆条目数 */
        this.maxMemories = 200;
        /** 摘要生成间隔（年） */
        this.summaryInterval = 10;
        /** 自增ID计数器，确保ID唯一 */
        this._nextId = 0;
    }

    // --------------------------------------------------------
    // 基础操作
    // --------------------------------------------------------

    /** 重置所有记忆，用于新游戏 */
    reset() {
        this.memories = [];
        this.summaries = [];
        this.relationships = {};
        this.inventory = [];
        this.milestones = [];
        this.currentAge = 0;
        this._nextId = 0;
    }

    /**
     * 记录一次人生事件
     * @param {number} age - 发生年龄
     * @param {string} event - 事件描述
     * @param {number} importance - 重要程度 0-1，默认自动计算
     */
    addEvent(age, event, importance = 0.5) {
        this.currentAge = Math.max(this.currentAge, age);

        const autoImportance = this._calculateImportance(event);
        const finalImportance = Math.max(importance, autoImportance);

        const entry = {
            id: this._nextId++,
            age,
            event,
            importance: Math.min(1, Math.max(0, finalImportance)),
            timestamp: Date.now(),
        };

        this.memories.push(entry);
        this._pruneMemories();

        return entry;
    }

    /**
     * 记录NPC关系
     * @param {string} name - NPC名称
     * @param {string} relation - 关系类型（如：师父、道侣、仇敌）
     * @param {number} attitude - 好感度 -100 到 100
     * @param {number} age - 初次相遇年龄
     */
    addRelationship(name, relation, attitude, age) {
        this.relationships[name] = {
            relation,
            attitude: Math.min(100, Math.max(-100, attitude)),
            firstMet: age,
            events: [],
        };
    }

    /**
     * 更新已有关系
     * @param {string} name - NPC名称
     * @param {object} updates - 更新字段 { relation?, attitude?, eventDescription? }
     */
    updateRelationship(name, updates) {
        if (!this.relationships[name]) return;

        const rel = this.relationships[name];

        if (updates.relation !== undefined) {
            rel.relation = updates.relation;
        }
        if (updates.attitude !== undefined) {
            rel.attitude = Math.min(100, Math.max(-100, updates.attitude));
        }
        if (updates.eventDescription) {
            rel.events.push({
                description: updates.eventDescription,
                age: this.currentAge,
            });
        }
    }

    /**
     * 记录获得物品
     * @param {string} name - 物品名称
     * @param {string} description - 物品描述
     * @param {number} age - 获得年龄
     * @param {string} source - 来源
     */
    addItem(name, description, age, source) {
        const existing = this.inventory.find(item => item.name === name);
        if (existing) return existing;

        const item = { name, description, acquiredAge: age, source };
        this.inventory.push(item);
        return item;
    }

    /**
     * 移除物品
     * @param {string} name - 物品名称
     * @returns {boolean} 是否成功移除
     */
    removeItem(name) {
        const index = this.inventory.findIndex(item => item.name === name);
        if (index === -1) return false;
        this.inventory.splice(index, 1);
        return true;
    }

    /**
     * 记录人生里程碑
     * @param {number} age - 年龄
     * @param {string} description - 里程碑描述
     * @param {number} importance - 重要程度 0-1
     */
    addMilestone(age, description, importance) {
        this.milestones.push({
            age,
            description,
            importance: Math.min(1, Math.max(0, importance)),
        });
        // 按年龄排序
        this.milestones.sort((a, b) => a.age - b.age);
    }

    // --------------------------------------------------------
    // 摘要生成
    // --------------------------------------------------------

    /**
     * 判断是否需要生成周期摘要
     * @param {number} age - 当前年龄
     * @returns {boolean}
     */
    shouldGenerateSummary(age) {
        if (age % this.summaryInterval !== 0 || age === 0) return false;
        const periodStart = age - this.summaryInterval;
        return !this.summaries.some(s => s.periodStart === periodStart && s.periodEnd === age);
    }

    /**
     * 生成指定周期的人生摘要
     * @param {number} age - 周期结束年龄（必须为 summaryInterval 的倍数）
     * @returns {string} 摘要文本
     */
    generatePeriodSummary(age) {
        const periodStart = age - this.summaryInterval;
        const periodEnd = age;

        // 筛选该周期内的事件，按重要性降序排列
        const periodEvents = this.memories
            .filter(m => m.age >= periodStart && m.age < periodEnd)
            .sort((a, b) => b.importance - a.importance);

        // 取前5个最重要事件
        const topEvents = periodEvents.slice(0, 5);

        // 该周期内新增或变化的关系
        const periodRelationships = [];
        for (const [name, rel] of Object.entries(this.relationships)) {
            if (rel.firstMet >= periodStart && rel.firstMet < periodEnd) {
                periodRelationships.push(`结识${name}（${rel.relation}，好感度${rel.attitude}）`);
            }
            const periodRelEvents = rel.events.filter(
                e => e.age >= periodStart && e.age < periodEnd
            );
            for (const ev of periodRelEvents) {
                periodRelationships.push(`与${name}：${ev.description}`);
            }
        }

        // 该周期内获得的物品
        const periodItems = this.inventory.filter(
            item => item.acquiredAge >= periodStart && item.acquiredAge < periodEnd
        );

        // 该周期内的里程碑
        const periodMilestones = this.milestones.filter(
            m => m.age >= periodStart && m.age < periodEnd
        );

        // 构建摘要文本
        const lines = [];
        lines.push(`【${periodStart}-${periodEnd - 1}岁 人生摘要】`);

        if (topEvents.length > 0) {
            lines.push('重要事件：');
            for (const ev of topEvents) {
                lines.push(`  ${ev.age}岁 - ${ev.event}（重要度${(ev.importance * 100).toFixed(0)}%）`);
            }
        } else {
            lines.push('重要事件：无特殊事件');
        }

        if (periodRelationships.length > 0) {
            lines.push('人际关系变化：');
            for (const r of periodRelationships) {
                lines.push(`  ${r}`);
            }
        }

        if (periodItems.length > 0) {
            lines.push('获得物品：');
            for (const item of periodItems) {
                lines.push(`  ${item.name} - ${item.description}（来源：${item.source}）`);
            }
        }

        if (periodMilestones.length > 0) {
            lines.push('里程碑：');
            for (const m of periodMilestones) {
                lines.push(`  ${m.age}岁 - ${m.description}`);
            }
        }

        const summaryText = lines.join('\n');

        // 存储摘要
        this.summaries.push({
            periodStart,
            periodEnd,
            text: summaryText,
            eventCount: periodEvents.length,
            createdAt: Date.now(),
        });

        return summaryText;
    }

    /**
     * 获取所有周期摘要
     * @returns {Array} 摘要列表
     */
    getSummaries() {
        return [...this.summaries];
    }

    // --------------------------------------------------------
    // 上下文窗口管理（AI Token优化的核心）
    // --------------------------------------------------------

    /**
     * 构建AI上下文字符串，控制在指定字符数内
     * 粗略估算：1 token ≈ 2个中文字符
     * @param {number} currentAge - 当前年龄
     * @param {number} maxTokenEstimate - 最大token估算值，默认2000
     * @returns {string} 上下文字符串
     */
    buildContext(currentAge, maxTokenEstimate = 2000) {
        const maxChars = maxTokenEstimate * 2;
        const sections = [];

        // 第一优先级：当前关系
        const relSection = this._formatRelationships();
        if (relSection) sections.push(relSection);

        // 第二优先级：当前持有物品
        const invSection = this._formatInventory();
        if (invSection) sections.push(invSection);

        // 第三优先级：全部里程碑
        const milSection = this._formatMilestones();
        if (milSection) sections.push(milSection);

        // 第四优先级：近3年事件（完整细节）
        const recentEvents = this.memories.filter(m => m.age >= currentAge - 3);
        if (recentEvents.length > 0) {
            const recentLines = recentEvents.map(
                e => `${e.age}岁：${e.event}`
            );
            sections.push('【近期事件】\n' + recentLines.join('\n'));
        }

        // 第五优先级：历史周期摘要
        if (this.summaries.length > 0) {
            const summaryTexts = this.summaries.map(s => s.text);
            sections.push('【历史摘要】\n' + summaryTexts.join('\n\n'));
        }

        // 拼接并检查长度
        let result = sections.join('\n\n');

        if (result.length <= maxChars) {
            return result;
        }

        // 超长时进行裁剪：移除历史摘要中较早的部分，保留重要事件
        return this._trimContext(sections, maxChars, currentAge);
    }

    /**
     * 当上下文超长时进行智能裁剪
     * @param {Array} sections - 各段落
     * @param {number} maxChars - 最大字符数
     * @param {number} currentAge - 当前年龄
     * @returns {string}
     */
    _trimContext(sections, maxChars, currentAge) {
        const parts = [];
        let remaining = maxChars;

        // 始终保留关系和物品（最关键信息）
        const relSection = this._formatRelationships();
        if (relSection && relSection.length <= remaining) {
            parts.push(relSection);
            remaining -= relSection.length;
        }

        const invSection = this._formatInventory();
        if (invSection && invSection.length <= remaining) {
            parts.push(invSection);
            remaining -= invSection.length;
        }

        // 尽量保留里程碑
        const milSection = this._formatMilestones();
        if (milSection && milSection.length <= remaining) {
            parts.push(milSection);
            remaining -= milSection.length;
        }

        // 添加近期事件（按重要性排序后截取）
        const recentEvents = this.memories
            .filter(m => m.age >= currentAge - 3)
            .sort((a, b) => b.importance - a.importance);

        if (recentEvents.length > 0) {
            const recentLines = [];
            for (const e of recentEvents) {
                const line = `${e.age}岁：${e.event}`;
                if (recentLines.join('\n').length + line.length + 20 < remaining) {
                    recentLines.push(line);
                } else {
                    break;
                }
            }
            if (recentLines.length > 0) {
                const recentText = '【近期事件】\n' + recentLines.join('\n');
                parts.push(recentText);
                remaining -= recentText.length;
            }
        }

        // 用剩余空间填充最重要的历史事件
        if (remaining > 50) {
            const importantEvents = this.getImportantEvents(10)
                .filter(e => e.age < currentAge - 3);
            if (importantEvents.length > 0) {
                const impLines = [];
                for (const e of importantEvents) {
                    const line = `${e.age}岁：${e.event}`;
                    if (impLines.join('\n').length + line.length + 20 < remaining) {
                        impLines.push(line);
                    } else {
                        break;
                    }
                }
                if (impLines.length > 0) {
                    parts.push('【重要历史】\n' + impLines.join('\n'));
                }
            }
        }

        return parts.join('\n\n');
    }

    /**
     * 获取最近的事件
     * @param {number} count - 返回数量，默认10
     * @returns {Array}
     */
    getRecentEvents(count = 10) {
        return this.memories
            .slice(-count)
            .map(m => ({ ...m }));
    }

    /**
     * 获取全时间线最重要的事件
     * @param {number} count - 返回数量，默认20
     * @returns {Array}
     */
    getImportantEvents(count = 20) {
        return [...this.memories]
            .sort((a, b) => b.importance - a.importance)
            .slice(0, count);
    }

    /**
     * 根据关键词搜索相关记忆
     * @param {string|string[]} keywords - 搜索关键词，字符串或数组
     * @returns {Array} 匹配的记忆条目
     */
    getRelevantMemories(keywords) {
        const keywordList = Array.isArray(keywords) ? keywords : [keywords];
        return this.memories.filter(m =>
            keywordList.some(kw => m.event.includes(kw))
        );
    }

    // --------------------------------------------------------
    // 重要性自动计算
    // --------------------------------------------------------

    /**
     * 分析事件文本自动判断重要性
     * @param {string} eventText - 事件描述
     * @returns {number} 0-1 的重要性浮点数
     */
    _calculateImportance(eventText) {
        if (!eventText || typeof eventText !== 'string') return 0.3;

        let maxWeight = 0;
        let matchCount = 0;

        for (const [keyword, weight] of Object.entries(ALL_KEYWORDS)) {
            if (eventText.includes(keyword)) {
                matchCount++;
                maxWeight = Math.max(maxWeight, weight);
            }
        }

        // 基础重要性：最高匹配权重
        let importance = maxWeight;

        // 多关键词匹配奖励（每多一个匹配额外加0.05，最多加0.2）
        if (matchCount > 1) {
            importance += Math.min(0.2, (matchCount - 1) * 0.05);
        }

        // 文本长度奖励（较长的事件描述通常更重要）
        if (eventText.length > 50) {
            importance += 0.05;
        }
        if (eventText.length > 100) {
            importance += 0.05;
        }

        // 包含数字变化的事件（属性变化）
        const numberPattern = /[+\-]\d+/g;
        const numberMatches = eventText.match(numberPattern);
        if (numberMatches) {
            const maxChange = Math.max(...numberMatches.map(n => Math.abs(parseInt(n, 10))));
            // 较大的属性变化更重要
            if (maxChange >= 10) importance += 0.1;
            if (maxChange >= 50) importance += 0.1;
        }

        // 无任何关键词命中时给予基础分
        if (matchCount === 0) {
            importance = 0.3;
        }

        return Math.min(1, Math.max(0, importance));
    }

    // --------------------------------------------------------
    // 数据持久化
    // --------------------------------------------------------

    /**
     * 导出所有记忆数据为JSON字符串
     * @returns {string} JSON字符串
     */
    exportData() {
        return JSON.stringify({
            memories: this.memories,
            summaries: this.summaries,
            relationships: this.relationships,
            inventory: this.inventory,
            milestones: this.milestones,
            currentAge: this.currentAge,
            maxMemories: this.maxMemories,
            summaryInterval: this.summaryInterval,
            exportedAt: Date.now(),
        });
    }

    /**
     * 从JSON字符串恢复记忆数据
     * @param {string} json - JSON字符串
     * @returns {boolean} 是否导入成功
     */
    importData(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.memories = Array.isArray(data.memories) ? data.memories : [];
            this.summaries = Array.isArray(data.summaries) ? data.summaries : [];
            this.relationships = data.relationships && typeof data.relationships === 'object'
                ? data.relationships : {};
            this.inventory = Array.isArray(data.inventory) ? data.inventory : [];
            this.milestones = Array.isArray(data.milestones) ? data.milestones : [];
            this.currentAge = typeof data.currentAge === 'number' ? data.currentAge : 0;
            if (typeof data.maxMemories === 'number') this.maxMemories = data.maxMemories;
            if (typeof data.summaryInterval === 'number') this.summaryInterval = data.summaryInterval;
            return true;
        } catch (err) {
            console.error('记忆数据导入失败:', err);
            return false;
        }
    }

    /**
     * 保存到浏览器localStorage
     */
    saveToLocal() {
        try {
            localStorage.setItem('life-restart-memory', this.exportData());
            return true;
        } catch (err) {
            console.error('记忆保存到本地存储失败:', err);
            return false;
        }
    }

    /**
     * 从浏览器localStorage加载
     * @returns {boolean} 是否加载成功
     */
    loadFromLocal() {
        try {
            const data = localStorage.getItem('life-restart-memory');
            if (!data) return false;
            return this.importData(data);
        } catch (err) {
            console.error('从本地存储加载记忆失败:', err);
            return false;
        }
    }

    // --------------------------------------------------------
    // 统计信息
    // --------------------------------------------------------

    /**
     * 获取记忆统计数据
     * @returns {object} 统计信息
     */
    getStats() {
        const totalEvents = this.memories.length;
        const totalRelationships = Object.keys(this.relationships).length;
        const totalItems = this.inventory.length;
        const totalMilestones = this.milestones.length;

        // 平均重要性
        const averageImportance = totalEvents > 0
            ? this.memories.reduce((sum, m) => sum + m.importance, 0) / totalEvents
            : 0;

        // 最重要的事件
        const mostImportantEvent = totalEvents > 0
            ? [...this.memories].sort((a, b) => b.importance - a.importance)[0]
            : null;

        // 关系网络图谱
        const relationshipMap = {};
        for (const [name, rel] of Object.entries(this.relationships)) {
            relationshipMap[name] = {
                relation: rel.relation,
                attitude: rel.attitude,
                interactions: rel.events.length,
            };
        }

        return {
            totalEvents,
            totalRelationships,
            totalItems,
            totalMilestones,
            averageImportance: parseFloat(averageImportance.toFixed(3)),
            mostImportantEvent,
            relationshipMap,
        };
    }

    // --------------------------------------------------------
    // AI格式化输出
    // --------------------------------------------------------

    /**
     * 生成AI专用的结构化记忆档案
     * @param {number} currentAge - 当前年龄
     * @returns {string} 格式化的记忆档案
     */
    formatForAI(currentAge) {
        const age = currentAge !== undefined ? currentAge : this.currentAge;
        const lines = [];

        lines.push('【人生记忆档案】');
        lines.push(`▸ 当前年龄: ${age}岁`);

        // 重要关系
        const relNames = Object.keys(this.relationships);
        if (relNames.length > 0) {
            const relParts = relNames.map(name => {
                const r = this.relationships[name];
                return `${name}（${r.relation}，好感${r.attitude}）`;
            });
            lines.push(`▸ 重要关系: ${relParts.join('；')}`);
        } else {
            lines.push('▸ 重要关系: 无');
        }

        // 持有物品
        if (this.inventory.length > 0) {
            const itemParts = this.inventory.map(i => `${i.name}（${i.description}）`);
            lines.push(`▸ 持有物品: ${itemParts.join('；')}`);
        } else {
            lines.push('▸ 持有物品: 无');
        }

        // 人生里程碑
        if (this.milestones.length > 0) {
            const milParts = this.milestones.map(m => `${m.age}岁-${m.description}`);
            lines.push(`▸ 人生里程碑: ${milParts.join('；')}`);
        } else {
            lines.push('▸ 人生里程碑: 无');
        }

        // 近期事件（最近5条）
        const recent = this.memories
            .filter(m => m.age >= age - 3)
            .slice(-5);
        if (recent.length > 0) {
            const evParts = recent.map(e => `${e.age}岁-${e.event}`);
            lines.push(`▸ 近期事件: ${evParts.join('；')}`);
        } else {
            lines.push('▸ 近期事件: 无');
        }

        // 历史摘要
        if (this.summaries.length > 0) {
            const sumParts = this.summaries.map(s =>
                `[${s.periodStart}-${s.periodEnd}岁] ${s.eventCount}件事`
            );
            lines.push(`▸ 历史摘要: ${sumParts.join('；')}`);
        } else {
            lines.push('▸ 历史摘要: 无');
        }

        return lines.join('\n');
    }

    // --------------------------------------------------------
    // 内部工具方法
    // --------------------------------------------------------

    /**
     * 当记忆条目超出上限时，清理低重要性的旧记忆
     * 已被摘要覆盖的低重要性事件优先移除
     */
    _pruneMemories() {
        if (this.memories.length <= this.maxMemories) return;

        // 找出已被摘要覆盖的周期
        const summarizedPeriods = new Set();
        for (const s of this.summaries) {
            for (let y = s.periodStart; y < s.periodEnd; y++) {
                summarizedPeriods.add(y);
            }
        }

        // 对已有摘要覆盖的低重要性事件标记可移除
        const removable = this.memories
            .filter(m => summarizedPeriods.has(m.age) && m.importance < 0.6)
            .sort((a, b) => a.importance - b.importance);

        const toRemove = this.memories.length - this.maxMemories;
        const removeIds = new Set(
            removable.slice(0, toRemove).map(m => m.id)
        );

        if (removeIds.size > 0) {
            this.memories = this.memories.filter(m => !removeIds.has(m.id));
            return;
        }

        // 如果可移除的不够，按重要性从低到高移除最旧的
        this.memories.sort((a, b) => {
            if (a.importance !== b.importance) return a.importance - b.importance;
            return a.age - b.age;
        });
        this.memories = this.memories.slice(toRemove);
        // 恢复按时间顺序
        this.memories.sort((a, b) => {
            if (a.age !== b.age) return a.age - b.age;
            return a.id - b.id;
        });
    }

    /**
     * 格式化关系列表
     * @returns {string}
     */
    _formatRelationships() {
        const names = Object.keys(this.relationships);
        if (names.length === 0) return '';

        const lines = names.map(name => {
            const r = this.relationships[name];
            return `  ${name}：${r.relation}（好感度${r.attitude}，${r.firstMet}岁相识）`;
        });
        return '【人际关系】\n' + lines.join('\n');
    }

    /**
     * 格式化物品列表
     * @returns {string}
     */
    _formatInventory() {
        if (this.inventory.length === 0) return '';

        const lines = this.inventory.map(
            item => `  ${item.name}：${item.description}（${item.acquiredAge}岁获得）`
        );
        return '【持有物品】\n' + lines.join('\n');
    }

    /**
     * 格式化里程碑列表
     * @returns {string}
     */
    _formatMilestones() {
        if (this.milestones.length === 0) return '';

        const lines = this.milestones.map(
            m => `  ${m.age}岁：${m.description}`
        );
        return '【人生里程碑】\n' + lines.join('\n');
    }
}

// ============================================================
// 导出单例实例
// ============================================================

export const memoryEngine = new MemoryEngine();
