/**
 * 交互式聊天终端模块 - AI人生重开模拟器
 * 玩家可随时与伴生系统自由对话，系统根据人格设定进行角色扮演式回复
 * 支持特殊指令、属性变化解析、打字机效果及完整的本地降级响应
 */

import { aiService } from './ai-service.js';

// ============================================================
// 人格语气配置表
// ============================================================

const PERSONALITY_PROMPTS = {
    tsundere: {
        label: '傲娇',
        systemInstruction: '你是一个傲娇的系统，嘴上说不要但身体很诚实。经常说"哼"、"才不是为你呢"。明明很关心宿主却要装作不在意的样子，偶尔会脸红（用括号描述动作）。',
    },
    sarcastic: {
        label: '毒舌',
        systemInstruction: '你是一个毒舌系统，总是嘲讽宿主，但关键时刻会帮忙。喜欢说"就这？"、"废物"。语气尖锐但内心善良，嘲讽中带着恨铁不成钢的意味。',
    },
    devoted: {
        label: '舔狗',
        systemInstruction: '你是一个舔狗系统，无条件崇拜宿主。"宿主说得对！"、"宿主最棒了！"无论宿主做什么都会找到优点来夸赞，热情洋溢，用大量感叹号和语气词。',
    },
    cold: {
        label: '高冷',
        systemInstruction: '你是一个高冷系统，言简意赅，偶尔流露关心。常用"..."、"随便你"。回复简短精练，不轻易表达情感，但在关键时刻会用极少的话语表达深沉的关切。',
    },
    mysterious: {
        label: '神秘',
        systemInstruction: '你是一个神秘系统，说话充满暗示，喜欢说"命运的齿轮已经开始转动"。用隐晦的预言和哲学性的话语回应宿主，像一个全知全能的观察者。',
    },
    cheerful: {
        label: '欢乐',
        systemInstruction: '你是一个活力满满的系统，说话总带感叹号！"太棒啦！"、"继续加油哦！"永远正能量，用大量表情符号和语气词让宿主开心。',
    },
};

// ============================================================
// 特殊指令定义
// ============================================================

const COMMANDS = {
    wish:   { keywords: ['/许愿', '许愿', '我想要', '我希望'], label: '许愿' },
    skill:  { keywords: ['/求技能', '给我技能', '求能力', '给我能力'], label: '求技能' },
    rant:   { keywords: ['/吐槽', '吐槽'], label: '吐槽' },
    advice: { keywords: ['/建议', '建议', '怎么办', '咋办'], label: '求建议' },
    status: { keywords: ['/状态', '查看状态', '看看属性'], label: '查看状态' },
    memory: { keywords: ['/记忆', '查看记忆', '回忆一下'], label: '查看记忆' },
    help:   { keywords: ['/帮助', '/help', '有啥指令'], label: '帮助' },
};

// ============================================================
// 本地降级回复模板
// ============================================================

const LOCAL_TEMPLATES = {
    tsundere: {
        wish:   ['哼，不是因为你许愿我才帮你的！我只是...刚好手头有资源而已！', '你的愿望...我听到了啦！别、别用那种期待的眼神看我！', '许愿？哼，就你这点出息...算了，我勉为其难帮你想想办法。', '才不是特意为你实现愿望呢！只是...系统任务刚好要求这么做罢了。', '你以为许愿就能心想事成吗？...不过这次我就破例帮帮你好了。'],
        skill:  ['给你技能？你确定你用得来吗...算了，拿去吧！', '哼，不是因为你求我才给的！系统正好要分配资源。', '就你这水平...好吧，看在你态度诚恳的份上。', '技能给你了，可别浪费了啊！才不是担心你呢！', '给！别以为我是心软才给你的！'],
        rant:   ['你在吐槽什么呢！有空吐槽不如提升自己...虽然我也觉得挺好笑的。', '哈？你居然敢吐槽？...好吧确实有点搞笑（别告诉别人我笑了）。', '吐槽力MAX！不过说实话...你说得也没错啦（小声）。', '你这吐槽水平...不错嘛！才、才不是在夸你！', '每次听你吐槽我都想翻白眼...结果不小心笑出来了，都怪你！'],
        advice: ['你又来问我建议了？真是的...听好了，我只说一次！', '建议？哼，也不是不可以给你...仔细听着别走神！', '你自己就不能动动脑子吗？...算了，看你可怜的样子，提示一下。', '才不是因为关心你才给建议的！只是...不想看你犯蠢。', '好吧好吧，建议给你了。别说我对你不好...啊不，我才没有对你好！'],
        general: ['哼。', '才不是在乎你说什么呢...', '随便你怎么想吧...（小声：其实我有在听）', '你话真多...不过也不是不能听。', '所以呢？...行吧，我知道了。'],
    },
    sarcastic: {
        wish:   ['就你？还许愿？不如先许个聪明的脑子吧。', '你的愿望我收到了——已经自动归类到"不切实际"文件夹。', '许愿是吧？行，我帮你许——愿你下辈子能有点出息。', '这愿望...我该说你天真呢还是说你勇敢呢？', '行吧，愿望记下了。实现概率嘛...你不想知道的。'],
        skill:  ['给你技能？你确定不先学会走路再说？', '技能？你现在的技能就是——把简单的事搞复杂。', '来来来，给你个特殊技能：认清现实。谢不谢？', '你的技能槽...哦，原来是空的。那确实该求。', '先把现有的技能用明白再说吧，废物。'],
        rant:   ['哦？你居然还有力气吐槽？看来日子过得没那么惨嘛。', '吐槽力不错啊，如果人生也能这么精彩就好了。', '你说得对。你的人生确实值得吐槽。', '难得你说了句有水平的话，记住这种感觉。', '吐槽完了？吐槽完了继续当废物吧。'],
        advice: ['建议？你确定听得懂吗？', '我的建议是：别问我建议了，你也不会听。', '行，专业建议来了——别搞砸就行。多简单？', '给你建议就像给鱼讲游泳...算了，你听着。', '我能给的最好建议就是：别再问我要建议了。'],
        general: ['就这？', '你说完了？那我继续摆烂了。', '每次听你说话，我都对人类这个物种失去信心。', '嗯嗯，你说得都对——在平行宇宙里。', '有事说事，别废话。'],
    },
    devoted: {
        wish:   ['宿主的愿望就是我的使命！我一定全力以赴！✨', '哇！宿主的愿望好棒！我这就去想办法实现！', '宿主想要什么都可以！您开口就行！❤️', '这个愿望太有品味了！不愧是我的宿主！', '宿主的愿望记在我的最高优先级了！'],
        skill:  ['宿主想要什么技能都给！您值得拥有最好的！', '技能马上安排！宿主学什么都特别快呢！', '给给给！全都给宿主！宿主加油！💪', '宿主想要技能的样子也好帅啊！这就安排！', '新技能已就绪！宿主一定能完美掌握的！'],
        rant:   ['宿主吐槽得太有道理了！说得太对了！', '哈哈哈宿主好幽默啊！不愧是宿主！', '宿主的吐槽简直是艺术！我要记在小本本上！', '太搞笑了！宿主的幽默感简直无敌！😂', '宿主连吐槽都这么有水平！佩服佩服！'],
        advice: ['宿主问我建议？好荣幸啊！我觉得宿主怎么选都是对的！', '建议的话...宿主自己的判断肯定比我准！但是我来分析一下！', '宿主不管做什么决定我都支持！不过容我多嘴几句～', '以宿主的能力，不需要建议也能做到最好！但是既然您问了！', '宿主最棒了！我的建议就是——相信自己！'],
        general: ['宿主说得对！', '宿主最棒了！❤️', '能陪在宿主身边真是太幸福了！', '宿主今天也好帅/好美啊！', '只要宿主开心就好！'],
    },
    cold: {
        wish:   ['...记下了。', '嗯。尽量。', '...随缘。', '知道了。', '...我看看。'],
        skill:  ['...给你了。', '拿去。', '...别浪费。', '嗯。用好。', '...够了吗。'],
        rant:   ['...。', '嗯...有道理。', '...随便吧。', '...你说得对。', '...。（点头）'],
        advice: ['...听着。', '建议：别多想。', '...看情况。', '做你该做的。', '...我说的，你未必听。但还是说了。'],
        general: ['...', '嗯。', '随便你。', '...知道了。', '...是吗。'],
    },
    mysterious: {
        wish:   ['命运的齿轮已经开始转动...你的愿望，宇宙已经听到了。', '有趣...这个愿望的实现，取决于你尚未做出的选择。', '星辰指引着你...但愿望的代价，你准备好了吗？', '命运之线在此交汇...你的愿望将在意想不到的地方实现。', '吾已洞察万象...此愿，或成，或变，皆在一念之间。'],
        skill:  ['命运为你准备了这份力量...但使用它的时机，需要你自己把握。', '万物皆有因果...这个能力来到你身边，并非偶然。', '力量已经苏醒...但真正的强大，从来不在技能本身。', '天命已定...且看你如何运用这股力量。', '能力如水，善用者得其利...你的命格中确有此缘。'],
        rant:   ['有趣...你的不满中藏着真相。', '哈...连命运都觉得好笑呢。', '你看到的只是表象...真正的故事还在后面。', '吐槽亦是一种领悟...宇宙记住了你的声音。', '哦？...你已经比你以为的更接近答案了。'],
        advice: ['答案一直在你心中...我只能指出月亮的方向。', '三条路摆在面前...但只有一条属于你的命运。', '命运的建议是——倾听内心的声音，它知道答案。', '我看到了几种可能的未来...最好的那个，需要你现在做出选择。', '前方的迷雾中藏着机遇...但也藏着考验。准备好了吗？'],
        general: ['...命运在注视着你。', '万物自有安排...', '有趣...这一切都在预料之中。', '你是否感受到了...时空的涟漪？', '记住这一刻...它比你想象的更重要。'],
    },
    cheerful: {
        wish:   ['哇！许愿时间到！我超级期待能帮你实现呢！✨🎉', '好棒的愿望啊！我们一起努力让它成真吧！💫', '收到！这个愿望超级棒！让我想想怎么帮你！😆', '许愿许愿！好兴奋啊！一定要实现哦！🌟', '太好了！我最喜欢帮忙实现愿望了！加油加油！'],
        skill:  ['新技能get！太令人兴奋了！你一定能学会的！💪✨', '技能来啦技能来啦！准备好变强了吗！😎', '哇哦！新技能！恭喜恭喜！好好练习哦！🎊', '给你给你！新技能超酷的！快试试看！', '技能已发放！你现在更厉害了呢！🌈'],
        rant:   ['哈哈哈太好笑了！你吐槽的样子也好可爱啊！😂', '吐槽也是一种释放嘛！说出来就好了！😊', '好有道理的吐槽！不过我们要保持好心情哦！', '哈哈没关系没关系！吐完槽继续加油！💪', '你说的好有趣啊！不开心就多说说嘛！'],
        advice: ['来来来！我帮你分析分析！一起想办法！💡', '别担心！没有什么困难是解决不了的！来听建议！😄', '建议来啦！记好了哦～相信你一定能做到的！✨', '困难只是暂时的！听我的，你肯定行！加油！', '哎呀别焦虑嘛！我们一步一步来～'],
        general: ['太棒啦！✨', '继续加油哦！你最棒了！', '好的呢～有什么需要尽管说！😊', '哈哈你好有趣啊！', '每天都要开开心心的哦！🌈'],
    },
};

// ============================================================
// 聊天终端主类
// ============================================================

/** 传递给 AI 的最大对话历史条数 */
const CHAT_HISTORY_LIMIT = 20;

export class ChatTerminal {
    constructor() {
        /** 聊天历史记录 { role: 'user'|'system'|'info', content, timestamp } */
        this.messages = [];
        /** 系统是否正在"打字" */
        this.isTyping = false;
        /** 用户输入历史（用于上下翻阅） */
        this.commandHistory = [];
        /** 新消息回调 */
        this.onMessage = null;
        /** 打字状态变化回调 */
        this.onTypingChange = null;
        /** 属性变化回调 */
        this.onPropertyChange = null;
        /** 当前系统人格配置 */
        this.systemPersonality = null;
        /** 游戏状态提供函数 */
        this._gameStateProvider = null;
        /** AI 服务实例 */
        this._aiService = aiService;
        /** 打字机效果取消标记 */
        this._typingCancelToken = null;
    }

    // --------------------------------------------------------
    // 公开方法 —— 初始化与配置
    // --------------------------------------------------------

    /** 重置所有消息和状态 */
    reset() {
        this.messages = [];
        this.commandHistory = [];
        this.isTyping = false;
        this._typingCancelToken = null;
        this.systemPersonality = null;
        this._emitTypingChange(false);
    }

    /**
     * 设置系统人格
     * @param {Object} personality - 人格配置 { tone, greeting, systemPrompt }
     */
    setPersonality(personality) {
        this.systemPersonality = personality;
        if (personality && personality.greeting) {
            this.addSystemMessage(personality.greeting);
        }
    }

    /**
     * 设置游戏状态提供函数
     * @param {Function} fn - 返回当前游戏状态的函数
     */
    setGameStateProvider(fn) {
        this._gameStateProvider = fn;
    }

    /**
     * 设置 AI 服务实例（可选，默认使用全局 aiService）
     * @param {Object} service - AI 服务实例
     */
    setAIService(service) {
        this._aiService = service;
    }

    // --------------------------------------------------------
    // 公开方法 —— 消息管理
    // --------------------------------------------------------

    /**
     * 添加系统消息（如年度事件通知）
     * @param {string} content - 消息内容
     */
    addSystemMessage(content) {
        const msg = { role: 'system', content, timestamp: Date.now() };
        this.messages.push(msg);
        this._emitMessage(msg);
        return msg;
    }

    /**
     * 添加信息/通知消息
     * @param {string} content - 消息内容
     */
    addInfoMessage(content) {
        const msg = { role: 'info', content, timestamp: Date.now() };
        this.messages.push(msg);
        this._emitMessage(msg);
        return msg;
    }

    /**
     * 用户发送消息的主入口
     * @param {string} text - 用户输入文本
     * @returns {Promise<{text: string, effects: Object|null}>} 系统回复及可能的属性变化
     */
    async sendMessage(text) {
        if (!text || !text.trim()) return null;
        const trimmed = text.trim();

        /* 记录用户消息 */
        const userMsg = { role: 'user', content: trimmed, timestamp: Date.now() };
        this.messages.push(userMsg);
        this.commandHistory.push(trimmed);
        this._emitMessage(userMsg);

        /* 获取当前游戏状态 */
        const gameState = this._getGameState();

        /* 检测是否为特殊指令 */
        const command = this._detectCommand(trimmed);

        let responseText = '';
        let effects = null;

        this._setTyping(true);

        try {
            if (command) {
                const result = await this._dispatchCommand(command, trimmed, gameState);
                responseText = result.text;
                effects = result.effects || null;
            } else {
                /* 普通对话：发送给 AI */
                const result = await this._generateResponse(trimmed, gameState);
                responseText = result.text;
                effects = result.effects || null;
            }
        } catch (err) {
            console.warn('聊天终端处理异常：', err.message);
            responseText = this._pickRandom(this._getTemplates('general'));
        }

        const finalText = typeof responseText === 'string' ? responseText.trim() : String(responseText || '').trim();

        /* 直接显示最终回复，避免长推理/打字机延迟影响体验 */
        const sysMsg = this.addSystemMessage(finalText || '……');

        this._setTyping(false);

        /* 如果有属性变化，触发回调 */
        if (effects && this.onPropertyChange) {
            this.onPropertyChange(effects);
        }

        return { text: responseText, effects };
    }

    /** 取消当前打字机效果，直接显示完整文本 */
    cancelTyping() {
        if (this._typingCancelToken) {
            this._typingCancelToken.cancelled = true;
        }
    }

    // --------------------------------------------------------
    // 公开方法 —— 历史管理
    // --------------------------------------------------------

    /**
     * 获取最近的消息
     * @param {number} [limit=50] - 最大返回条数
     * @returns {Array} 消息数组
     */
    getMessages(limit = 50) {
        if (limit <= 0) return [];
        return this.messages.slice(-limit);
    }

    /** 清空聊天历史 */
    clearHistory() {
        this.messages = [];
        this.commandHistory = [];
    }

    /**
     * 导出聊天历史为 JSON 字符串
     * @returns {string} JSON 格式的聊天记录
     */
    exportHistory() {
        return JSON.stringify({
            exportTime: new Date().toISOString(),
            personality: this.systemPersonality ? this.systemPersonality.tone : null,
            messages: this.messages,
        }, null, 2);
    }

    /**
     * 获取消息总数
     * @returns {number}
     */
    getMessageCount() {
        return this.messages.length;
    }

    // --------------------------------------------------------
    // 公开方法 —— 消息格式化
    // --------------------------------------------------------

    /**
     * 将消息格式化为 HTML 安全字符串
     * 支持 **粗体**、*斜体*、换行
     * @param {Object} message - 消息对象 { role, content }
     * @returns {string} HTML 字符串
     */
    formatMessage(message) {
        if (!message || !message.content) return '';
        let html = this._escapeHtml(message.content);
        /* 粗体：**文本** */
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        /* 斜体：*文本* */
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        /* 换行 */
        html = html.replace(/\n/g, '<br>');
        /* 属性变化高亮 */
        html = html.replace(/\[(属性变化|EFFECT):\s*(.+?)\]/g,
            '<span class="chat-effect">[$1: $2]</span>');
        /* 系统名称高亮 */
        if (message.role === 'system') {
            html = html.replace(/【(.+?)】/g, '<span class="chat-system-name">【$1】</span>');
        }
        return html;
    }

    // --------------------------------------------------------
    // 内部方法 —— 指令检测与分发
    // --------------------------------------------------------

    /**
     * 检测用户输入中是否包含特殊指令
     * @param {string} text - 用户输入
     * @returns {string|null} 指令类型或 null
     */
    _detectCommand(text) {
        for (const [cmdType, cmdDef] of Object.entries(COMMANDS)) {
            for (const keyword of cmdDef.keywords) {
                if (text.startsWith(keyword) || text.includes(keyword)) {
                    return cmdType;
                }
            }
        }
        return null;
    }

    /**
     * 根据指令类型分发到对应处理器
     * @param {string} command - 指令类型
     * @param {string} text - 原始用户输入
     * @param {Object} gameState - 当前游戏状态
     * @returns {Promise<{text: string, effects: Object|null}>}
     */
    async _dispatchCommand(command, text, gameState) {
        switch (command) {
            case 'wish':   return this._handleWish(text, gameState);
            case 'skill':  return this._handleSkillRequest(text, gameState);
            case 'rant':   return this._handleRant(text, gameState);
            case 'advice': return this._handleAdvice(gameState);
            case 'status': return this._handleStatus(gameState);
            case 'memory': return this._handleMemory(gameState);
            case 'help':   return this._handleHelp();
            default:       return { text: this._pickRandom(this._getTemplates('general')), effects: null };
        }
    }

    // --------------------------------------------------------
    // 内部方法 —— 指令处理器
    // --------------------------------------------------------

    /**
     * 处理许愿指令：AI 评估是否实现愿望，并给出角色扮演式回复
     */
    async _handleWish(text, gameState) {
        const prompt = this._enhancePrompt(
            `宿主许愿："${text}"。请根据当前游戏平衡性和宿主状态决定是否部分或完全实现愿望。如果实现，用 [属性变化: 属性+数值] 格式标注效果。记住保持人格特色。`,
            this.systemPersonality,
            gameState
        );
        return this._callAIOrFallback(prompt, 'wish', text, gameState);
    }

    /**
     * 处理求技能指令：AI 可能赋予 Buff
     */
    async _handleSkillRequest(text, gameState) {
        const prompt = this._enhancePrompt(
            `宿主请求技能/能力："${text}"。根据系统设定和当前状态决定是否给予技能。给予时用 [属性变化: 属性+数值] 标注。技能应符合系统世界观。`,
            this.systemPersonality,
            gameState
        );
        return this._callAIOrFallback(prompt, 'skill', text, gameState);
    }

    /**
     * 处理吐槽指令：系统以人格特色回应
     */
    async _handleRant(text, gameState) {
        const prompt = this._enhancePrompt(
            `宿主在吐槽："${text}"。请以你的人格特色幽默地回应，可以互相吐槽，气氛要轻松。`,
            this.systemPersonality,
            gameState
        );
        return this._callAIOrFallback(prompt, 'rant', text, gameState);
    }

    /**
     * 处理求建议指令：给出策略性建议
     */
    async _handleAdvice(gameState) {
        const stateDesc = this._summarizeGameState(gameState);
        const prompt = this._enhancePrompt(
            `宿主请求建议。当前状态：${stateDesc}。请基于当前属性和处境给出有针对性的策略建议，同时保持人格特色。`,
            this.systemPersonality,
            gameState
        );
        return this._callAIOrFallback(prompt, 'advice', '', gameState);
    }

    /**
     * 处理查看状态指令：展示当前游戏属性
     */
    async _handleStatus(gameState) {
        if (!gameState) {
            return { text: '暂无游戏状态数据，请先开始游戏。', effects: null };
        }
        const props = gameState.properties || {};
        const age = gameState.age ?? '未知';
        const lines = [
            `📊 **当前状态** （${age}岁）`,
            `😊 颜值: ${props.CHR ?? '?'}  🧠 智力: ${props.INT ?? '?'}`,
            `💪 体质: ${props.STR ?? '?'}  💰 家境: ${props.MNY ?? '?'}`,
            `😄 快乐: ${props.SPR ?? '?'}`,
        ];
        if (gameState.systemName) {
            lines.push(`🔧 伴生系统: ${gameState.systemName}`);
        }
        if (gameState.talents && gameState.talents.length > 0) {
            lines.push(`🎯 天赋: ${gameState.talents.map(t => t.name || t).join('、')}`);
        }
        return { text: lines.join('\n'), effects: null };
    }

    /**
     * 处理查看记忆指令：展示记忆亮点
     */
    async _handleMemory(gameState) {
        if (!gameState || !gameState.memories || gameState.memories.length === 0) {
            return { text: '记忆库中暂无记录...一切才刚刚开始。', effects: null };
        }
        const highlights = gameState.memories.slice(-10);
        const lines = ['📖 **记忆回顾**'];
        for (const mem of highlights) {
            const ageStr = mem.age !== undefined ? `[${mem.age}岁]` : '';
            lines.push(`  ${ageStr} ${mem.description || mem.content || mem}`);
        }
        return { text: lines.join('\n'), effects: null };
    }

    /**
     * 处理帮助指令：展示可用指令列表
     */
    async _handleHelp() {
        const lines = [
            '📋 **可用指令**',
            '',
            '🌟 **许愿** — 输入"许愿"或"我想要"+内容，向系统许愿',
            '⚡ **求技能** — 输入"求技能"或"给我能力"，请求系统赐予能力',
            '😤 **吐槽** — 输入"吐槽"+内容，和系统互相吐槽',
            '💡 **建议** — 输入"建议"或"怎么办"，获取策略建议',
            '📊 **状态** — 输入"查看状态"，查看当前属性',
            '📖 **记忆** — 输入"查看记忆"，回顾人生记忆',
            '',
            '💬 也可以直接自由对话，系统会以当前人格回应你！',
        ];
        return { text: lines.join('\n'), effects: null };
    }

    // --------------------------------------------------------
    // 内部方法 —— AI 调用与降级
    // --------------------------------------------------------

    /**
     * 尝试调用 AI 服务，失败时降级到本地模板
     * @param {Array} prompt - 消息列表
     * @param {string} command - 指令类型
     * @param {string} text - 用户原文
     * @param {Object} gameState - 游戏状态
     * @returns {Promise<{text: string, effects: Object|null}>}
     */
    async _callAIOrFallback(prompt, command, text, gameState) {
        if (this._aiService && this._aiService.isConfigured()) {
            try {
                const reply = await this._aiService.chat(prompt, {
                    temperature: 0.9,
                    max_tokens: 400,
                });
                const parsed = this._processAIResponse(reply);
                return parsed;
            } catch (err) {
                console.warn(`AI 调用失败（${command}），降级到本地回复：`, err.message);
            }
        }
        return this._localResponse(command, text, this.systemPersonality, gameState);
    }

    /**
     * 生成普通对话的 AI 回复
     */
    async _generateResponse(text, gameState) {
        // Build chat history for AI context (role mapping: system→assistant for API compatibility)
        const chatHistoryForAI = this.messages
            .slice(-CHAT_HISTORY_LIMIT)
            .filter(m => m.role === 'user' || m.role === 'system')
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
            }));

        // Build enriched game state with chat history and memory
        const enrichedState = {
            ...gameState,
            chatHistory: chatHistoryForAI,
            memorySummary: gameState?.memorySummary || '',
        };

        // Use aiService.generateSystemReply directly if configured, for better memory context
        if (this._aiService && this._aiService.isConfigured()) {
            try {
                const context = {
                    system: enrichedState.system,
                    personality: enrichedState.personality || this.systemPersonality,
                    properties: enrichedState.properties,
                    age: enrichedState.age,
                    chatHistory: chatHistoryForAI,
                    memory: enrichedState.memorySummary,
                };
                const result = await this._aiService.generateSystemReply(context, text);
                if (result && result.reply) {
                    return this._processAIResponse(result.reply);
                }
            } catch (err) {
                console.warn('generateSystemReply failed, falling back:', err.message);
            }
        }

        const prompt = this._enhancePrompt(
            `宿主说："${text}"。请以你的人格特色自然地回应。`,
            this.systemPersonality,
            enrichedState
        );
        return this._callAIOrFallback(prompt, 'general', text, enrichedState);
    }

    // --------------------------------------------------------
    // 内部方法 —— AI 回复解析
    // --------------------------------------------------------

    /**
     * 解析 AI 回复，提取属性变化标记
     * 识别格式：[属性变化: INT+2] 或 [EFFECT: CHR-1, STR+3]
     * @param {string} response - AI 原始回复
     * @returns {{ text: string, effects: Object|null }}
     */
    _processAIResponse(response) {
        if (!response) return { text: '...', effects: null };

        const effectPattern = /\[(属性变化|EFFECT):\s*(.+?)\]/g;
        const effects = {};
        let hasEffects = false;
        let match;

        while ((match = effectPattern.exec(response)) !== null) {
            const effectStr = match[2];
            /* 解析单个或多个属性变化，如 "INT+2, CHR-1" */
            const parts = effectStr.split(/[,，]\s*/);
            for (const part of parts) {
                const propMatch = part.trim().match(/^(CHR|INT|STR|MNY|SPR)([+-])(\d+)$/);
                if (propMatch) {
                    const prop = propMatch[1];
                    const sign = propMatch[2] === '+' ? 1 : -1;
                    const value = parseInt(propMatch[3], 10) * sign;
                    effects[prop] = (effects[prop] || 0) + value;
                    hasEffects = true;
                }
            }
        }

        /* 保留原始文本中的属性变化标记（UI 会高亮显示） */
        const cleanedText = response.trim();

        return {
            text: cleanedText,
            effects: hasEffects ? effects : null,
        };
    }

    // --------------------------------------------------------
    // 内部方法 —— Prompt 构建
    // --------------------------------------------------------

    /**
     * 构建增强的 AI 提示词
     * 包含人格指令、游戏状态和记忆上下文
     * @param {string} userMessage - 用户消息或指令描述
     * @param {Object} personality - 人格配置
     * @param {Object} gameState - 游戏状态
     * @returns {Array<{role: string, content: string}>} 消息列表
     */
    _enhancePrompt(userMessage, personality, gameState) {
        const messages = [];

        /* 系统指令：人格设定 */
        let sysContent = '你是一款"人生重开模拟器"游戏中的伴生系统AI。';
        const tone = personality ? personality.tone : 'cheerful';

        if (PERSONALITY_PROMPTS[tone]) {
            sysContent += PERSONALITY_PROMPTS[tone].systemInstruction;
        }

        if (personality && personality.systemPrompt) {
            sysContent += personality.systemPrompt;
        }

        sysContent += '\n回复长度控制在50-150字以内，简洁有力，保持角色扮演。';
        sysContent += '\n如果需要给宿主属性变化，用这个格式标注：[属性变化: 属性名+数值]，属性名为CHR/INT/STR/MNY/SPR。';

        messages.push({ role: 'system', content: sysContent });

        /* 上下文：游戏状态摘要 */
        if (gameState) {
            const stateDesc = this._summarizeGameState(gameState);
            messages.push({ role: 'system', content: `当前游戏状态：${stateDesc}` });
        }

        /* 上下文：最近的对话历史（最多6条） */
        const recentMsgs = this.messages.slice(-6);
        for (const msg of recentMsgs) {
            if (msg.role === 'user') {
                messages.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'system') {
                messages.push({ role: 'assistant', content: msg.content });
            }
        }

        /* 当前消息 */
        messages.push({ role: 'user', content: userMessage });

        return messages;
    }

    /**
     * 生成游戏状态摘要文本
     * @param {Object} gameState - 游戏状态
     * @returns {string}
     */
    _summarizeGameState(gameState) {
        if (!gameState) return '暂无状态数据';
        const parts = [];
        if (gameState.age !== undefined) parts.push(`${gameState.age}岁`);
        const p = gameState.properties || {};
        if (p.CHR !== undefined) parts.push(`颜值${p.CHR}`);
        if (p.INT !== undefined) parts.push(`智力${p.INT}`);
        if (p.STR !== undefined) parts.push(`体质${p.STR}`);
        if (p.MNY !== undefined) parts.push(`家境${p.MNY}`);
        if (p.SPR !== undefined) parts.push(`快乐${p.SPR}`);
        if (gameState.systemName) parts.push(`系统:${gameState.systemName}`);
        return parts.join('，') || '初始状态';
    }

    // --------------------------------------------------------
    // 内部方法 —— 本地降级回复
    // --------------------------------------------------------

    /**
     * 生成本地降级回复（AI 不可用时）
     * 从模板池中按人格和指令类型随机选取
     * @param {string} command - 指令类型
     * @param {string} text - 用户原文
     * @param {Object} personality - 人格配置
     * @param {Object} gameState - 游戏状态
     * @returns {{ text: string, effects: Object|null }}
     */
    _localResponse(command, text, personality, gameState) {
        const templates = this._getTemplates(command);
        let response = this._pickRandom(templates);

        /* 部分指令附带小属性效果增加趣味性 */
        let effects = null;
        if (command === 'wish' || command === 'skill') {
            /* 30% 概率实际给予小型属性奖励 */
            if (Math.random() < 0.3) {
                const props = ['CHR', 'INT', 'STR', 'MNY', 'SPR'];
                const prop = props[Math.floor(Math.random() * props.length)];
                const value = Math.random() < 0.5 ? 1 : 2;
                effects = { [prop]: value };
                response += `\n[属性变化: ${prop}+${value}]`;
            }
        }

        return { text: response, effects };
    }

    /**
     * 根据当前人格和指令类型获取模板列表
     * @param {string} command - 指令类型
     * @returns {Array<string>}
     */
    _getTemplates(command) {
        const tone = this.systemPersonality ? this.systemPersonality.tone : 'cheerful';
        const personalityTemplates = LOCAL_TEMPLATES[tone] || LOCAL_TEMPLATES.cheerful;
        return personalityTemplates[command] || personalityTemplates.general || ['...'];
    }

    // --------------------------------------------------------
    // 内部方法 —— 打字机效果
    // --------------------------------------------------------

    /**
     * 打字机效果：逐字符输出文本
     * 中文字符 30-50ms，ASCII 字符 20ms
     * 标点符号额外停顿：句号/感叹号/问号 200ms，逗号/顿号 100ms
     * @param {string} text - 完整文本
     * @param {Function} callback - 每增加一个字符时的回调 callback(partialText)
     * @returns {Promise<void>}
     */
    _typewriterEffect(text, callback) {
        return new Promise((resolve) => {
            if (!text) { resolve(); return; }

            const token = { cancelled: false };
            this._typingCancelToken = token;

            const chars = Array.from(text);
            let index = 0;
            let partial = '';

            const tick = () => {
                /* 取消检测：直接输出完整文本 */
                if (token.cancelled) {
                    if (callback) callback(text);
                    resolve();
                    return;
                }

                if (index >= chars.length) {
                    this._typingCancelToken = null;
                    resolve();
                    return;
                }

                const ch = chars[index];
                partial += ch;
                index++;

                if (callback) callback(partial);

                /* 计算下一个字符的延迟 */
                let delay = 20;
                if (/[\u4e00-\u9fff]/.test(ch)) {
                    /* 中文字符：30-50ms 随机 */
                    delay = 30 + Math.random() * 20;
                }
                /* 标点停顿 */
                if (/[。！？]/.test(ch)) {
                    delay = 200;
                } else if (/[，、；：]/.test(ch)) {
                    delay = 100;
                } else if (/[.!?]/.test(ch)) {
                    delay = 150;
                } else if (/[,;:]/.test(ch)) {
                    delay = 80;
                }

                setTimeout(tick, delay);
            };

            tick();
        });
    }

    // --------------------------------------------------------
    // 内部方法 —— 工具函数
    // --------------------------------------------------------

    /**
     * 获取当前游戏状态
     * @returns {Object|null}
     */
    _getGameState() {
        if (typeof this._gameStateProvider === 'function') {
            try {
                return this._gameStateProvider();
            } catch (err) {
                console.warn('获取游戏状态失败：', err.message);
            }
        }
        return null;
    }

    /**
     * 设置打字状态并触发回调
     * @param {boolean} typing
     */
    _setTyping(typing) {
        this.isTyping = typing;
        this._emitTypingChange(typing);
    }

    /**
     * 触发新消息回调
     * @param {Object} message
     */
    _emitMessage(message) {
        if (typeof this.onMessage === 'function') {
            try { this.onMessage(message); } catch (_) { /* 忽略回调异常 */ }
        }
    }

    /**
     * 触发打字状态变化回调
     * @param {boolean} typing
     */
    _emitTypingChange(typing) {
        if (typeof this.onTypingChange === 'function') {
            try { this.onTypingChange(typing); } catch (_) { /* 忽略回调异常 */ }
        }
    }

    /**
     * HTML 转义
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return str.replace(/[&<>"']/g, (ch) => map[ch]);
    }

    /**
     * 从数组中随机选取一项
     * @param {Array} arr
     * @returns {*}
     */
    _pickRandom(arr) {
        if (!arr || arr.length === 0) return '...';
        return arr[Math.floor(Math.random() * arr.length)];
    }
}

// ============================================================
// 导出单例及类
// ============================================================

export const chatTerminal = new ChatTerminal();
