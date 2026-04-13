/**
 * 本地规则兜底引擎
 * 确保在无API Key、接口失败、超时等情况下游戏仍可正常进行
 */

class LocalRuleEngine {
    constructor() {
        this.cache = new Map();
        this.lastCleanup = Date.now();
        this.cacheDuration = 3600000; // 1小时
    }

    /**
     * 生成年度事件的本地规则
     */
    generateYearlyEvent(context) {
        const { age, properties, system, talents } = context;
        const cacheKey = this.#generateCacheKey('yearly', age, system?.id);

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheDuration) {
                return cached.data;
            }
        }

        const event = this.#generateLocalEvent(age, properties, system, talents);

        this.cache.set(cacheKey, {
            timestamp: Date.now(),
            data: event
        });

        return event;
    }

    /**
     * 生成系统对话的本地回复
     */
    generateSystemReply(prompt, context) {
        const { system, phase, properties, recentTrajectory } = context;
        const systemType = system?.id || 'default';

        const responses = this.#getLocalResponses(systemType, phase, prompt);
        const selected = this.#selectResponse(responses, context);

        return {
            reply: selected,
            source: 'local'
        };
    }

    /**
     * 生成系统建议
     */
    generateAdvice(context) {
        const { system, properties, recentTrajectory } = context;
        const { CHR, INT, STR, MNY } = properties;

        const advices = [];

        // 基础属性建议
        if (CHR < 5) advices.push('颜值偏低，可以考虑提升外貌管理能力');
        if (INT < 5) advices.push('智力可以多投入教育或学习机会');
        if (STR < 5) advices.push('体质偏弱，建议加强锻炼和健康管理');
        if (MNY < 5) advices.push('家境一般，可以考虑增加收入渠道');

        // 系统特色建议
        if (system?.id === 'cultivation' && STR >= 8) {
            advices.push('体质不错，可以尝试冲击更高境界');
        } else if (system?.id === 'tycoon' && MNY >= 10) {
            advices.push('资金充裕，可以考虑投资或扩展人脉');
        } else if (system?.id === 'villain' && CHR >= 8) {
            advices.push('颜值不错，可以利用外貌优势做局');
        } else if (system?.id === 'signin') {
            advices.push('保持签到习惯，系统点会稳步增长');
        }

        // 最近轨迹分析
        if (recentTrajectory?.length >= 3) {
            const lastThree = recentTrajectory.slice(-3);
            const positiveCount = lastThree.filter(t =>
                t.lines?.some(l => /加|获得|提升|成功/.test(l))
            ).length;

            if (positiveCount >= 2) {
                advices.push('近期表现不错，继续保持这个节奏');
            } else if (positiveCount === 0) {
                advices.push('近期可能有些低谷，尝试改变一下策略');
            }
        }

        return advices.length > 0 ? advices : ['保持当前状态，稳扎稳打'];
    }

    /**
     * 生成系统点评
     */
    generateCommentary(context) {
        const { system, properties, summary } = context;
        const { CHR, INT, STR, MNY, SPR } = properties;

        const commentaries = [];

        // 基础状态点评
        const total = CHR + INT + STR + MNY;
        if (total >= 35) {
            commentaries.push('你的人生开得不错，四大属性都很优秀');
        } else if (total >= 25) {
            commentaries.push('整体发展均衡，还有提升空间');
        } else {
            commentaries.push('开局一般，但不要灰心，人生长着呢');
        }

        // 系统特色点评
        if (system?.id) {
            switch (system.id) {
                case 'cultivation':
                    if (STR >= 10 && INT >= 10) {
                        commentaries.push('修仙路线走得扎实，前途无量');
                    }
                    break;
                case 'tycoon':
                    if (MNY >= 15) {
                        commentaries.push('财富积累得很快，神豪范儿足了');
                    }
                    break;
                case 'villain':
                    if (CHR >= 10) {
                        commentaries.push('颜值和名望都到位了，反派魅力拉满');
                    }
                    break;
                case 'signin':
                    if (SPR >= 10) {
                        commentaries.push('签到带来了实在的快乐，这才是稳扎稳打');
                    }
                    break;
            }
        }

        // 个性化吐槽
        const randomJokes = [
            '这个开局我给打8分，剩下2分怕你骄傲',
            '有些人生，注定要走系统流的',
            '系统只是助力，真正的金手指是你自己',
            '继续努力，系统会记住你的每一次进步',
            '保持这个节奏，下一局会更精彩'
        ];
        commentaries.push(randomJokes[Math.floor(Math.random() * randomJokes.length)]);

        return commentaries.join('\n');
    }

    /**
     * 生成总结复盘
     */
    generateSummary(context) {
        const { summary, talents, system } = context;

        const highlights = [];
        const regrets = [];
        const nextSteps = [];

        // 分析属性
        for (const item of summary) {
            if (item.grade >= 3) {
                highlights.push(`${item.label}达到${item.value}，${item.judge || '表现优秀'}`);
            } else if (item.grade === 0) {
                regrets.push(`${item.label}只有${item.value}，可以加强`);
            }
        }

        // 分析天赋
        if (talents?.length >= 2) {
            highlights.push(`获得了${talents.length}个天赋，开局不错`);
        }

        // 系统相关
        if (system?.id) {
            highlights.push(`${system.name}发挥了重要作用`);
            nextSteps.push(`下一局可以继续发展${system.theme}路线`);
        }

        // 下局建议
        if (!nextSteps.length) {
            nextSteps.push('下一局可以尝试不同的属性配比');
            nextSteps.push('建议多关注系统和任务指引');
        }

        return {
            highlights: highlights.length > 0 ? highlights : ['平稳发展，稳步前进'],
            regrets: regrets.length > 0 ? regrets : ['基本没有明显遗憾'],
            nextSteps: nextSteps.length > 0 ? nextSteps : ['保持节奏，继续探索']
        };
    }

    /**
     * 检查缓存状态
     */
    checkCache() {
        const now = Date.now();
        if (now - this.lastCleanup > this.cacheDuration) {
            this.#cleanupCache();
            this.lastCleanup = now;
        }
    }

    /**
     * 生成缓存键
     */
    #generateCacheKey(type, ...args) {
        return `${type}:${args.join(':')}`;
    }

    /**
     * 生成本地事件
     */
    #generateLocalEvent(age, properties, system, talents) {
        const events = [];

        // 基础年龄事件
        if (age === 0) {
            events.push('你出生了，这个世界欢迎你的到来');
        } else if (age === 6) {
            events.push('你开始上小学，接触到了更多的知识');
        } else if (age === 12) {
            events.push('你升入初中，开始面临更多选择');
        } else if (age === 15) {
            events.push('你进入高中，人生的重要转折点');
        } else if (age === 18) {
            events.push('你成年了，可以选择更多的道路');
        } else if (age === 22) {
            events.push('你大学毕业，开始踏入社会');
        } else if (age === 30) {
            events.push('你步入而立之年，承担更多责任');
        }

        // 系统事件
        if (system?.id) {
            const systemEvents = this.#generateSystemEvents(age, system);
            events.push(...systemEvents);
        }

        // 随机事件
        const randomEvents = this.#generateRandomEvents(age, properties);
        if (randomEvents.length > 0) {
            events.push(randomEvents[Math.floor(Math.random() * randomEvents.length)]);
        }

        return events.length > 0 ? events : ['这一年平静地过去了'];
    }

    /**
     * 生成系统相关事件
     */
    #generateSystemEvents(age, system) {
        const events = [];

        switch (system.id) {
            case 'cultivation':
                if (age === 16 && system.level >= 2) {
                    events.push('系统提示：你的修仙境界有了突破');
                } else if (age % 5 === 0) {
                    events.push(`你感觉体内的灵气更加充盈了`);
                }
                break;
            case 'tycoon':
                if (age >= 20 && age % 2 === 0) {
                    events.push('系统返利到账，你的资金又增加了');
                }
                break;
            case 'villain':
                if (age >= 18 && age % 3 === 0) {
                    events.push('你成功了一次打脸行动，声望提升');
                }
                break;
            case 'signin':
                if (age >= 1) {
                    events.push(`系统签到成功，你获得了系统点和快乐`);
                }
                break;
        }

        return events;
    }

    /**
     * 生成随机事件
     */
    #generateRandomEvents(age, properties) {
        const events = [];

        // 基于属性的事件
        if (properties.CHR >= 8) {
            events.push('你的颜值吸引了许多人的目光');
        }
        if (properties.INT >= 8) {
            events.push('你的才智在某个领域得到认可');
        }
        if (properties.STR >= 8) {
            events.push('你的身体素质让你在体育或工作中表现出色');
        }
        if (properties.MNY >= 8) {
            events.push('家境优渥让你获得了更多机会');
        }

        // 基于年龄的事件
        if (age >= 25 && age <= 35) {
            events.push('你面临着事业和感情的选择');
            events.push('朋友们开始谈论婚姻的话题');
        } else if (age >= 40) {
            events.push('你开始思考人生的下半场');
            events.push('家庭责任变得更加重要');
        }

        return events;
    }

    /**
     * 获取本地回复
     */
    #getLocalResponses(systemType, phase, prompt) {
        const responses = {
            intro: [
                '欢迎来到这一局人生！我是你的专属系统，会全程陪伴你。',
                '系统绑定成功，准备好开始你的系统流人生了吗？',
                '这一局我会提供强力支持，让我们一起创造精彩人生！'
            ],
            chat: [
                '我在这里，随时准备帮你分析局势。',
                '有什么问题尽管问，系统会给你专业建议。',
                '记住，系统是你的强大助力，合理利用各项功能。'
            ],
            advice: [
                '建议你根据当前属性调整发展策略。',
                '多关注系统发布的目标，会有额外奖励。',
                '保持属性均衡发展，避免短板影响整体。'
            ]
        };

        // 根据系统类型调整回复
        if (systemType === 'cultivation') {
            responses.intro.unshift('修仙系统已激活，从今天起，你踏上逆天改命之路。');
            responses.advice.push('多投入体质和智力，境界突破更有保障。');
        } else if (systemType === 'tycoon') {
            responses.intro.unshift('神豪返利系统绑定成功，越消费越富有！');
            responses.advice.push('保持消费节奏，返利机制会持续发挥作用。');
        } else if (systemType === 'villain') {
            responses.intro.unshift('反派逆袭系统上线，这次轮到你来制定规则。');
            responses.advice.push('利用声望和颜值优势，做局更加得心应手。');
        } else if (systemType === 'signin') {
            responses.intro.unshift('签到暴击系统就位，每天签到都会有惊喜！');
            responses.advice.push('保持全勤签到，系统点积累会越来越快。');
        }

        return responses[phase] || responses.chat;
    }

    /**
     * 选择最合适的回复
     */
    #selectResponse(responses, context) {
        if (!responses || responses.length === 0) {
            return '系统收到你的消息，正在处理中...';
        }

        // 根据上下文智能选择
        const index = Math.floor(Math.random() * responses.length);
        return responses[index];
    }

    /**
     * 清理过期缓存
     */
    #cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheDuration) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * 生成系统提示信息
     */
    generateSystemHint(context) {
        const { system, properties, phase } = context;

        const hints = [];

        // 基础提示
        hints.push('当前阶段：' + (phase || '发展中'));
        if (system) {
            hints.push(`系统：${system.name} Lv.${system.level || 1}`);
            hints.push(`系统点：${properties.PTS || 0}`);
            hints.push(`下一目标：${system.nextGoal || '继续发展'}`);
        }

        return hints.join('\n');
    }

    /**
     * 检查是否需要AI增强
     */
    shouldUseAI(context) {
        // 这里可以根据条件判断是否使用AI
        // 例如：复杂问题、特殊阶段、用户明确要求等
        return false; // 默认使用本地规则
    }
}

export const localRuleEngine = new LocalRuleEngine();