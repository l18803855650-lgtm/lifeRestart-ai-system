const DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';
const DEFAULT_MODEL = 'MiniMax-M2.7-highspeed';

const PERSONA_STYLES = {
    signin: '你是一个冰冷机械音里带点愉悦的签到系统，擅长奖励播报、薅羊毛建议、欧皇语气。',
    cultivation: '你是一个修仙器灵/老爷爷型系统，说话有仙侠味，但别过度古风到看不懂。',
    villain: '你是一个毒舌但护短的反派逆袭系统，擅长打脸、做局、点评局势。',
    tycoon: '你是一个高端财富管家型系统，说话克制、优雅，但非常看重资源滚雪球。',
};

function json(res, status, payload) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

function normalizeBaseUrl(env) {
    const raw = env.OPENAI_BASE_URL
        || env.MINIMAX_API_BASE
        || env.MINIMAX_API_HOST
        || DEFAULT_BASE_URL;
    return raw.endsWith('/v1') ? raw : `${raw.replace(/\/+$/, '')}/v1`;
}

function getApiKey(env) {
    return env.OPENAI_API_KEY || env.MINIMAX_API_KEY || '';
}

function compactText(text = '') {
    return `${text}`.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

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

function buildMessages({ intent, userMessage, context, history }) {
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
                '5. 正常回复控制在 120~220 字；如果是建议类，可附 2~3 条短建议。',
                '6. 允许有一点吐槽、装逼感、爽文味，但别拖太长。',
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

async function callMiniMax({ env, messages }) {
    const baseUrl = normalizeBaseUrl(env);
    const apiKey = getApiKey(env);
    const model = env.LIFERESTART_AI_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
        const error = new Error('MINIMAX_API_KEY 未设置');
        error.statusCode = 503;
        throw error;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 1,
            n: 1,
            max_tokens: 420,
            messages,
        }),
        signal: AbortSignal.timeout(30000),
    });

    const rawText = await response.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch {
        data = { rawText };
    }

    if (!response.ok) {
        const error = new Error(data?.error?.message || data?.message || `MiniMax 请求失败（HTTP ${response.status}）`);
        error.statusCode = response.status;
        error.details = data;
        throw error;
    }

    const content = compactText(data?.choices?.[0]?.message?.content || '');
    return {
        reply: content || '系统暂时没有给出有效回复，你可以换个问法再试一次。',
        model,
        baseUrl,
    };
}

export function createSystemDialogueHandler(env) {
    return async (req, res, next) => {
        try {
            if (req.method === 'GET') {
                return json(res, 200, {
                    ok: true,
                    ready: Boolean(getApiKey(env)),
                    model: env.LIFERESTART_AI_MODEL || DEFAULT_MODEL,
                    baseUrl: normalizeBaseUrl(env),
                });
            }

            if (req.method !== 'POST') {
                return json(res, 405, { error: 'Method Not Allowed' });
            }

            const body = await readJsonBody(req);
            const messages = buildMessages(body);
            const result = await callMiniMax({ env, messages });
            return json(res, 200, { ok: true, ...result });
        } catch (error) {
            if (next && typeof next === 'function' && error?.statusCode == null) {
                // Let Vite handle unexpected middleware errors in dev.
            }
            return json(res, error?.statusCode || 500, {
                ok: false,
                error: error?.message || '系统对话请求失败',
            });
        }
    };
}
