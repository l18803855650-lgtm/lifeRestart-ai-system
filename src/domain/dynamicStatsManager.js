/**
 * 动态数值面板管理器
 * 支持不同系统定义额外属性，并动态渲染UI
 */

export class DynamicStatsManager {
    constructor() {
        this.#systemSchemas = new Map();
        this.#activeStats = new Map();
        this.#customRenderers = new Map();
    }

    /**
     * 注册系统的额外属性 schema
     */
    registerSystemSchema(systemId, schema) {
        if (!this.#validateSchema(schema)) {
            console.warn(`Invalid schema for system: ${systemId}`);
            return;
        }

        this.#systemSchemas.set(systemId, schema);
    }

    /**
     * 激活系统的属性面板
     */
    activateSystem(systemId, initialValues = {}) {
        const schema = this.#systemSchemas.get(systemId);
        if (!schema) {
            console.warn(`No schema found for system: ${systemId}`);
            return;
        }

        // 初始化属性值
        const stats = new Map();
        for (const statId of schema.stats) {
            const definition = schema.definitions[statId];
            stats.set(statId, {
                id: statId,
                value: initialValues[statId] !== undefined
                    ? initialValues[statId]
                    : definition.defaultValue,
                definition
            });
        }

        this.#activeStats.set(systemId, stats);
        this.#notifyUpdate(systemId);
    }

    /**
     * 获取系统的属性值
     */
    getStatValue(systemId, statId) {
        const stats = this.#activeStats.get(systemId);
        if (!stats) return null;

        const stat = stats.get(statId);
        return stat ? stat.value : null;
    }

    /**
     * 设置系统的属性值
     */
    setStatValue(systemId, statId, value) {
        const stats = this.#activeStats.get(systemId);
        if (!stats) return;

        const stat = stats.get(statId);
        if (!stat) return;

        // 应用属性验证
        const { min, max } = stat.definition;
        const clampedValue = this.#clamp(value, min, max);

        stat.value = clampedValue;
        this.#notifyUpdate(systemId, statId);
    }

    /**
     * 修改属性值（相对变化）
     */
    modifyStatValue(systemId, statId, delta) {
        const currentValue = this.getStatValue(systemId, statId);
        if (currentValue === null) return;

        const newValue = currentValue + delta;
        this.setStatValue(systemId, statId, newValue);
    }

    /**
     * 获取系统的所有属性
     */
    getSystemStats(systemId) {
        const stats = this.#activeStats.get(systemId);
        if (!stats) return {};

        const result = {};
        for (const [statId, stat] of stats) {
            result[statId] = {
                value: stat.value,
                ...stat.definition
            };
        }
        return result;
    }

    /**
     * 生成属性面板的渲染数据
     */
    generateRenderData(systemId) {
        const stats = this.#activeStats.get(systemId);
        if (!stats) return null;

        const renderData = {
            systemId,
            sections: [],
            summary: this.#generateSummary(stats)
        };

        // 按组分组属性
        const groupedStats = this.#groupStatsByCategory(stats);

        for (const [category, categoryStats] of groupedStats) {
            const section = {
                title: category,
                stats: []
            };

            for (const [statId, stat] of categoryStats) {
                const statData = {
                    id: statId,
                    label: stat.definition.label,
                    value: stat.value,
                    icon: stat.definition.icon,
                    color: stat.definition.color,
                    bar: this.#calculateBarData(stat),
                    description: stat.definition.description,
                    trend: this.#calculateTrend(stat)
                };

                section.stats.push(statData);
            }

            renderData.sections.push(section);
        }

        return renderData;
    }

    /**
     * 注册自定义渲染器
     */
    registerCustomRenderer(statId, renderer) {
        this.#customRenderers.set(statId, renderer);
    }

    /**
     * 检查属性是否有自定义渲染器
     */
    hasCustomRenderer(statId) {
        return this.#customRenderers.has(statId);
    }

    /**
     * 使用自定义渲染器渲染属性
     */
    renderWithCustomRenderer(statId, statData) {
        const renderer = this.#customRenderers.get(statId);
        if (!renderer) return null;

        return renderer(statData);
    }

    /**
     * 注销系统
     */
    deactivateSystem(systemId) {
        this.#activeStats.delete(systemId);
        this.#notifyUpdate(systemId);
    }

    /**
     * 获取所有已激活的系统ID
     */
    getActiveSystems() {
        return Array.from(this.#activeStats.keys());
    }

    /**
     * 导出系统属性数据
     */
    exportSystemData(systemId) {
        const stats = this.#activeStats.get(systemId);
        if (!stats) return null;

        const data = {
            systemId,
            timestamp: Date.now(),
            stats: {}
        };

        for (const [statId, stat] of stats) {
            data.stats[statId] = {
                value: stat.value,
                definition: stat.definition
            };
        }

        return data;
    }

    /**
     * 导入系统属性数据
     */
    importSystemData(systemId, data) {
        if (data.systemId !== systemId) {
            console.warn('System ID mismatch during import');
            return;
        }

        const stats = this.#activeStats.get(systemId);
        if (!stats) return;

        for (const [statId, importData] of Object.entries(data.stats)) {
            const stat = stats.get(statId);
            if (stat) {
                stat.value = importData.value;
            }
        }

        this.#notifyUpdate(systemId);
    }

    /**
     * 验证 schema
     */
    #validateSchema(schema) {
        if (!schema.stats || !Array.isArray(schema.stats)) {
            return false;
        }

        if (!schema.definitions || typeof schema.definitions !== 'object') {
            return false;
        }

        // 检查每个属性定义
        for (const statId of schema.stats) {
            const definition = schema.definitions[statId];
            if (!definition || !definition.label || typeof definition.type === 'undefined') {
                return false;
            }

            // 验证类型
            const validTypes = ['number', 'string', 'boolean', 'progress'];
            if (!validTypes.includes(definition.type)) {
                return false;
            }

            // 对于数值类型，检查范围
            if (definition.type === 'number' || definition.type === 'progress') {
                if (definition.min !== undefined && typeof definition.min !== 'number') {
                    return false;
                }
                if (definition.max !== undefined && typeof definition.max !== 'number') {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 限制数值范围
     */
    #clamp(value, min, max) {
        if (min !== undefined && value < min) return min;
        if (max !== undefined && value > max) return max;
        return value;
    }

    /**
     * 按类别分组属性
     */
    #groupStatsByCategory(stats) {
        const grouped = new Map();

        for (const [statId, stat] of stats) {
            const category = stat.definition.category || 'default';
            if (!grouped.has(category)) {
                grouped.set(category, new Map());
            }
            grouped.get(category).set(statId, stat);
        }

        return grouped;
    }

    /**
     * 计算进度条数据
     */
    #calculateBarData(stat) {
        const { type, min, max } = stat.definition;

        if (type !== 'progress') return null;

        const progress = min !== undefined && max !== undefined
            ? ((stat.value - min) / (max - min)) * 100
            : 0;

        return {
            progress: Math.max(0, Math.min(100, progress)),
            color: this.#getProgressColor(progress)
        };
    }

    /**
     * 获取进度条颜色
     */
    #getProgressColor(progress) {
        if (progress >= 80) return '#4ade80'; // 绿色
        if (progress >= 60) return '#60a5fa'; // 蓝色
        if (progress >= 40) return '#fbbf24'; // 黄色
        if (progress >= 20) return '#f97316'; // 橙色
        return '#ef4444'; // 红色
    }

    /**
     * 计算属性趋势
     */
    #calculateTrend(stat) {
        // 这里可以记录历史值来计算趋势
        // 简化实现，基于当前值和默认值的比较
        const { defaultValue } = stat.definition;

        if (defaultValue === undefined) return 'neutral';

        if (stat.value > defaultValue) return 'up';
        if (stat.value < defaultValue) return 'down';
        return 'neutral';
    }

    /**
     * 生成属性摘要
     */
    #generateSummary(stats) {
        const summary = {
            total: stats.size,
            enhanced: 0,
            critical: [],
            advice: []
        };

        for (const [statId, stat] of stats) {
            const value = stat.value;
            const { type, min, max, criticalThreshold } = stat.definition;

            // 计算增强状态
            if (type === 'number' || type === 'progress') {
                if (max !== undefined && value > max * 0.8) {
                    summary.enhanced++;
                }

                if (criticalThreshold !== undefined && value <= criticalThreshold) {
                    summary.critical.push(stat.definition.label);
                }
            }
        }

        // 生成建议
        if (summary.critical.length > 0) {
            summary.advice.push(`注意：${summary.critical.join('、')}处于危急状态`);
        } else if (summary.enhanced > 0) {
            summary.advice.push(`${summary.enhanced}个属性已达到优秀状态`);
        }

        return summary;
    }

    /**
     * 通知更新
     */
    #notifyUpdate(systemId, statId = null) {
        // 这里可以触发自定义事件通知UI更新
        if (typeof window !== 'undefined' && window.$$event) {
            window.$$event('stats-update', {
                systemId,
                statId,
                timestamp: Date.now()
            });
        }
    }
}

/**
 * 预定义的系统属性 schema
 */
export const PREDEFINED_SYSTEM_SCHEMAS = {
    cultivation: {
        stats: ['spirit_power', 'enlightenment', 'luck', 'defense'],
        definitions: {
            spirit_power: {
                label: '灵力',
                type: 'progress',
                defaultValue: 10,
                min: 0,
                max: 100,
                icon: '⚡',
                color: '#8b5cf6',
                description: '修仙者的根本力量来源',
                category: '修炼',
                criticalThreshold: 5
            },
            enlightenment: {
                label: '悟性',
                type: 'number',
                defaultValue: 5,
                min: 0,
                max: 20,
                icon: '💡',
                color: '#3b82f6',
                description: '对天地法则的理解能力',
                category: '修炼'
            },
            luck: {
                label: '气运',
                type: 'progress',
                defaultValue: 50,
                min: 0,
                max: 100,
                icon: '🌟',
                color: '#fbbf24',
                description: '天道的眷顾程度',
                category: '运势'
            },
            defense: {
                label: '防御',
                type: 'number',
                defaultValue: 5,
                min: 0,
                max: 50,
                icon: '🛡️',
                color: '#10b981',
                description: '抵御外部攻击的能力',
                category: '战斗'
            }
        }
    },

    tycoon: {
        stats: ['wealth', 'influence', 'connections', 'reputation'],
        definitions: {
            wealth: {
                label: '财富',
                type: 'number',
                defaultValue: 1000,
                min: 0,
                icon: '💰',
                color: '#fbbf24',
                description: '当前的资产总值',
                category: '资源'
            },
            influence: {
                label: '影响力',
                type: 'progress',
                defaultValue: 10,
                min: 0,
                max: 100,
                icon: '📊',
                color: '#8b5cf6',
                description: '在商业和社会中的影响力',
                category: '权力'
            },
            connections: {
                label: '人脉',
                type: 'number',
                defaultValue: 5,
                min: 0,
                icon: '🤝',
                color: '#3b82f6',
                description: '认识的重要人物数量',
                category: '资源'
            },
            reputation: {
                label: '商誉',
                type: 'progress',
                defaultValue: 75,
                min: 0,
                max: 100,
                icon: '⭐',
                color: '#10b981',
                description: '在商业圈的声誉',
                category: '权力'
            }
        }
    },

    villain: {
        stats: ['dominance', 'schemes', 'resources', 'enemies'],
        definitions: {
            dominance: {
                label: '控制力',
                type: 'progress',
                defaultValue: 20,
                min: 0,
                max: 100,
                icon: '👑',
                color: '#8b5cf6',
                description: '对局面的掌控程度',
                category: '权力'
            },
            schemes: {
                label: '阴谋',
                type: 'number',
                defaultValue: 3,
                min: 0,
                icon: '🎭',
                color: '#6366f1',
                description: '正在进行的计划数量',
                category: '策略'
            },
            resources: {
                label: '资源',
                type: 'number',
                defaultValue: 500,
                min: 0,
                icon: '📦',
                color: '#fbbf24',
                description: '可支配的各种资源总和',
                category: '资源'
            },
            enemies: {
                label: '敌对',
                type: 'number',
                defaultValue: 2,
                min: 0,
                icon: '⚔️',
                color: '#ef4444',
                description: '当前对抗的势力数量',
                category: '关系'
            }
        }
    }
};

/**
 * 创建并初始化动态属性管理器
 */
export function createDynamicStatsManager() {
    const manager = new DynamicStatsManager();

    // 注册预定义的系统 schema
    for (const [systemId, schema] of Object.entries(PREDEFINED_SYSTEM_SCHEMAS)) {
        manager.registerSystemSchema(systemId, schema);
    }

    return manager;
}

export const dynamicStatsManager = createDynamicStatsManager();