const PERSONA_STYLES = {
    signin: '你是一个冰冷机械音里带点愉悦的签到系统，擅长奖励播报、薅羊毛建议、欧皇语气。',
    cultivation: '你是一个修仙器灵/老爷爷型系统，说话有仙侠味，但别过度古风到看不懂。',
    villain: '你是一个毒舌但护短的反派逆袭系统，擅长打脸、做局、点评局势。',
    tycoon: '你是一个高端财富管家型系统，说话克制、优雅，但非常看重资源滚雪球。',
};

function formatProperties(properties = {}) {
    const entries = [
        ['年龄', properties.AGE],
        ['颜值', properties.CHR],
        ['智力', properties.INT],
        ['体质', properties.STR],
        ['家境', properties.MNY],
        ['快乐', properties.SPR],
        ['系统等级', properties.SYSLV],
        ['系统点', properties.PTS],
        ['气运', properties.FATE],
        ['声望', properties.REP],
        ['能量', properties.ENG],
    ].filter(([, value]) => value !== undefined && value !== null);
    return entries.map(([label, value]) => `${label}:${value}`).join('，');
}

function formatTalents(talents = []) {
    if (!talents.length) return '无';
    return talents
        .slice(0, 6)
        .map(({ name, description }) => `${name}（${description}）`)
        .join('；');
}

function formatRecentTrajectory(recentTrajectory = []) {
    if (!recentTrajectory.length) return '暂无';
    return recentTrajectory
        .slice(-6)
        .map(({ age, lines = [] }) => `${age}岁：${lines.join(' / ')}`)
        .join('\n');
}

function formatSummary(summary = []) {
    if (!summary.length) return '暂无';
    return summary
        .map(({ label, value, judge }) => `${label}:${value}${judge ? `（${judge}）` : ''}`)
        .join('，');
}

function buildIntentPrompt(intent, userMessage) {
    if (userMessage?.trim()) return userMessage.trim();
    switch (intent) {
        case 'intro':
            return '请以系统身份做一次开场播报，告诉我这局绑定了什么系统、当前局势如何、第一步最该干什么。';
        case 'advice':
            return '根据当前人生局势，给我一句带网文味的点评，再给 3 条短建议。';
        case 'commentary':
            return '用系统口吻锐评我这局的发展，允许轻微毒舌，但别太长。';
        case 'summary':
            return '现在已经来到人生总结阶段，请你以系统身份复盘这一生，点出高光、遗憾和下一局最值得继承的方向。';
        case 'create-event':
            return [
                '现在进入“共创新事件”模式。',
                '请结合当前系统、人物属性和最近轨迹，设计 1 个适合加入《人生重开模拟器》的新事件。',
                '输出格式必须是：',
                '1. 先用 2~4 句话解释这个事件为什么适合当前玩法。',
                '2. 再给一个 ```json``` 代码块，字段尽量兼容事件表。',
                'JSON 至少包含：id、event、effect。可以额外带 include、exclude、branch。',
                '3. 文案要有网文味，但 effect 不要离谱。',
            ].join('\n');
        case 'create-talent':
            return [
                '现在进入“共创新天赋”模式。',
                '请结合当前系统和玩法方向，设计 1 个适合加入游戏的新天赋。',
                '输出格式必须是：',
                '1. 先简短说明设计思路。',
                '2. 再给一个 ```json``` 代码块，字段尽量兼容天赋表。',
                'JSON 至少包含：id、name、description、grade。可额外带 effect、condition、exclusive。',
                '3. 让它既有爽文味，也能落在现有数值体系里。',
            ].join('\n');
        case 'create-system':
            return [
                '现在进入“共创新系统能力”模式。',
                '请给当前玩法再设计 1 个可扩展的系统能力/里程碑草案。',
                '输出格式：先说明，再给 ```json``` 代码块。',
                'JSON 尽量包含：name、description、trigger、effect、grade。',
                '如果你觉得更适合做 milestone，也可以给出 milestone 结构。',
            ].join('\n');
        default:
            return '请继续以系统身份和我对话。';
    }
}

function buildContextMessage(context = {}) {
    const { phase, system, properties, talents, recentTrajectory, summary } = context;
    const abilityNames = (system?.abilities || []).map(({ name }) => name).join(' / ') || '暂无';
    return [
        `阶段：${phase || 'trajectory'}`,
        `系统：${system?.name || '未绑定'} / 主题：${system?.theme || '未知'} / 等级：${system?.level ?? 0}`,
        `系统说明：${system?.description || '暂无'}`,
        `当前属性：${formatProperties(properties)}`,
        `已解锁能力：${abilityNames}`,
        `天赋：${formatTalents(talents)}`,
        `最近轨迹：\n${formatRecentTrajectory(recentTrajectory)}`,
        `总结页数据：${formatSummary(summary)}`,
        `下一目标：${system?.nextGoal || '暂无'}`,
    ].join('\n');
}

export function buildSystemMessages({ intent = 'chat', userMessage = '', context = {}, history = [] } = {}) {
    const systemId = context?.system?.id;
    const persona = PERSONA_STYLES[systemId] || '你是一个网文味十足的人生系统，负责吐槽、引导、播报奖励和给建议。';
    const prompt = buildIntentPrompt(intent, userMessage);
    const messages = [
        {
            role: 'system',
            content: [
                '你正在扮演《人生重开模拟器》里的专属系统，不要跳出角色。',
                persona,
                '回复要求：',
                '1. 一律用简体中文。',
                '2. 口吻像网文里的“系统提示音/器灵/财富管家”，但要自然好读。',
                '3. 必须结合当前系统、属性、最近轨迹和玩家提问来回答。',
                '4. 不要暴露自己是模型、AI 或 API。',
                '5. 正常回复控制在 120~260 字；如果是共创模式，可以更长，但别废话。',
                '6. 允许一点吐槽、装逼感、爽文味。',
                '7. 如果用户要求共创新事件/天赋/系统能力，就严格按要求给说明 + JSON 草案。',
            ].join('\n'),
        },
        {
            role: 'user',
            content: `这是当前回合的游戏上下文，请牢记：\n${buildContextMessage(context)}`,
        },
    ];

    for (const item of (history || []).slice(-8)) {
        if (!item?.role || !item?.content) continue;
        if (!['user', 'assistant'].includes(item.role)) continue;
        messages.push({ role: item.role, content: item.content.slice(0, 1200) });
    }

    messages.push({ role: 'user', content: prompt });
    return messages;
}
