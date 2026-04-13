/**
 * 系统分享码 Schema
 * 支持系统配置的导入导出
 */

export const SYSTEM_SHARE_SCHEMA_VERSION = '1.0.0';

/**
 * 系统分享码数据结构
 */
export class SystemShareCode {
    static generateFromSystem(system) {
        return {
            version: SYSTEM_SHARE_SCHEMA_VERSION,
            timestamp: Date.now(),
            system: {
                id: system.id,
                name: system.name,
                description: system.description,
                theme: system.theme,
                grade: system.grade,
                weights: system.weights,
                abilities: this.#compressAbilities(system.abilities),
                milestones: this.#compressMilestones(system.milestones),
                start: system.start
            },
            metadata: {
                creator: 'system-generator',
                difficulty: this.#calculateDifficulty(system),
                playstyle: this.#identifyPlaystyle(system),
                tags: this.#generateTags(system)
            }
        };
    }

    static parseFromCode(code) {
        try {
            const data = JSON.parse(atob(code));
            if (data.version !== SYSTEM_SHARE_SCHEMA_VERSION) {
                throw new Error(`不支持的版本: ${data.version}`);
            }
            return this.#validateAndNormalize(data);
        } catch (error) {
            throw new Error(`解析分享码失败: ${error.message}`);
        }
    }

    static generateCode(data) {
        try {
            const compressed = JSON.stringify(data);
            return btoa(compressed);
        } catch (error) {
            throw new Error(`生成分享码失败: ${error.message}`);
        }
    }

    static exportToFile(data, filename = 'system-share.json') {
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    static async importFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            return this.#validateAndNormalize(data);
        } catch (error) {
            throw new Error(`导入文件失败: ${error.message}`);
        }
    }

    static validateSystem(systemData) {
        const errors = [];

        if (!systemData.id || typeof systemData.id !== 'string') {
            errors.push('系统ID不能为空');
        }

        if (!systemData.name || typeof systemData.name !== 'string') {
            errors.push('系统名称不能为空');
        }

        if (!systemData.description || typeof systemData.description !== 'string') {
            errors.push('系统描述不能为空');
        }

        if (!systemData.theme || typeof systemData.theme !== 'string') {
            errors.push('系统主题不能为空');
        }

        if (typeof systemData.grade !== 'number' || systemData.grade < 0 || systemData.grade > 5) {
            errors.push('系统等级必须在0-5之间');
        }

        if (!systemData.weights || typeof systemData.weights !== 'object') {
            errors.push('系统权重配置不正确');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static generatePreview(shareCode) {
        const { system, metadata } = shareCode;

        return {
            id: system.id,
            name: system.name,
            theme: system.theme,
            difficulty: metadata.difficulty,
            playstyle: metadata.playstyle,
            tags: metadata.tags,
            grade: system.grade,
            abilitiesCount: Object.keys(system.abilities || {}).length,
            milestonesCount: system.milestones?.length || 0
        };
    }

    static #compressAbilities(abilities) {
        if (!abilities) return {};

        const compressed = {};
        for (const [id, ability] of Object.entries(abilities)) {
            compressed[id] = {
                n: ability.name,
                d: ability.description,
                g: ability.grade,
                t: ability.tick,
                tr: ability.trigger,
                e: ability.effect
            };
        }

        return compressed;
    }

    static #decompressAbilities(compressed) {
        const abilities = {};

        for (const [id, compressed] of Object.entries(compressed)) {
            abilities[id] = {
                id,
                name: compressed.n,
                description: compressed.d,
                grade: compressed.g,
                tick: compressed.t,
                trigger: compressed.tr,
                effect: compressed.e
            };
        }

        return abilities;
    }

    static #compressMilestones(milestones) {
        if (!milestones) return [];

        return milestones.map(milestone => ({
            i: milestone.id,
            n: milestone.name,
            d: milestone.description,
            g: milestone.grade,
            c: milestone.condition,
            e: milestone.effect,
            l: milestone.levelUp,
            u: milestone.unlockAbilities,
            gl: milestone.goal
        }));
    }

    static #decompressMilestones(compressed) {
        return compressed.map(milestone => ({
            id: milestone.i,
            name: milestone.n,
            description: milestone.d,
            grade: milestone.g,
            condition: milestone.c,
            effect: milestone.e,
            levelUp: milestone.l,
            unlockAbilities: milestone.u,
            goal: milestone.gl
        }));
    }

    static #calculateDifficulty(system) {
        let difficulty = 1;
        const weights = system.weights || {};

        // 基于基础权重计算
        const weightSum = Object.values(weights).reduce((sum, val) => sum + (val || 0), 0);
        difficulty += Math.floor(weightSum / 2);

        // 基于等级调整
        difficulty += system.grade || 0;

        // 基于能力数量调整
        const abilitiesCount = Object.keys(system.abilities || {}).length;
        difficulty += Math.floor(abilitiesCount / 2);

        // 基于里程碑数量调整
        const milestonesCount = system.milestones?.length || 0;
        difficulty += Math.floor(milestonesCount / 3);

        return Math.min(5, Math.max(1, difficulty)); // 限制在1-5之间
    }

    static #identifyPlaystyle(system) {
        const weights = system.weights || {};
        const maxWeight = Math.max(...Object.values(weights).filter(v => v > 0));
        const dominantTraits = Object.entries(weights)
            .filter(([_, weight]) => weight === maxWeight)
            .map(([key, _]) => key);

        const playstyles = {
            CHR: ['颜值流', '外貌导向'],
            INT: ['智力流', '学术导向'],
            STR: ['体质流', '武力导向'],
            MNY: ['家境流', '财富导向'],
            base: ['平衡流', '全面发展']
        };

        const dominantPlaystyle = dominantTraits.length > 0
            ? playstyles[dominantTraits[0]]
            : playstyles.base;

        return dominantPlaystyle?.[0] || '平衡流';
    }

    static #generateTags(system) {
        const tags = [];

        // 基于主题生成标签
        const themeTags = {
            '修仙 / 境界 / 机缘': ['修仙', '玄幻', '境界'],
            '神豪 / 消费 / 返利': ['神豪', '财富', '消费'],
            '打脸 / 反派 / 截胡': ['反派', '打脸', '逆袭'],
            '养成 / 日常 / 欧皇': ['养成', '日常', '欧皇']
        };

        if (system.theme) {
            const themeTag = Object.entries(themeTags).find(([key, _]) =>
                system.theme.includes(key)
            );
            if (themeTag) {
                tags.push(...themeTag[1]);
            }
        }

        // 基于等级添加标签
        const gradeTags = {
            1: ['入门'],
            2: ['进阶'],
            3: ['高级'],
            4: ['专家'],
            5: ['大师']
        };
        if (system.grade && gradeTags[system.grade]) {
            tags.push(gradeTags[system.grade][0]);
        }

        // 基于主题描述添加标签
        const description = system.description?.toLowerCase() || '';
        if (description.includes('签到')) tags.push('签到');
        if (description.includes('修仙') || description.includes('境界')) tags.push('修炼');
        if (description.includes('赚钱') || description.includes('财富')) tags.push('赚钱');
        if (description.includes('打脸') || description.includes('逆袭')) tags.push('爽文');

        return [...new Set(tags)]; // 去重
    }

    static #validateAndNormalize(data) {
        if (!data.version || data.version !== SYSTEM_SHARE_SCHEMA_VERSION) {
            throw new Error('不支持的分享码版本');
        }

        if (!data.system || !data.metadata) {
            throw new Error('分享码格式不正确');
        }

        // 验证系统数据
        const validation = this.validateSystem(data.system);
        if (!validation.valid) {
            throw new Error(`系统数据无效: ${validation.errors.join(', ')}`);
        }

        // 解压数据
        data.system.abilities = this.#decompressAbilities(data.system.abilities || {});
        data.system.milestones = this.#decompressMilestones(data.system.milestones || []);

        return data;
    }

    static generateTemplate() {
        return {
            version: SYSTEM_SHARE_SCHEMA_VERSION,
            system: {
                id: 'custom-system',
                name: '自定义系统',
                description: '描述你的系统功能和特色',
                theme: '自定义主题',
                grade: 2,
                weights: {
                    base: 1,
                    CHR: 0.5,
                    INT: 0.5,
                    STR: 0.5,
                    MNY: 0.5
                },
                abilities: {
                    'ability-1': {
                        name: '能力名称',
                        description: '能力描述',
                        grade: 1,
                        trigger: {
                            every: 1,
                            startAge: 1
                        },
                        effect: {
                            CHR: 1
                        },
                        tick: '能力触发时的描述'
                    }
                },
                milestones: [
                    {
                        id: 'milestone-1',
                        name: '里程碑名称',
                        description: '里程碑描述',
                        grade: 2,
                        condition: 'AGE>=10',
                        levelUp: 1,
                        goal: '下一步目标描述'
                    }
                ],
                start: {
                    level: 1,
                    energy: 3,
                    description: '系统启动时的描述',
                    effect: {
                        SPR: 2,
                        PTS: 1
                    },
                    unlockAbilities: []
                }
            },
            metadata: {
                creator: 'user',
                difficulty: 2,
                playstyle: '平衡流',
                tags: ['自定义']
            }
        };
    }
}

export default SystemShareCode;