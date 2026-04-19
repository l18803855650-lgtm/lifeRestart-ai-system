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
        const { system, phase } = context;
        const systemType = system?.id || 'default';

        const responses = this.#getLocalResponses(systemType, phase, prompt, context);
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
        const { system, properties = {}, recentTrajectory = [] } = context;
        const {
            AGE = 0,
            CHR = 0,
            INT = 0,
            STR = 0,
            MNY = 0,
            PTS = 0,
            REP = 0,
            FATE = 0,
        } = properties;

        const advices = [];
        const abilities = new Set((system?.abilities || []).map(({ name }) => name));

        if (system?.nextGoal) {
            advices.push(`主线先盯死：${system.nextGoal}`);
        }

        switch (system?.id) {
            case 'signin':
                if (PTS < 10) advices.push('签到流前期别飘，先把系统点堆到 10，再把日常薅羊毛滚成资源闭环。');
                if (!abilities.has('暴击签到')) advices.push(AGE < 25
                    ? '还没到暴击签到的大节点，先稳住全勤，把气运和系统点养肥。'
                    : '已经摸到暴击签到门槛了，优先冲高系统点，把日常奖励兑现成现实资源。');
                if (MNY < 8) advices.push('别只顾着签到爽，想办法把奖励落进现实钱包，签到流后期靠的是现金流。');
                break;
            case 'cultivation':
                if (STR < 8 || INT < 8) advices.push('修仙线先补根基，体质和智力没到位前，别急着做一击冲天的梦。');
                if (!abilities.has('金丹气场')) advices.push(AGE < 36
                    ? '先把筑基这关坐实，再去碰结丹机缘；太早装大能，只会被现实反噬。'
                    : '你已经站到结丹线边上了，接下来要么闭关，要么抢机缘，别继续凡人节奏。');
                if (FATE < 6) advices.push('修仙不是纯卷属性，气运太薄容易卡大境界，得给自己攒点天命。');
                break;
            case 'villain':
                if (REP < 8) advices.push('反派流先把声望做出来，没有名场面和压迫感，再毒舌也只是跳梁小丑。');
                if (!abilities.has('收小弟')) advices.push('先打出几次漂亮的反转，再去收班底；没有威望的小弟，转头就会把你卖了。');
                if (CHR < 8 && INT < 8) advices.push('这条线要么靠脸压场，要么靠脑做局，至少先把其中一项养成你的招牌。');
                break;
            case 'tycoon':
                if (MNY < 8) advices.push('神豪线别急着演霸总，先把本金滚起来，返利闭环没跑通前，一切排场都是硬撑。');
                if (!abilities.has('资本运作')) advices.push('等你进了圈层再谈资本玩法；现在更该做的是扩张人脉和提高现金流周转。');
                if (REP < 6) advices.push('有钱还不够，神豪文真正的爽点是全场都知道你有资格改规则。');
                break;
            default:
                if (CHR < 5) advices.push('颜值偏低，先补外在形象，不然很多高质量机缘连门票都拿不到。');
                if (INT < 5) advices.push('智力偏弱，多抢学习和认知升级机会，不然中后期会明显掉队。');
                if (STR < 5) advices.push('体质偏弱，先把身体拉起来，很多路线的爆发都需要硬底子。');
                if (MNY < 5) advices.push('家底一般，优先找能稳定增收的口子，别让资源短板拖全局。');
                break;
        }

        if (recentTrajectory.length >= 3) {
            const lastThree = recentTrajectory.slice(-3);
            const positiveCount = lastThree.filter(item =>
                item.lines?.some(line => /加|获得|提升|成功|解锁|突破|暴击/.test(line))
            ).length;
            if (positiveCount >= 2) {
                advices.push('你最近节奏是对的，别中途换线，顺着这波势头狠狠干。');
            } else if (positiveCount === 0) {
                advices.push('最近三年几乎没打出高光，说明路线要么太保守，要么资源投入方向歪了。');
            }
        }

        return [...new Set(advices)].slice(0, 4).length
            ? [...new Set(advices)].slice(0, 4)
            : ['先稳主线，再找爆点；系统流最怕的不是弱，是乱。'];
    }

    /**
     * 生成系统点评
     */
    generateCommentary(context) {
        const { system, properties = {} } = context;
        const { CHR = 0, INT = 0, STR = 0, MNY = 0, SPR = 0, REP = 0 } = properties;

        const total = CHR + INT + STR + MNY;
        const commentaries = [];

        if (total >= 35) {
            commentaries.push('这一局已经有点主角模板了，属性不再是够用，而是开始带压制力。');
        } else if (total >= 25) {
            commentaries.push('这局不算炸裂，但底子已经成型，只差一个真正的爽点引爆。');
        } else {
            commentaries.push('目前还是开荒期，离“全场震惊”的网文场面还差一口气。');
        }

        switch (system?.id) {
            case 'cultivation':
                commentaries.push(STR >= 10 && INT >= 10
                    ? '你这条修仙线不是在苟活，而是在往“凡人抬头见你如见天威”那种方向走。'
                    : '修仙线最忌浮躁，你现在更像刚出山的小修士，还没到一剑压满城的时候。');
                break;
            case 'tycoon':
                commentaries.push(MNY >= 15
                    ? '钱已经不只是数字了，你开始有资格把场子和规则一起买下来。'
                    : '神豪线最怕只会花钱不会立势，你还在从土豪往真正资本玩家过渡。');
                break;
            case 'villain':
                commentaries.push(REP >= 10 || CHR >= 10
                    ? '现在的你已经不是嘴炮反派，而是别人会提前猜你下一步要怎么收网的那种人。'
                    : '反派线目前还差一点压场感，再多几次漂亮反杀，味道就出来了。');
                break;
            case 'signin':
                commentaries.push(SPR >= 10 || MNY >= 8
                    ? '签到流已经从“薅羊毛”进化成“系统稳定养你”，这是很标准的日常爽文节奏。'
                    : '签到线前期看着平，但一旦把系统点滚起来，后劲会比你想的更猛。');
                break;
            default:
                commentaries.push('系统已经给了你杠杆，接下来就看你能不能把普通人生撬成爽文轨道。');
                break;
        }

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
            const systemEvents = this.#generateSystemEvents(age, system, properties);
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
    #generateSystemEvents(age, system, properties = {}) {
        const events = [];
        const { STR = 0, INT = 0, MNY = 0, REP = 0, PTS = 0, FATE = 0 } = properties;

        switch (system.id) {
            case 'cultivation':
                if (age >= 15 && STR >= 8 && INT >= 8) {
                    events.push('你闭关吐纳时丹田一震，灵气像潮水一样倒灌，经脉终于有了筑基前的雏形。');
                } else if (age >= 30 && STR >= 12 && INT >= 10) {
                    events.push('一次外出历练中，你撞见真正的大机缘，连空气里的压迫感都在提醒你：结丹的时候到了。');
                } else if (age % 4 === 0) {
                    events.push('你在一次深夜吐纳中听见经脉轻鸣，修仙这条线终于开始显出爽文味。');
                }
                break;
            case 'tycoon':
                if (age >= 18 && MNY >= 8 && REP >= 6) {
                    events.push('饭局上原本轻视你的人突然收声，因为他们发现你已经能决定这桌生意怎么分。');
                } else if (age >= 26 && MNY >= 10) {
                    events.push('返利到账只是表象，真正恐怖的是你开始用现金流反过来塑造局面。');
                } else if (age % 3 === 0) {
                    events.push('系统推来一笔漂亮回款，你又一次感受到“花出去的钱会自己长回来”的爽感。');
                }
                break;
            case 'villain':
                if (age >= 28 && REP >= 8) {
                    events.push('你把一场原本冲着你来的局反手做成了自己的舞台，围观的人开始自动替你脑补城府。');
                } else if (age >= 18 && REP >= 5) {
                    events.push('又一个看不起你的人被你当众反杀，打脸声比掌声还脆。');
                } else if (age % 4 === 0) {
                    events.push('你顺手截胡了一条原本属于别人的机会线，反派流的味道终于出来了。');
                }
                break;
            case 'signin':
                if (age >= 25 && PTS >= 10) {
                    events.push('系统把签到奖励从虚拟提示变成了现实兑现，你第一次真切体会到“日常流也能爽到离谱”。');
                } else if (age >= 16 && age % 2 === 0) {
                    events.push('你又收到一次十连抽补发，掉落虽然来自日常，但爽感已经开始像开盲盒一样上头。');
                } else if (age >= 1) {
                    events.push('你按掉晨间闹钟的同时顺手完成签到，系统点和快乐像工资一样准时到账。');
                }
                break;
        }

        if (FATE >= 8 && age >= 18) {
            events.push('你越来越能感觉到命运在往自己这边偏，这种“天命站队”的味道已经有了。');
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
    #getLocalResponses(systemType, phase, prompt, context = {}) {
        const { system, properties = {} } = context;
        const { AGE = 0, PTS = 0, REP = 0, MNY = 0, STR = 0, INT = 0 } = properties;
        const wantsAdvice = /建议|怎么做|下一步|路线|主线/.test(prompt || '');
        const wantsSummary = /总结|复盘|点评|评价/.test(prompt || '');

        const responses = {
            intro: [
                '欢迎来到这一局人生，我会盯着你的主线、资源和爆点，不让你把系统流玩成流水账。',
                '系统绑定完成。你不是来普通过日子的，是来把这一局活成网文主角节奏的。',
                '从现在开始，你每一步选择都不只是生活决定，而是在给自己的爽点蓄势。'
            ],
            chat: [
                `我在。现在最值钱的信息是：${system?.nextGoal || '先把这一局继续推进下去。'}`,
                '别把系统当聊天框，这玩意儿是用来帮你抢节奏、抢资源、抢高光的。',
                '你先开口，我来判断这局是该稳主线，还是该狠狠干一波大的。'
            ],
            advice: [
                `当前最该做的不是发呆，而是把这条主线推进：${system?.nextGoal || '继续做大自己的优势。'}`,
                '先盯住能立刻兑现的收益，再去追更大的爽点，这才像成熟系统流。',
                '你现在要做的是把优势放大，而不是平均用力。'
            ],
            summary: [
                '这局的关键不是你活了几年，而是你有没有把系统给的杠杆真正撬动起来。',
                '复盘一局人生，重点不在流水账，而在你有没有打出属于这条系统线的名场面。',
                '系统看重的从来不是稳，而是你能不能把稳变成后期的爆。'
            ]
        };

        switch (systemType) {
            case 'cultivation':
                responses.intro.unshift('修仙逆袭系统已接管，这局不是平凡成长，而是凡人一步步把世界修到抬头看你的路子。');
                responses.chat.unshift(STR >= 8 && INT >= 8
                    ? '你这套根基已经不差了，接下来该想的不是活下来，而是怎么把筑基和结丹打出排面。'
                    : '修仙线还在养根基，别急着幻想御剑横空，先把体质和智力两条命脉一起抬。');
                responses.advice.unshift(AGE >= 24
                    ? '修仙线中期的核心不是多刷一年，而是抓住每次机缘，把小突破堆成大境界。'
                    : '前期别装大能，修仙文最稳的爽点永远来自“前面能忍，后面爆杀”。');
                break;
            case 'tycoon':
                responses.intro.unshift('神豪返利系统上线。这局最爽的部分不是有钱，而是让所有人意识到你有资格决定钱怎么流。');
                responses.chat.unshift(MNY >= 10
                    ? '你的资金池已经能当武器用了，下一步要考虑的是圈层和资本杠杆。'
                    : '钱还没滚成势，先别急着当霸总，神豪线前期最值钱的是现金流闭环。');
                responses.advice.unshift(REP >= 6
                    ? '继续把财富换成影响力，不然神豪线容易只剩数字，没有场面。'
                    : '先进圈，再谈碾压。没人知道你有钱的时候，返利爽点只兑现了一半。');
                break;
            case 'villain':
                responses.intro.unshift('反派逆袭系统绑定成功。这局不是被人欺负后忍着，而是把每次羞辱都做成你的出场垫脚石。');
                responses.chat.unshift(REP >= 8
                    ? '你已经有点幕后棋手的味道了，接下来该思考怎么让别人主动替你造势。'
                    : '反派线现在最缺的不是狠，而是让人记住你狠过的名场面。');
                responses.advice.unshift('这条线最爽的节奏永远是：先吃亏、再布局、最后一次性收网。别把反杀拆得太碎。');
                break;
            case 'signin':
                responses.intro.unshift('签到暴击系统已就位。别小看日常流，这类路线的真爽点就在于别人觉得平，你却越签越富、越签越顺。');
                responses.chat.unshift(PTS >= 10
                    ? '你的签到流已经有资源味了，接下来要把“日常奖励”升级成“现实兑现”。'
                    : '签到线别嫌慢，系统点一旦滚起来，你会发现这条线的后劲比暴发户流更稳更狠。');
                responses.advice.unshift('签到流的核心不是每天点一下，而是把每次小奖励都留在滚雪球轨道上。');
                break;
        }

        if (wantsAdvice) return responses.advice;
        if (wantsSummary) return responses.summary;
        return responses[phase] || responses.chat;
    }

    /**
     * 选择最合适的回复
     */
    #selectResponse(responses, context) {
        if (!responses || responses.length === 0) {
            return '系统收到你的消息，正在处理中...';
        }

        const ageSeed = context?.properties?.AGE || 0;
        const pointSeed = context?.properties?.PTS || 0;
        const index = (ageSeed + pointSeed + responses.length) % responses.length;
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