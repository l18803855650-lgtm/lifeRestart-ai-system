/**
 * 记忆管理系统
 * 负责记录关键事件、道具、NPC 关系，并生成记忆摘要
 */

export const MEMORY_CONFIG = {
    // 记忆保留的最大条目数
    MAX_MEMORIES: 100,

    // 多少年生成一次摘要
    SUMMARY_INTERVAL: 10,

    // 摘要的最大长度
    MAX_SUMMARY_LENGTH: 500,

    // 记忆重要性阈值
    IMPORTANCE_THRESHOLD: 0.6,

    // 记忆过期时间（毫秒）
    MEMORY_EXPIRE_TIME: 86400000 * 7, // 7天
};

/**
 * 记忆条目类型
 */
export const MEMORY_TYPES = {
    EVENT: 'event',
    RELATIONSHIP: 'relationship',
    ITEM: 'item',
    ACHIEVEMENT: 'achievement',
    MILESTONE: 'milestone',
    SYSTEM: 'system'
};

/**
 * 记忆条目类
 */
class MemoryEntry {
    constructor(type, content, metadata = {}) {
        this.id = this.#generateId();
        this.type = type;
        this.content = content;
        this.metadata = {
            timestamp: Date.now(),
            importance: metadata.importance || 0.5,
            age: metadata.age || null,
            tags: metadata.tags || [],
            relatedSystem: metadata.relatedSystem || null,
            ...metadata
        };
        this.accessCount = 0;
        this.lastAccess = Date.now();
    }

    #generateId() {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    access() {
        this.accessCount++;
        this.lastAccess = Date.now();
        return this;
    }

    isExpired() {
        const age = Date.now() - this.metadata.timestamp;
        return age > MEMORY_CONFIG.MEMORY_EXPIRE_TIME;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            content: this.content,
            metadata: this.metadata,
            accessCount: this.accessCount,
            lastAccess: this.lastAccess
        };
    }
}

/**
 * 记忆摘要类
 */
class MemorySummary {
    constructor() {
        this.summaries = [];
        this.currentYear = 0;
        this.currentEvents = [];
    }

    addEvent(event) {
        this.currentEvents.push(event);
    }

    generateSummary(year) {
        if (this.currentEvents.length === 0) {
            return null;
        }

        const summary = this.#createSummary(year, this.currentEvents);

        this.summaries.push({
            year,
            timestamp: Date.now(),
            summary: summary.text,
            keyPoints: summary.keyPoints
        });

        this.currentEvents = [];
        this.currentYear = year;

        return summary;
    }

    #createSummary(year, events) {
        // 按重要性排序事件
        const sortedEvents = [...events].sort((a, b) =>
            b.metadata.importance - a.metadata.importance
        );

        // 选择最重要的事件
        const importantEvents = sortedEvents.slice(0, 5);

        // 生成摘要文本
        const summaryLines = [
            `${year}岁时，你经历了：`
        ];

        for (const event of importantEvents) {
            summaryLines.push(`• ${event.content.substring(0, 50)}...`);
        }

        // 提取关键点
        const keyPoints = importantEvents.map(event => ({
            type: event.type,
            content: event.content,
            importance: event.metadata.importance
        }));

        return {
            text: summaryLines.join('\n'),
            keyPoints
        };
    }

    getRelevantSummaries(contextAge, limit = 3) {
        // 获取最近的摘要
        return this.summaries
            .filter(summary => summary.year <= contextAge)
            .slice(-limit);
    }

    toJSON() {
        return {
            summaries: this.summaries,
            currentYear: this.currentYear,
            currentEvents: this.currentEvents
        };
    }
}

/**
 * 记忆管理器
 */
export class MemoryManager {
    constructor() {
        this.memories = [];
        this.summary = new MemorySummary();
        this.relationShips = new Map();
        this.inventory = new Map();
    }

    /**
     * 添加记忆
     */
    addMemory(type, content, metadata = {}) {
        const memory = new MemoryEntry(type, content, metadata);
        this.memories.push(memory);

        // 维护记忆数量限制
        if (this.memories.length > MEMORY_CONFIG.MAX_MEMORIES) {
            this.#cleanupMemories();
        }

        // 根据类型更新专门的数据结构
        this.#updateSpecializedStructures(memory);

        return memory;
    }

    /**
     * 添加年度事件
     */
    addYearlyEvent(age, content, metadata = {}) {
        const eventMetadata = {
            age,
            importance: metadata.importance || this.#calculateImportance(content),
            tags: ['yearly', age.toString()],
            ...metadata
        };

        return this.addMemory(MEMORY_TYPES.EVENT, content, eventMetadata);
    }

    /**
     * 添加关系记忆
     */
    addRelationship(name, relationshipType, metadata = {}) {
        const content = `${name}：${relationshipType}`;
        const eventMetadata = {
            importance: metadata.importance || 0.7,
            tags: ['relationship', relationshipType, name],
            relatedEntity: name,
            ...metadata
        };

        const memory = this.addMemory(MEMORY_TYPES.RELATIONSHIP, content, eventMetadata);

        // 更新关系图谱
        if (!this.relationShips.has(name)) {
            this.relationShips.set(name, []);
        }

        this.relationShips.get(name).push({
            type: relationshipType,
            timestamp: Date.now(),
            metadata
        });

        return memory;
    }

    /**
     * 添加道具记忆
     */
    addItem(itemName, itemType, metadata = {}) {
        const content = `获得${itemName}（${itemType}）`;
        const eventMetadata = {
            importance: metadata.importance || 0.6,
            tags: ['item', itemType, itemName],
            relatedEntity: itemName,
            ...metadata
        };

        const memory = this.addMemory(MEMORY_TYPES.ITEM, content, eventMetadata);

        // 更新库存
        this.inventory.set(itemName, {
            type: itemType,
            count: (this.inventory.get(itemName)?.count || 0) + 1,
            timestamp: Date.now(),
            metadata
        });

        return memory;
    }

    /**
     * 添加系统记忆
     */
    addSystemEvent(systemName, content, metadata = {}) {
        const eventMetadata = {
            importance: metadata.importance || 0.8,
            tags: ['system', systemName],
            relatedSystem: systemName,
            ...metadata
        };

        return this.addMemory(MEMORY_TYPES.SYSTEM, content, eventMetadata);
    }

    /**
     * 检查是否需要生成摘要
     */
    shouldGenerateSummary(age) {
        const yearsSinceLastSummary = age - this.summary.currentYear;
        return yearsSinceLastSummary >= MEMORY_CONFIG.SUMMARY_INTERVAL;
    }

    /**
     * 生成年度摘要
     */
    generateYearlySummary(age) {
        // 收集这一年的所有重要事件
        const yearEvents = this.memories.filter(memory =>
            memory.metadata.age === age &&
            memory.metadata.importance >= MEMORY_CONFIG.IMPORTANCE_THRESHOLD
        );

        if (yearEvents.length === 0) {
            return null;
        }

        return this.summary.generateSummary(age);
    }

    /**
     * 查找相关记忆
     */
    findMemories(query, limit = 10) {
        const lowerQuery = query.toLowerCase();

        let results = this.memories.filter(memory => {
            return memory.content.toLowerCase().includes(lowerQuery) ||
                   memory.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        });

        // 根据相关性和访问频率排序
        results = results.sort((a, b) => {
            const scoreA = a.metadata.importance + (a.accessCount * 0.1);
            const scoreB = b.metadata.importance + (b.accessCount * 0.1);
            return scoreB - scoreA;
        });

        // 访问结果，增加访问计数
        results.forEach(memory => memory.access());

        return results.slice(0, limit);
    }

    /**
     * 获取特定类型的记忆
     */
    getMemoriesByType(type, limit = 10) {
        return this.memories
            .filter(memory => memory.type === type)
            .slice(0, limit);
    }

    /**
     * 获取特定年龄范围的记忆
     */
    getMemoriesByAgeRange(minAge, maxAge, limit = 10) {
        return this.memories
            .filter(memory =>
                memory.metadata.age !== null &&
                memory.metadata.age >= minAge &&
                memory.metadata.age <= maxAge
            )
            .slice(0, limit);
    }

    /**
     * 获取关系信息
     */
    getRelationships(name) {
        return this.relationShips.get(name) || [];
    }

    /**
     * 获取所有关系
     */
    getAllRelationships() {
        const allRelationships = {};

        for (const [name, relationships] of this.relationShips) {
            allRelationships[name] = relationships;
        }

        return allRelationships;
    }

    /**
     * 获取库存
     */
    getInventory() {
        const inventory = {};
        for (const [name, item] of this.inventory) {
            inventory[name] = item;
        }
        return inventory;
    }

    /**
     * 生成上下文字符串（用于 AI 提示）
     */
    generateContextString(currentAge, maxTokens = 1000) {
        const contextParts = [];

        // 添加最近的重要事件
        const recentEvents = this.getMemoriesByAgeRange(
            Math.max(0, currentAge - 5),
            currentAge,
            3
        );

        if (recentEvents.length > 0) {
            contextParts.push('最近重要事件：');
            for (const event of recentEvents) {
                contextParts.push(`• ${event.content}`);
            }
        }

        // 添加关键关系
        const relationships = this.getAllRelationships();
        const relationshipNames = Object.keys(relationships).slice(0, 5);

        if (relationshipNames.length > 0) {
            contextParts.push('\n重要人物关系：');
            for (const name of relationshipNames) {
                const latestRelation = relationships[name][0];
                contextParts.push(`• ${name}：${latestRelation.type}`);
            }
        }

        // 添加历史摘要
        const summaries = this.summary.getRelevantSummaries(currentAge, 2);
        if (summaries.length > 0) {
            contextParts.push('\n历史摘要：');
            for (const summary of summaries) {
                contextParts.push(`• ${summary.year}岁：${summary.summary.substring(0, 50)}...`);
            }
        }

        let contextString = contextParts.join('\n');

        // 如果太长，截断
        if (contextString.length > maxTokens) {
            contextString = contextString.substring(0, maxTokens) + '...';
        }

        return contextString;
    }

    /**
     * 导出记忆数据
     */
    exportData() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            memories: this.memories.map(memory => memory.toJSON()),
            summary: this.summary.toJSON(),
            relationships: this.getAllRelationships(),
            inventory: this.getInventory()
        };
    }

    /**
     * 导入记忆数据
     */
    importData(data) {
        if (data.version !== '1.0') {
            throw new Error('不支持的记忆数据版本');
        }

        this.memories = data.memories.map(memoryData =>
            Object.assign(new MemoryEntry(memoryData.type, memoryData.content, memoryData.metadata), memoryData)
        );

        // 重建摘要
        this.summary = new MemorySummary();
        for (const summaryData of data.summary.summaries) {
            this.summary.summaries.push(summaryData);
            this.summary.currentYear = summaryData.year;
        }

        // 重建关系
        this.relationShips = new Map();
        for (const [name, relationships] of Object.entries(data.relationships)) {
            this.relationShips.set(name, relationships);
        }

        // 重建库存
        this.inventory = new Map();
        for (const [name, item] of Object.entries(data.inventory)) {
            this.inventory.set(name, item);
        }

        return true;
    }

    /**
     * 清理过期记忆
     */
    #cleanupMemories() {
        // 删除过期且访问次数少的记忆
        const now = Date.now();
        this.memories = this.memories.filter(memory => {
            if (memory.isExpired()) {
                return memory.accessCount > 2; // 保留访问次数多的
            }
            return true;
        });

        // 如果还是太多，删除重要性最低的
        if (this.memories.length > MEMORY_CONFIG.MAX_MEMORIES) {
            this.memories.sort((a, b) => {
                const scoreA = a.metadata.importance + (a.accessCount * 0.1) - (now - a.lastAccess) / MEMORY_CONFIG.MEMORY_EXPIRE_TIME;
                const scoreB = b.metadata.importance + (b.accessCount * 0.1) - (now - b.lastAccess) / MEMORY_CONFIG.MEMORY_EXPIRE_TIME;
                return scoreB - scoreA;
            });

            this.memories = this.memories.slice(0, MEMORY_CONFIG.MAX_MEMORIES);
        }
    }

    /**
     * 更新专门的数据结构
     */
    #updateSpecializedStructures(memory) {
        // 已在各自的方法中处理
    }

    /**
     * 计算内容重要性
     */
    #calculateImportance(content) {
        let importance = 0.5;

        // 关键词增加重要性
        const importantKeywords = ['获得', '突破', '成就', '死亡', '结婚', '成功', '失败', '危机'];
        for (const keyword of importantKeywords) {
            if (content.includes(keyword)) {
                importance += 0.1;
            }
        }

        // 内容长度影响重要性
        if (content.length > 50) {
            importance += 0.1;
        }

        return Math.min(1.0, importance);
    }

    /**
     * 获取记忆统计
     */
    getStatistics() {
        const stats = {
            total: this.memories.length,
            byType: {},
            totalRelationships: this.relationShips.size,
            totalItems: this.inventory.size,
            summariesGenerated: this.summary.summaries.length
        };

        for (const memory of this.memories) {
            if (!stats.byType[memory.type]) {
                stats.byType[memory.type] = 0;
            }
            stats.byType[memory.type]++;
        }

        return stats;
    }
}

/**
 * 创建全局记忆管理器实例
 */
export const memoryManager = new MemoryManager();

export default MemoryManager;