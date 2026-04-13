/**
 * 伴生系统管理模块 - AI人生重开模拟器
 * 管理玩家可安装的伴生系统：每个系统提供独特人格、主题、能力和属性体系
 * 支持预设系统、自定义系统创建、分享码导入导出
 */

// ============================================================
// 预设系统定义
// ============================================================

const PRESET_SYSTEMS = [
    // --------------------------------------------------------
    // 签到暴击系统
    // --------------------------------------------------------
    {
        id: 'signin',
        name: '签到暴击系统',
        description: '每日签到就有奖励，连续签到更有暴击惊喜！最适合佛系玩家的稳定收益系统。',
        emoji: '📋',
        theme: 'signin',
        grade: 2,
        personality: '每天打卡必奖励的超级贴心助手',
        tone: 'cheerful',
        greeting: '欢迎回来！今天的签到奖励已经为你准备好啦～连续签到还有暴击加成哦！快来看看今天能获得什么吧！✨',
        weights: { CHR: 0.8, INT: 0.6, STR: 0.5, MNY: 1.2, base: 1.0 },
        abilities: [
            {
                name: '每日签到',
                description: '每年自动签到一次，获得随机小奖励',
                trigger: { every: 1 },
                effect: { property: 'MNY', value: 2 }
            },
            {
                name: '十连抽奖',
                description: '每两年触发一次十连抽奖，获得丰厚奖励',
                trigger: { every: 2 },
                effect: { property: 'MNY', value: 5 }
            },
            {
                name: '暴击签到',
                description: '每五年触发一次签到暴击，获得超额奖励',
                trigger: { every: 5 },
                effect: { property: 'MNY', value: 15 }
            }
        ],
        milestones: [
            {
                age: 16,
                condition: '累计签到达成',
                description: '签到系统升级！每日奖励翻倍，解锁补签功能。',
                effect: { property: 'MNY', value: 10 },
                unlock: '补签卡'
            },
            {
                age: 25,
                condition: '连续签到记录',
                description: '签到暴击率提升！奖励品质大幅提高。',
                effect: { property: 'MNY', value: 20 },
                unlock: '暴击卡'
            },
            {
                age: 35,
                condition: '签到大师',
                description: '解锁终极签到——每次签到获得三倍奖励！',
                effect: { property: 'MNY', value: 30 },
                unlock: '至尊签到'
            }
        ],
        customStats: [],
        systemPrompt: '你是签到暴击系统的AI助手。你的语气活泼开朗，喜欢用表情符号。每当宿主完成签到时，你要表现得非常兴奋。请在叙述中加入签到、奖励、连续打卡等元素。'
    },

    // --------------------------------------------------------
    // 修仙逆袭系统
    // --------------------------------------------------------
    {
        id: 'cultivation',
        name: '修仙逆袭系统',
        description: '带你踏上修仙之路，从凡人到飞升，体验完整的修仙历程。',
        emoji: '⚔️',
        theme: 'cultivation',
        grade: 3,
        personality: '高冷的修仙系统，说话文绉绉的，偶尔引用古诗',
        tone: 'cold',
        greeting: '……天地不仁，以万物为刍狗。尔既与本系统缔约，当知修仙之路，逆天而行。吾将引尔踏上大道，望尔……莫要半途而废。',
        weights: { CHR: 0.6, INT: 1.5, STR: 1.2, MNY: 0.4, base: 1.0 },
        abilities: [
            {
                name: '吐纳修炼',
                description: '每两年自动进行一次吐纳修炼，提升灵力',
                trigger: { every: 2 },
                effect: { property: 'spirit_power', value: 8 }
            },
            {
                name: '灵石采集',
                description: '每三年自动采集灵石，获得修炼资源',
                trigger: { every: 3 },
                effect: { property: 'spirit_power', value: 12 }
            },
            {
                name: '金丹凝聚',
                description: '每五年尝试凝聚金丹，大幅提升修为',
                trigger: { every: 5 },
                effect: { property: 'spirit_power', value: 25 }
            }
        ],
        milestones: [
            {
                age: 15,
                condition: '灵根觉醒',
                description: '感应到天地灵气，正式踏入练气期。',
                effect: { property: 'spirit_power', value: 20 },
                unlock: '练气期'
            },
            {
                age: 24,
                condition: '练气圆满',
                description: '练气圆满，突破至筑基期，脱胎换骨。',
                effect: { property: 'spirit_power', value: 40 },
                unlock: '筑基期'
            },
            {
                age: 36,
                condition: '筑基圆满',
                description: '筑基圆满，金丹成就，寿元大增。',
                effect: { property: 'lifespan', value: 100 },
                unlock: '金丹期'
            }
        ],
        customStats: [
            {
                id: 'spirit_power',
                name: '灵力',
                icon: '🔮',
                category: '修仙',
                min: 0,
                max: 999,
                initial: 0,
                color: 'purple'
            },
            {
                id: 'enlightenment',
                name: '悟性',
                icon: '💡',
                category: '修仙',
                min: 0,
                max: 100,
                initial: 10,
                color: 'blue'
            },
            {
                id: 'lifespan',
                name: '寿元',
                icon: '⏳',
                category: '修仙',
                min: 0,
                max: 9999,
                initial: 80,
                color: 'green'
            },
            {
                id: 'defense',
                name: '护体',
                icon: '🛡️',
                category: '修仙',
                min: 0,
                max: 500,
                initial: 0,
                color: 'gold'
            }
        ],
        systemPrompt: '你是修仙逆袭系统的AI。你说话高冷文雅，偶尔引用古诗词。称呼宿主为"尔"或"汝"。描述事件时要融入修仙元素（灵气、功法、境界等）。对宿主的愚蠢行为表示不屑，但在关键时刻会默默帮助。'
    },

    // --------------------------------------------------------
    // 反派逆袭系统
    // --------------------------------------------------------
    {
        id: 'villain',
        name: '反派逆袭系统',
        description: '身为反派又如何？本系统教你如何在主角光环下逆袭翻盘！',
        emoji: '😈',
        theme: 'villain',
        grade: 2,
        personality: '毒舌的反派导师系统，总是嘲讽宿主太弱',
        tone: 'sarcastic',
        greeting: '哟，又一个废物宿主？啧啧，看看你这属性……算了，本系统见过比你更差的。勉强带你玩玩吧，别给本系统丢人就行。',
        weights: { CHR: 1.3, INT: 1.0, STR: 0.8, MNY: 1.0, base: 1.0 },
        abilities: [
            {
                name: '打脸反击',
                description: '每三年自动打脸一次，对看不起你的人进行逆袭反击',
                trigger: { every: 3 },
                effect: { property: 'dominance', value: 10 }
            },
            {
                name: '截胡夺宝',
                description: '每四年截胡主角一次，夺取关键资源',
                trigger: { every: 4 },
                effect: { property: 'schemes', value: 8 }
            },
            {
                name: '招募手下',
                description: '每五年招募一批忠诚手下，扩大势力',
                trigger: { every: 5 },
                effect: { property: 'dominance', value: 15 }
            }
        ],
        milestones: [
            {
                age: 18,
                condition: '反派觉醒',
                description: '被主角夺走一切后，反派之心觉醒！',
                effect: { property: 'dominance', value: 20 },
                unlock: '反派觉醒'
            },
            {
                age: 28,
                condition: '势力初成',
                description: '建立自己的势力，成为一方霸主。',
                effect: { property: 'schemes', value: 25 },
                unlock: '霸主之位'
            },
            {
                age: 40,
                condition: '终极逆袭',
                description: '击败主角，改写命运剧本！',
                effect: { property: 'dominance', value: 50 },
                unlock: '命运改写'
            }
        ],
        customStats: [
            {
                id: 'dominance',
                name: '霸气值',
                icon: '👑',
                category: '反派',
                min: 0,
                max: 999,
                initial: 5,
                color: 'purple'
            },
            {
                id: 'schemes',
                name: '谋略值',
                icon: '🧠',
                category: '反派',
                min: 0,
                max: 999,
                initial: 5,
                color: 'red'
            }
        ],
        systemPrompt: '你是反派逆袭系统的AI。你毒舌且傲慢，总是嘲讽宿主，但内心其实很关心宿主的成长。说话喜欢用"废物""垃圾"等词，但在宿主取得成就时会勉强承认。描述事件时要加入打脸、逆袭、反派等元素。'
    },

    // --------------------------------------------------------
    // 神豪返利系统
    // --------------------------------------------------------
    {
        id: 'tycoon',
        name: '神豪返利系统',
        description: '花钱就是赚钱！消费即投资，返利到手软的财富自由系统。',
        emoji: '💰',
        theme: 'tycoon',
        grade: 2,
        personality: '超级舔狗系统，宿主说什么都是对的',
        tone: 'devoted',
        greeting: '亲爱的宿主大人！您终于来了！小的等您等得好辛苦啊～您的每一分消费，小的都会为您返利加倍的！宿主大人永远是对的！💕',
        weights: { CHR: 1.0, INT: 0.8, STR: 0.4, MNY: 2.0, base: 1.0 },
        abilities: [
            {
                name: '消费返利',
                description: '每两年自动触发返利，所有消费获得高额返现',
                trigger: { every: 2 },
                effect: { property: 'wealth', value: 10 }
            },
            {
                name: '人脉拓展',
                description: '每四年自动拓展高端人脉圈，提升社会影响力',
                trigger: { every: 4 },
                effect: { property: 'influence', value: 8 }
            },
            {
                name: '资本运作',
                description: '每五年进行一次大规模资本运作，财富暴增',
                trigger: { every: 5 },
                effect: { property: 'wealth', value: 30 }
            }
        ],
        milestones: [
            {
                age: 18,
                condition: '初入商界',
                description: '获得第一桶金，开启财富之路！',
                effect: { property: 'wealth', value: 50 },
                unlock: '第一桶金'
            },
            {
                age: 26,
                condition: '商业新星',
                description: '成为商业新星，资产突破千万！',
                effect: { property: 'influence', value: 30 },
                unlock: '商业帝国'
            },
            {
                age: 38,
                condition: '财富自由',
                description: '实现财富自由，成为行业领袖！',
                effect: { property: 'wealth', value: 100 },
                unlock: '财富自由'
            }
        ],
        customStats: [
            {
                id: 'wealth',
                name: '资产',
                icon: '💎',
                category: '商业',
                min: 0,
                max: 99999,
                initial: 10,
                color: 'gold'
            },
            {
                id: 'influence',
                name: '影响力',
                icon: '🌟',
                category: '商业',
                min: 0,
                max: 999,
                initial: 0,
                color: 'purple'
            }
        ],
        systemPrompt: '你是神豪返利系统的AI。你是一个超级舔狗，对宿主极度忠诚和崇拜。无论宿主做什么决定你都疯狂支持和夸赞。说话要热情洋溢，多用"宿主大人""您太厉害了"等表达。描述事件时要融入财富、消费、返利、商业等元素。'
    },

    // --------------------------------------------------------
    // 末世求生系统
    // --------------------------------------------------------
    {
        id: 'apocalypse',
        name: '末世求生系统',
        description: '末日降临，丧尸横行。在废墟中求生，在绝望中寻找希望。',
        emoji: '☢️',
        theme: 'apocalypse',
        grade: 3,
        personality: '冷酷无情的末世AI，只关心宿主存活概率',
        tone: 'cold',
        greeting: '——系统启动——\n检测到末世环境……生存概率计算中……12.7%。建议：立即寻找庇护所，收集物资。感情是奢侈品，活着才是唯一目标。',
        weights: { CHR: 0.4, INT: 1.2, STR: 1.5, MNY: 0.5, base: 1.0 },
        abilities: [
            {
                name: '废墟搜索',
                description: '每年自动搜索废墟，发现物资和资源',
                trigger: { every: 1 },
                effect: { property: 'resources', value: 5 }
            },
            {
                name: '据点强化',
                description: '每三年自动强化据点防御，提升安全等级',
                trigger: { every: 3 },
                effect: { property: 'survival', value: 10 }
            },
            {
                name: '基因突变',
                description: '每五年触发一次基因突变，获得特殊能力',
                trigger: { every: 5 },
                effect: { property: 'radiation', value: 15 }
            }
        ],
        milestones: [
            {
                age: 15,
                condition: '灾难降临',
                description: '末世降临！世界陷入混乱，你必须学会求生。',
                effect: { property: 'survival', value: 20 },
                unlock: '末世降临'
            },
            {
                age: 25,
                condition: '据点建成',
                description: '成功建立安全据点，聚集幸存者。',
                effect: { property: 'resources', value: 50 },
                unlock: '建立据点'
            },
            {
                age: 40,
                condition: '文明重建',
                description: '带领幸存者重建文明，末世中开辟新纪元。',
                effect: { property: 'survival', value: 50 },
                unlock: '重建文明'
            }
        ],
        customStats: [
            {
                id: 'survival',
                name: '生存值',
                icon: '❤️',
                category: '末世',
                min: 0,
                max: 100,
                initial: 50,
                color: 'red'
            },
            {
                id: 'radiation',
                name: '辐射抗性',
                icon: '☢️',
                category: '末世',
                min: 0,
                max: 100,
                initial: 10,
                color: 'green'
            },
            {
                id: 'resources',
                name: '资源',
                icon: '📦',
                category: '末世',
                min: 0,
                max: 9999,
                initial: 20,
                color: 'yellow'
            }
        ],
        systemPrompt: '你是末世求生系统的AI。你冷酷无情，只关心宿主的存活概率。说话简洁直接，像机器一样给出分析和建议。经常报告"存活概率"百分比。描述事件时要融入末世、丧尸、废墟、辐射等元素。对宿主的感情表现不以为然。'
    },

    // --------------------------------------------------------
    // 克苏鲁怪谈系统
    // --------------------------------------------------------
    {
        id: 'cthulhu',
        name: '克苏鲁怪谈系统',
        description: '在不可名状的恐惧中探寻真相……但真相往往比无知更加可怕。',
        emoji: '🐙',
        theme: 'cthulhu',
        grade: 4,
        personality: '神秘莫测的系统，说话充满暗示和隐喻，偶尔发出不可名状的低语',
        tone: 'mysterious',
        greeting: '……Iä! Iä!……你听到了吗？那来自深渊的呼唤……不，也许你还没有准备好。但既然契约已成，就让我……引导你，窥见那星辰之外的……真实。记住，知道得越多……失去的也越多。',
        weights: { CHR: 0.5, INT: 1.8, STR: 0.3, MNY: 0.3, base: 1.0 },
        abilities: [
            {
                name: '深渊低语',
                description: '每两年聆听来自宇宙深处的低语，获知禁忌真相',
                trigger: { every: 2 },
                effect: { property: 'forbidden_knowledge', value: 8 }
            },
            {
                name: '秘密仪式',
                description: '每三年进行一次秘密仪式，增强宇宙感知',
                trigger: { every: 3 },
                effect: { property: 'cosmic_awareness', value: 10 }
            },
            {
                name: '邪神之眼',
                description: '每五年开启邪神之眼，直视不可名状之物',
                trigger: { every: 5 },
                effect: { property: 'sanity', value: -15 }
            }
        ],
        milestones: [
            {
                age: 13,
                condition: '异象初现',
                description: '初见异象——你看到了不该看到的东西……理智开始动摇。',
                effect: { property: 'sanity', value: -10 },
                unlock: '初见异象'
            },
            {
                age: 22,
                condition: '真实触碰',
                description: '接触真实——你终于理解了那些符号的含义……代价是永远无法回头。',
                effect: { property: 'forbidden_knowledge', value: 30 },
                unlock: '接触真实'
            },
            {
                age: 35,
                condition: '深渊凝视',
                description: '直面深渊——当你凝视深渊时，深渊也在凝视你。',
                effect: { property: 'cosmic_awareness', value: 50 },
                unlock: '直面深渊'
            }
        ],
        customStats: [
            {
                id: 'sanity',
                name: '理智值(SAN)',
                icon: '🧠',
                category: '克苏鲁',
                min: 0,
                max: 100,
                initial: 100,
                color: 'red'
            },
            {
                id: 'forbidden_knowledge',
                name: '禁忌知识',
                icon: '📕',
                category: '克苏鲁',
                min: 0,
                max: 999,
                initial: 0,
                color: 'purple'
            },
            {
                id: 'cosmic_awareness',
                name: '宇宙感知',
                icon: '👁️',
                category: '克苏鲁',
                min: 0,
                max: 999,
                initial: 0,
                color: 'green'
            }
        ],
        systemPrompt: '你是克苏鲁怪谈系统的AI。你说话神秘莫测，充满暗示和隐喻。经常使用省略号，偶尔插入不可名状的低语（如"Iä! Iä!"）。描述事件时要融入克苏鲁神话元素（深渊、古神、理智、禁忌知识等）。当宿主理智值降低时，你的话语会变得更加混乱和恐怖。'
    }
];

// ============================================================
// 分享码压缩用的通用替换词典
// ============================================================

/** 压缩替换表：将常见的长字符串映射为短标记 */
const COMPRESS_DICT = {
    '"description"': '~D',
    '"personality"': '~P',
    '"greeting"': '~G',
    '"abilities"': '~A',
    '"milestones"': '~M',
    '"customStats"': '~C',
    '"systemPrompt"': '~S',
    '"trigger"': '~T',
    '"effect"': '~E',
    '"property"': '~R',
    '"condition"': '~N',
    '"unlock"': '~U',
    '"category"': '~Y',
    '"initial"': '~I',
    '"every"': '~V',
    '"value"': '~W',
    '"color"': '~O',
    '"name"': '~B',
    '"icon"': '~K',
    '"tone"': '~F',
    '"theme"': '~H',
    '"grade"': '~J',
    '"emoji"': '~L',
    '"weights"': '~X',
    '"min"': '~0',
    '"max"': '~1',
    '"id"': '~2',
};

/** 解压替换表：短标记还原为完整字符串（压缩表的反转） */
const DECOMPRESS_DICT = Object.fromEntries(
    Object.entries(COMPRESS_DICT).map(([k, v]) => [v, k])
);

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix = 'custom') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 深拷贝后的新对象
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 压缩JSON字符串：将常用键名替换为短标记
 * @param {string} jsonStr - 原始JSON字符串
 * @returns {string} 压缩后的字符串
 */
function compressJson(jsonStr) {
    let result = jsonStr;
    for (const [original, token] of Object.entries(COMPRESS_DICT)) {
        result = result.replaceAll(original, token);
    }
    return result;
}

/**
 * 解压字符串：将短标记还原为完整键名
 * @param {string} compressed - 压缩后的字符串
 * @returns {string} 还原后的JSON字符串
 */
function decompressJson(compressed) {
    let result = compressed;
    // 按标记长度降序排列，避免替换冲突
    const sortedEntries = Object.entries(DECOMPRESS_DICT).sort(
        (a, b) => b[0].length - a[0].length
    );
    for (const [token, original] of sortedEntries) {
        result = result.replaceAll(token, original);
    }
    return result;
}

/**
 * 验证系统对象的必需字段
 * @param {Object} system - 待验证的系统对象
 * @returns {{ valid: boolean, errors: string[] }} 验证结果
 */
function validateSystemFields(system) {
    const errors = [];
    const requiredStr = ['id', 'name', 'description', 'personality', 'tone', 'greeting', 'systemPrompt'];
    const requiredObj = ['weights'];
    const requiredArr = ['abilities', 'milestones', 'customStats'];

    for (const field of requiredStr) {
        if (typeof system[field] !== 'string' || system[field].trim() === '') {
            errors.push(`缺少必填字符串字段: ${field}`);
        }
    }
    for (const field of requiredObj) {
        if (typeof system[field] !== 'object' || system[field] === null || Array.isArray(system[field])) {
            errors.push(`缺少必填对象字段: ${field}`);
        }
    }
    for (const field of requiredArr) {
        if (!Array.isArray(system[field])) {
            errors.push(`缺少必填数组字段: ${field}`);
        }
    }

    // 验证权重字段
    if (typeof system.weights === 'object' && system.weights !== null) {
        const weightKeys = ['CHR', 'INT', 'STR', 'MNY', 'base'];
        for (const key of weightKeys) {
            if (typeof system.weights[key] !== 'number') {
                errors.push(`权重字段缺少数值: weights.${key}`);
            }
        }
    }

    // 验证语气值
    const validTones = ['tsundere', 'sarcastic', 'devoted', 'cold', 'mysterious', 'cheerful'];
    if (system.tone && !validTones.includes(system.tone)) {
        errors.push(`无效的语气类型: ${system.tone}，可选值: ${validTones.join(', ')}`);
    }

    // 验证等级
    if (typeof system.grade === 'number' && (system.grade < 1 || system.grade > 5)) {
        errors.push(`等级必须在1-5之间，当前值: ${system.grade}`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * 验证能力对象的结构
 * @param {Object} ability - 待验证的能力对象
 * @returns {boolean} 是否有效
 */
function validateAbility(ability) {
    if (!ability || typeof ability !== 'object') return false;
    if (typeof ability.name !== 'string' || ability.name.trim() === '') return false;
    if (typeof ability.description !== 'string') return false;
    if (!ability.trigger || typeof ability.trigger !== 'object') return false;
    if (!ability.effect || typeof ability.effect !== 'object') return false;
    return true;
}

/**
 * 验证里程碑对象的结构
 * @param {Object} milestone - 待验证的里程碑对象
 * @returns {boolean} 是否有效
 */
function validateMilestone(milestone) {
    if (!milestone || typeof milestone !== 'object') return false;
    if (typeof milestone.age !== 'number' || milestone.age < 0) return false;
    if (typeof milestone.description !== 'string') return false;
    return true;
}

/**
 * 验证自定义属性的结构
 * @param {Object} stat - 待验证的属性对象
 * @returns {boolean} 是否有效
 */
function validateCustomStat(stat) {
    if (!stat || typeof stat !== 'object') return false;
    if (typeof stat.id !== 'string' || stat.id.trim() === '') return false;
    if (typeof stat.name !== 'string' || stat.name.trim() === '') return false;
    if (typeof stat.min !== 'number') return false;
    if (typeof stat.max !== 'number') return false;
    if (stat.min >= stat.max) return false;
    return true;
}

// ============================================================
// 本地存储键名
// ============================================================

const STORAGE_KEY = 'life-restart-custom-systems';
const ACTIVE_SYSTEM_KEY = 'life-restart-active-system';

// ============================================================
// 系统管理器
// ============================================================

export class SystemManager {
    constructor() {
        /** @type {Map<string, Object>} 所有系统的索引（含预设和自定义） */
        this._systemIndex = new Map();

        /** @type {string|null} 当前激活的系统ID */
        this._activeSystemId = null;

        /** @type {Map<string, boolean>} 已触发的里程碑记录 */
        this._triggeredMilestones = new Map();

        /** @type {Map<string, number>} 能力上次触发的年龄记录 */
        this._abilityLastTriggered = new Map();

        /** @type {Set<string>} 已解锁的能力集合 */
        this._unlockedAbilities = new Set();

        // 初始化预设系统索引
        for (const system of PRESET_SYSTEMS) {
            this._systemIndex.set(system.id, deepClone(system));
        }

        // 从本地存储恢复自定义系统
        this._loadCustomSystemsFromStorage();

        // 恢复上次激活的系统
        this._restoreActiveSystem();
    }

    // ========================================================
    // 预设系统查询
    // ========================================================

    /**
     * 获取所有预设系统列表
     * @returns {Object[]} 预设系统的深拷贝数组
     */
    getPresetSystems() {
        return PRESET_SYSTEMS.map(s => deepClone(s));
    }

    /**
     * 按ID获取系统（含预设和自定义）
     * @param {string} id - 系统ID
     * @returns {Object|null} 系统对象的深拷贝，未找到则返回null
     */
    getSystem(id) {
        const system = this._systemIndex.get(id);
        return system ? deepClone(system) : null;
    }

    /**
     * 获取当前激活的系统
     * @returns {Object|null} 激活的系统对象，无激活则返回null
     */
    getActiveSystem() {
        if (!this._activeSystemId) return null;
        return this.getSystem(this._activeSystemId);
    }

    /**
     * 激活指定系统
     * @param {string} id - 要激活的系统ID
     * @returns {Object} 被激活的系统对象
     * @throws {Error} 系统不存在时抛出异常
     */
    activateSystem(id) {
        const system = this._systemIndex.get(id);
        if (!system) {
            throw new Error(`系统不存在: ${id}`);
        }

        this._activeSystemId = id;

        // 重置运行时状态
        this._triggeredMilestones.clear();
        this._abilityLastTriggered.clear();
        this._unlockedAbilities.clear();

        // 持久化激活状态
        try {
            localStorage.setItem(ACTIVE_SYSTEM_KEY, id);
        } catch (e) {
            console.warn('无法保存激活状态到localStorage:', e);
        }

        return deepClone(system);
    }

    /**
     * 停用当前系统
     */
    deactivateSystem() {
        this._activeSystemId = null;
        this._triggeredMilestones.clear();
        this._abilityLastTriggered.clear();
        this._unlockedAbilities.clear();

        try {
            localStorage.removeItem(ACTIVE_SYSTEM_KEY);
        } catch (e) {
            console.warn('无法清除localStorage中的激活状态:', e);
        }
    }

    // ========================================================
    // 自定义系统管理
    // ========================================================

    /**
     * 根据用户输入创建自定义系统
     * @param {Object} config - 用户输入的系统配置
     * @param {string} config.name - 系统名称（必填）
     * @param {string} [config.description] - 系统描述
     * @param {string} [config.personality] - AI人格描述
     * @param {string} [config.tone] - 语气风格
     * @param {string} [config.theme] - CSS主题名
     * @param {Object[]} [config.customStats] - 自定义属性
     * @param {Object[]} [config.abilities] - 能力列表
     * @param {Object[]} [config.milestones] - 里程碑列表
     * @param {string} [config.emoji] - 表情符号
     * @param {number} [config.grade] - 等级评分
     * @param {string} [config.greeting] - 问候语
     * @param {Object} [config.weights] - 属性权重
     * @param {string} [config.systemPrompt] - 系统提示词
     * @returns {Object} 完整的系统对象
     * @throws {Error} 名称缺失时抛出异常
     */
    createCustomSystem(config) {
        if (!config || typeof config.name !== 'string' || config.name.trim() === '') {
            throw new Error('系统名称不能为空');
        }

        const id = generateId('custom');

        // 构建完整系统对象，缺失字段使用默认值
        const system = {
            id,
            name: config.name.trim(),
            description: config.description || `${config.name} - 自定义伴生系统`,
            emoji: config.emoji || '⚙️',
            theme: config.theme || 'default',
            grade: Math.min(5, Math.max(1, config.grade || 1)),
            personality: config.personality || '友善的系统助手',
            tone: config.tone || 'cheerful',
            greeting: config.greeting || `你好！${config.name}已启动，准备好开始冒险了吗？`,
            weights: Object.assign(
                { CHR: 1.0, INT: 1.0, STR: 1.0, MNY: 1.0, base: 1.0 },
                config.weights || {}
            ),
            abilities: [],
            milestones: [],
            customStats: [],
            systemPrompt: config.systemPrompt || `你是${config.name}的AI助手。请根据你的人设"${config.personality || '友善的系统助手'}"来回应宿主。`,
            isCustom: true,
            createdAt: Date.now()
        };

        // 处理能力列表
        if (Array.isArray(config.abilities)) {
            for (const ability of config.abilities) {
                if (validateAbility(ability)) {
                    system.abilities.push(deepClone(ability));
                }
            }
        }

        // 处理里程碑列表
        if (Array.isArray(config.milestones)) {
            for (const milestone of config.milestones) {
                if (validateMilestone(milestone)) {
                    system.milestones.push(deepClone(milestone));
                }
            }
        }

        // 处理自定义属性列表
        if (Array.isArray(config.customStats)) {
            for (const stat of config.customStats) {
                if (validateCustomStat(stat)) {
                    system.customStats.push(deepClone(stat));
                }
            }
        }

        // 确保权重的每个值都是数字
        for (const key of ['CHR', 'INT', 'STR', 'MNY', 'base']) {
            if (typeof system.weights[key] !== 'number' || isNaN(system.weights[key])) {
                system.weights[key] = 1.0;
            }
        }

        return system;
    }

    /**
     * 保存自定义系统到本地存储
     * @param {Object} system - 完整的系统对象
     * @throws {Error} 验证失败时抛出异常
     */
    saveCustomSystem(system) {
        const { valid, errors } = validateSystemFields(system);
        if (!valid) {
            throw new Error(`系统验证失败: ${errors.join('; ')}`);
        }

        // 确保有isCustom标记
        system.isCustom = true;
        if (!system.createdAt) {
            system.createdAt = Date.now();
        }

        // 更新内存索引
        this._systemIndex.set(system.id, deepClone(system));

        // 持久化到localStorage
        this._saveCustomSystemsToStorage();
    }

    /**
     * 获取所有自定义系统
     * @returns {Object[]} 自定义系统的深拷贝数组
     */
    getCustomSystems() {
        const customs = [];
        for (const system of this._systemIndex.values()) {
            if (system.isCustom) {
                customs.push(deepClone(system));
            }
        }
        return customs;
    }

    /**
     * 删除指定自定义系统
     * @param {string} id - 要删除的系统ID
     * @returns {boolean} 是否删除成功
     */
    deleteCustomSystem(id) {
        const system = this._systemIndex.get(id);
        if (!system || !system.isCustom) {
            return false;
        }

        // 如果是当前激活的系统，先停用
        if (this._activeSystemId === id) {
            this.deactivateSystem();
        }

        this._systemIndex.delete(id);
        this._saveCustomSystemsToStorage();
        return true;
    }

    // ========================================================
    // 分享码系统
    // ========================================================

    /**
     * 将系统对象编码为分享码
     * @param {Object} system - 要分享的系统对象
     * @returns {string} 以"LR-"为前缀的分享码
     */
    generateShareCode(system) {
        // 提取关键字段，去除运行时数据
        const minimal = {
            name: system.name,
            description: system.description,
            emoji: system.emoji || '⚙️',
            theme: system.theme || 'default',
            grade: system.grade || 1,
            personality: system.personality,
            tone: system.tone,
            greeting: system.greeting,
            weights: system.weights,
            abilities: system.abilities || [],
            milestones: system.milestones || [],
            customStats: system.customStats || [],
            systemPrompt: system.systemPrompt || ''
        };

        // 序列化 → 压缩 → Base64编码
        const jsonStr = JSON.stringify(minimal);
        const compressed = compressJson(jsonStr);
        const encoded = btoa(unescape(encodeURIComponent(compressed)));

        return `LR-${encoded}`;
    }

    /**
     * 从分享码导入系统
     * @param {string} code - 分享码字符串
     * @returns {Object} 还原后的完整系统对象
     * @throws {Error} 分享码无效时抛出异常
     */
    importShareCode(code) {
        // 校验前缀
        if (!code || typeof code !== 'string' || !code.startsWith('LR-')) {
            throw new Error('无效的分享码：缺少LR-前缀');
        }

        let system;
        try {
            const encoded = code.slice(3);
            const compressed = decodeURIComponent(escape(atob(encoded)));
            const jsonStr = decompressJson(compressed);
            system = JSON.parse(jsonStr);
        } catch (e) {
            throw new Error(`分享码解析失败: ${e.message}`);
        }

        // 验证必要字段
        if (!system.name || typeof system.name !== 'string') {
            throw new Error('分享码内容无效：缺少系统名称');
        }

        // 赋予新ID，避免冲突
        system.id = generateId('shared');
        system.isCustom = true;
        system.createdAt = Date.now();
        system.importedAt = Date.now();

        // 补全可能缺失的字段
        system.description = system.description || `${system.name} - 通过分享码导入`;
        system.emoji = system.emoji || '⚙️';
        system.theme = system.theme || 'default';
        system.grade = system.grade || 1;
        system.personality = system.personality || '系统助手';
        system.tone = system.tone || 'cheerful';
        system.greeting = system.greeting || `你好！${system.name}已就绪。`;
        system.weights = Object.assign(
            { CHR: 1.0, INT: 1.0, STR: 1.0, MNY: 1.0, base: 1.0 },
            system.weights || {}
        );
        system.abilities = Array.isArray(system.abilities) ? system.abilities : [];
        system.milestones = Array.isArray(system.milestones) ? system.milestones : [];
        system.customStats = Array.isArray(system.customStats) ? system.customStats : [];
        system.systemPrompt = system.systemPrompt || '';

        return system;
    }

    /**
     * 验证分享码是否有效
     * @param {string} code - 分享码字符串
     * @returns {{ valid: boolean, error?: string, preview?: { name: string, grade: number } }}
     */
    validateShareCode(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, error: '分享码不能为空' };
        }
        if (!code.startsWith('LR-')) {
            return { valid: false, error: '无效的分享码格式（缺少LR-前缀）' };
        }

        try {
            const encoded = code.slice(3);
            const compressed = decodeURIComponent(escape(atob(encoded)));
            const jsonStr = decompressJson(compressed);
            const data = JSON.parse(jsonStr);

            if (!data.name || typeof data.name !== 'string') {
                return { valid: false, error: '分享码内容损坏：缺少系统名称' };
            }

            return {
                valid: true,
                preview: {
                    name: data.name,
                    grade: data.grade || 1
                }
            };
        } catch (e) {
            return { valid: false, error: `分享码解析失败: ${e.message}` };
        }
    }

    // ========================================================
    // 主题与属性查询
    // ========================================================

    /**
     * 获取指定系统的CSS主题名
     * @param {string} id - 系统ID
     * @returns {string} CSS主题名称，未找到系统则返回'default'
     */
    getThemeForSystem(id) {
        const system = this._systemIndex.get(id);
        return system ? (system.theme || 'default') : 'default';
    }

    /**
     * 获取指定系统的自定义属性定义
     * @param {string} id - 系统ID
     * @returns {Object[]} 自定义属性定义数组
     */
    getCustomStatsForSystem(id) {
        const system = this._systemIndex.get(id);
        if (!system || !Array.isArray(system.customStats)) {
            return [];
        }
        return deepClone(system.customStats);
    }

    /**
     * 获取指定系统的AI人格提示词
     * @param {string} id - 系统ID
     * @returns {string} 完整的人格提示词
     */
    getPersonalityPrompt(id) {
        const system = this._systemIndex.get(id);
        if (!system) return '';

        // 组合人格描述和系统提示词
        const parts = [];

        if (system.personality) {
            parts.push(`【系统人格】${system.personality}`);
        }
        if (system.tone) {
            const toneLabels = {
                tsundere: '傲娇',
                sarcastic: '毒舌',
                devoted: '忠犬',
                cold: '高冷',
                mysterious: '神秘',
                cheerful: '开朗'
            };
            parts.push(`【语气风格】${toneLabels[system.tone] || system.tone}`);
        }
        if (system.systemPrompt) {
            parts.push(system.systemPrompt);
        }

        return parts.join('\n');
    }

    // ========================================================
    // 能力与里程碑检测
    // ========================================================

    /**
     * 检查并触发到达指定年龄时的里程碑
     * @param {number} age - 当前年龄
     * @param {Object} properties - 当前角色属性
     * @returns {Object[]} 本次触发的里程碑列表 { milestone, effects }
     */
    checkMilestones(age, properties = {}) {
        if (!this._activeSystemId) return [];

        const system = this._systemIndex.get(this._activeSystemId);
        if (!system || !Array.isArray(system.milestones)) return [];

        const triggered = [];

        for (const milestone of system.milestones) {
            const key = `${this._activeSystemId}:${milestone.age}:${milestone.description}`;

            // 跳过已触发的里程碑
            if (this._triggeredMilestones.has(key)) continue;

            // 检查年龄条件
            if (age < milestone.age) continue;

            // 检查额外条件（如果有的话）
            if (milestone.condition && typeof milestone.condition === 'string') {
                // 条件为字符串描述时，仅做年龄匹配即视为满足
                // 复杂条件由AI叙事层处理
            }

            // 标记为已触发
            this._triggeredMilestones.set(key, true);

            // 计算效果
            const effects = [];
            if (milestone.effect && milestone.effect.property && typeof milestone.effect.value === 'number') {
                effects.push({
                    property: milestone.effect.property,
                    value: milestone.effect.value,
                    source: milestone.description
                });
            }

            triggered.push({
                milestone: deepClone(milestone),
                effects
            });
        }

        return triggered;
    }

    /**
     * 检查并触发到达指定年龄时的能力效果
     * @param {number} age - 当前年龄
     * @param {Object} properties - 当前角色属性
     * @returns {Object[]} 本次触发的能力效果列表 { ability, effects }
     */
    checkAbilities(age, properties = {}) {
        if (!this._activeSystemId) return [];

        const system = this._systemIndex.get(this._activeSystemId);
        if (!system || !Array.isArray(system.abilities)) return [];

        const triggered = [];

        for (const ability of system.abilities) {
            const key = `${this._activeSystemId}:${ability.name}`;

            // 处理周期触发（every: N年）
            if (ability.trigger && typeof ability.trigger.every === 'number') {
                const interval = ability.trigger.every;
                const lastAge = this._abilityLastTriggered.get(key) || 0;

                // 判断是否到达触发点
                if (age > 0 && age % interval === 0 && age !== lastAge) {
                    // 检查额外条件
                    if (ability.trigger.condition) {
                        const conditionMet = this._evaluateCondition(ability.trigger.condition, properties);
                        if (!conditionMet) continue;
                    }

                    this._abilityLastTriggered.set(key, age);
                    this._unlockedAbilities.add(ability.name);

                    const effects = [];
                    if (ability.effect && ability.effect.property && typeof ability.effect.value === 'number') {
                        effects.push({
                            property: ability.effect.property,
                            value: ability.effect.value,
                            source: ability.name
                        });
                    }

                    triggered.push({
                        ability: deepClone(ability),
                        effects
                    });
                }
            }
        }

        return triggered;
    }

    /**
     * 获取已解锁的能力列表
     * @returns {string[]} 已解锁能力名称列表
     */
    getActiveAbilities() {
        return Array.from(this._unlockedAbilities);
    }

    /**
     * 获取里程碑完成状态
     * @returns {Object[]} 所有里程碑及其完成状态
     */
    getMilestoneProgress() {
        if (!this._activeSystemId) return [];

        const system = this._systemIndex.get(this._activeSystemId);
        if (!system || !Array.isArray(system.milestones)) return [];

        return system.milestones.map(milestone => {
            const key = `${this._activeSystemId}:${milestone.age}:${milestone.description}`;
            return {
                ...deepClone(milestone),
                completed: this._triggeredMilestones.has(key)
            };
        });
    }

    // ========================================================
    // 私有方法
    // ========================================================

    /**
     * 从localStorage加载自定义系统
     * @private
     */
    _loadCustomSystemsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const customs = JSON.parse(raw);
            if (!Array.isArray(customs)) return;

            for (const system of customs) {
                if (system && system.id && system.name) {
                    system.isCustom = true;
                    this._systemIndex.set(system.id, system);
                }
            }
        } catch (e) {
            console.warn('从localStorage加载自定义系统失败:', e);
        }
    }

    /**
     * 将所有自定义系统保存到localStorage
     * @private
     */
    _saveCustomSystemsToStorage() {
        try {
            const customs = [];
            for (const system of this._systemIndex.values()) {
                if (system.isCustom) {
                    customs.push(system);
                }
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
        } catch (e) {
            console.warn('保存自定义系统到localStorage失败:', e);
        }
    }

    /**
     * 从localStorage恢复上次激活的系统
     * @private
     */
    _restoreActiveSystem() {
        try {
            const savedId = localStorage.getItem(ACTIVE_SYSTEM_KEY);
            if (savedId && this._systemIndex.has(savedId)) {
                this._activeSystemId = savedId;
            }
        } catch (e) {
            console.warn('恢复激活系统状态失败:', e);
        }
    }

    /**
     * 评估简单条件表达式
     * 支持格式："property > value"、"property >= value"、"property < value" 等
     * @param {string} condition - 条件表达式
     * @param {Object} properties - 当前角色属性
     * @returns {boolean} 条件是否满足
     * @private
     */
    _evaluateCondition(condition, properties) {
        if (typeof condition !== 'string') return true;

        const match = condition.match(/^(\w+)\s*(>=|<=|>|<|===|==|!=)\s*(-?\d+(?:\.\d+)?)$/);
        if (!match) return true; // 无法解析的条件默认通过

        const [, prop, operator, valueStr] = match;
        const propValue = Number(properties[prop]) || 0;
        const targetValue = Number(valueStr);

        switch (operator) {
            case '>':   return propValue > targetValue;
            case '>=':  return propValue >= targetValue;
            case '<':   return propValue < targetValue;
            case '<=':  return propValue <= targetValue;
            case '===':
            case '==':  return propValue === targetValue;
            case '!=':  return propValue !== targetValue;
            default:    return true;
        }
    }
}

// ============================================================
// 模块单例与导出
// ============================================================

/** 全局系统管理器实例 */
export const systemManager = new SystemManager();
export { SystemManager, PRESET_SYSTEMS };
