/**
 * 多模型 AI 服务模块
 * 支持 MiniMax、OpenAI、Gemini、智谱GLM、DeepSeek 及自定义 API
 * BYOK（自带密钥）架构，密钥仅存储在用户本地浏览器中
 */

// ============================================================
// 供应商配置
// ============================================================
const PROVIDERS = {
    minimax: {
        name: 'MiniMax',
        baseUrl: 'https://api.minimaxi.com/v1',
        defaultModel: 'MiniMax-M2.7-highspeed',
        models: ['MiniMax-M2.7-highspeed', 'abab6.5s-chat']
    },
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
    },
    gemini: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        defaultModel: 'gemini-pro',
        models: ['gemini-pro', 'gemini-1.5-flash']
    },
    glm: {
        name: '智谱 GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4-flash',
        models: ['glm-4-flash', 'glm-4']
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        models: ['deepseek-chat', 'deepseek-coder']
    },
    custom: {
        name: '自定义 API',
        baseUrl: '',
        defaultModel: '',
        models: []
    }
};

// 本地存储键名
const STORAGE_KEY = 'life-restart-ai-config';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 30000;

// 最大重试次数
const MAX_RETRIES = 3;

// 重试基础延迟（毫秒）
const BASE_RETRY_DELAY = 1000;

// 系统回复对话框中保留的最近历史消息条数（仅用于 AI 上下文，不影响聊天终端显示）
const MAX_CHAT_HISTORY_MESSAGES = 10;

// ============================================================
// AIService 类
// ============================================================
class AIService {
    constructor() {
        /** 当前供应商标识 */
        this.provider = 'minimax';
        /** API 密钥（明文，仅运行时持有） */
        this.apiKey = '';
        /** API 基础地址 */
        this.baseUrl = PROVIDERS.minimax.baseUrl;
        /** 当前使用的模型名称 */
        this.model = PROVIDERS.minimax.defaultModel;

        this._loadConfig();
    }

    // --------------------------------------------------------
    // 公开方法
    // --------------------------------------------------------

    /**
     * 配置 AI 服务
     * @param {Object} opts - 配置项
     * @param {string} opts.provider  - 供应商标识
     * @param {string} opts.apiKey    - API 密钥
     * @param {string} [opts.baseUrl] - 自定义基础地址
     * @param {string} [opts.model]   - 模型名称
     */
    configure({ provider, apiKey, baseUrl, model }) {
        if (provider && PROVIDERS[provider]) {
            this.provider = provider;
            const prov = PROVIDERS[provider];
            this.baseUrl = baseUrl || prov.baseUrl;
            this.model = model || prov.defaultModel;
        }
        if (baseUrl) this.baseUrl = baseUrl;
        if (model) this.model = model;
        if (apiKey !== undefined) this.apiKey = apiKey;

        this._saveConfig();
    }

    /**
     * 获取当前配置
     * @param {Object} options
     * @param {boolean} options.masked - 是否脱敏 API Key
     * @returns {Object}
     */
    getConfig(options = {}) {
        const { masked = false } = options;
        return {
            provider: this.provider,
            apiKey: masked ? (this.apiKey ? this._maskKey(this.apiKey) : '') : (this.apiKey || ''),
            baseUrl: this.baseUrl,
            model: this.model,
            providerName: PROVIDERS[this.provider]?.name || '未知'
        };
    }

    /**
     * 获取所有可用供应商列表
     * @returns {Object}
     */
    getProviders() {
        return JSON.parse(JSON.stringify(PROVIDERS));
    }

    /**
     * 检查是否已配置 API 密钥
     * @returns {boolean}
     */
    isConfigured() {
        return Boolean(this.apiKey);
    }

    /**
     * 核心聊天补全调用
     * @param {Array<{role:string, content:string}>} messages - 消息列表
     * @param {Object} [options] - 额外参数
     * @param {number} [options.temperature=0.9]
     * @param {number} [options.max_tokens=800]
     * @returns {Promise<string>} AI 回复文本
     */
    async chat(messages, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('未配置 API 密钥，请先在设置中填写密钥。');
        }

        const temperature = options.temperature ?? 0.9;
        const maxTokens = options.max_tokens ?? 800;

        const raw = this.provider === 'gemini'
            ? await this._callGemini(messages, { temperature, maxTokens })
            : await this._callOpenAICompatible(messages, { temperature, maxTokens });

        return this._sanitizeAIText(raw);
    }

    /**
     * 生成年度生活事件
     * @param {Object} context - 游戏上下文
     * @returns {Promise<{reply:string, events:Array, source:string}>}
     */
    async generateYearlyEvent(context) {
        if (!this.isConfigured()) {
            return this._localGenerateEvent(context);
        }
        try {
            const messages = this._buildYearlyEventPrompt(context);
            const reply = await this.chat(messages, { temperature: 0.95, max_tokens: 600 });
            const events = this._parseEventReply(reply);
            return { reply, events, source: 'ai' };
        } catch (err) {
            console.warn('AI 生成事件失败，回退到本地引擎：', err.message);
            return this._localGenerateEvent(context);
        }
    }

    /**
     * 生成系统人格回复
     * @param {Object} context  - 游戏上下文
     * @param {string} userMessage - 用户消息
     * @returns {Promise<{reply:string, source:string}>}
     */
    async generateSystemReply(context, userMessage) {
        if (!this.isConfigured()) {
            return this._localGenerateReply(context, userMessage);
        }
        try {
            const messages = this._buildSystemReplyPrompt(context, userMessage);
            const reply = await this.chat(messages, { temperature: 0.85, max_tokens: 400 });
            return { reply, source: 'ai' };
        } catch (err) {
            console.warn('AI 生成回复失败，回退到本地引擎：', err.message);
            return this._localGenerateReply(context, userMessage);
        }
    }

    /**
     * 生成人生总结传记
     * @param {Object} lifeData - 完整人生数据
     * @returns {Promise<{reply:string, source:string}>}
     */
    async generateSummary(lifeData) {
        if (!this.isConfigured()) {
            return this._localGenerateSummary(lifeData);
        }
        try {
            const messages = this._buildSummaryPrompt(lifeData);
            const reply = await this.chat(messages, { temperature: 0.8, max_tokens: 1000 });
            return { reply, source: 'ai' };
        } catch (err) {
            console.warn('AI 生成总结失败，回退到本地引擎：', err.message);
            return this._localGenerateSummary(lifeData);
        }
    }

    /**
     * 生成动态任务
     * @param {Object} context - 游戏上下文
     * @param {Object} task    - 任务描述
     * @returns {Promise<{reply:string, source:string}>}
     */
    async generateTaskResponse(context, task) {
        if (!this.isConfigured()) {
            return { reply: this._localGenerateTask(context, task), source: 'local' };
        }
        try {
            const messages = this._buildTaskPrompt(context, task);
            const reply = await this.chat(messages, { temperature: 0.9, max_tokens: 500 });
            return { reply, source: 'ai' };
        } catch (err) {
            console.warn('AI 生成任务失败，回退到本地引擎：', err.message);
            return { reply: this._localGenerateTask(context, task), source: 'local' };
        }
    }

    /**
     * AI 生成动态任务（含选项和效果）
     * @param {Object} context - 游戏上下文
     * @returns {Promise<{task:Object|null, source:string}>}
     */
    async generateDynamicTask(context) {
        if (!this.isConfigured()) {
            return { task: null, source: 'local' };
        }
        try {
            const { age, properties, system, talents } = context;
            const propDesc = this._formatProperties(properties);
            const systemDesc = this._formatSystemContext(system);

            const systemPrompt = [
                '你是「人生重开模拟器」的动态任务生成器。',
                `当前世界体系：${systemDesc}。`,
                '请为玩家生成一个有趣的互动任务，要贴合年龄和属性。',
                '严格按以下JSON格式输出，不要输出任何其他内容：',
                '{"title":"任务标题","description":"任务描述","choices":[{"text":"选项A","result":"选择A的结果","effect":{"属性名":数值}},{"text":"选项B","result":"选择B的结果","effect":{"属性名":数值}}]}',
                '属性名只能是：CHR/INT/STR/MNY/SPR，数值为整数（正负均可，绝对值1-3）。',
                '选项必须2-4个。任务要有趣味性和抉择感。',
            ].join('\n');

            const userPrompt = [
                `玩家年龄：${age ?? 0} 岁`,
                propDesc,
                talents?.length ? `天赋：${talents.join('、')}` : '',
                '请生成一个动态任务。',
            ].filter(Boolean).join('\n');

            const reply = await this.chat(
                [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                { temperature: 0.95, max_tokens: 500 }
            );

            const task = this._parseTaskJSON(reply);
            if (task) {
                return { task, source: 'ai' };
            }
            return { task: null, source: 'ai' };
        } catch (err) {
            console.warn('AI 生成动态任务失败：', err.message);
            return { task: null, source: 'local' };
        }
    }

    /**
     * AI 生成NPC角色遭遇
     * @param {Object} context - 游戏上下文
     * @returns {Promise<{npc:Object|null, event:string, source:string}>}
     */
    async generateNPCEncounter(context) {
        if (!this.isConfigured()) {
            return this._localGenerateNPC(context);
        }
        try {
            const { age, properties, system } = context;
            const propDesc = this._formatProperties(properties);
            const systemDesc = this._formatSystemContext(system);

            const systemPrompt = [
                '你是「人生重开模拟器」的NPC生成器。',
                `当前世界体系：${systemDesc}。`,
                '请为玩家生成一次NPC遭遇事件。',
                '严格按以下JSON格式输出，不要输出任何其他内容：',
                '{"name":"NPC名字","relation":"关系类型","event":"遭遇描述（50字以内）","attitude":好感度数值(-100到100),"item":null或{"name":"物品名","description":"物品描述","rarity":"common/rare/epic"}}',
                '关系类型可以是：朋友/对手/恩师/恋人/同事/邻居/陌生人等。',
                'NPC名字要有代入感，遭遇要贴合年龄和世界体系。',
            ].join('\n');

            const userPrompt = [
                `玩家年龄：${age ?? 0} 岁`,
                propDesc,
                '请生成一次NPC遭遇。',
            ].filter(Boolean).join('\n');

            const reply = await this.chat(
                [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                { temperature: 0.95, max_tokens: 300 }
            );

            const parsed = this._parseJSONFromReply(reply);
            if (parsed && parsed.name && parsed.event) {
                return {
                    npc: {
                        name: parsed.name,
                        relation: parsed.relation || '相识',
                        attitude: typeof parsed.attitude === 'number' ? parsed.attitude : 10,
                    },
                    event: parsed.event,
                    item: parsed.item || null,
                    source: 'ai',
                };
            }
            return this._localGenerateNPC(context);
        } catch (err) {
            console.warn('AI 生成NPC遭遇失败：', err.message);
            return this._localGenerateNPC(context);
        }
    }

    /**
     * AI 生成随机物品
     * @param {Object} context - 游戏上下文
     * @returns {Promise<{item:Object|null, event:string, source:string}>}
     */
    async generateRandomItem(context) {
        if (!this.isConfigured()) {
            return this._localGenerateItem(context);
        }
        try {
            const { age, properties, system } = context;
            const propDesc = this._formatProperties(properties);
            const systemDesc = this._formatSystemContext(system);

            const systemPrompt = [
                '你是「人生重开模拟器」的物品生成器。',
                `当前世界体系：${systemDesc}。`,
                '请为玩家生成一个获得物品的事件。',
                '严格按以下JSON格式输出，不要输出任何其他内容：',
                '{"name":"物品名称","description":"物品描述（30字以内）","rarity":"common/rare/epic/legendary","event":"获得物品的事件描述（50字以内）","effect":null或{"属性名":数值}}',
                '物品要贴合年龄和世界体系，有趣且有想象力。',
            ].join('\n');

            const userPrompt = [
                `玩家年龄：${age ?? 0} 岁`,
                propDesc,
                '请生成一个物品获得事件。',
            ].filter(Boolean).join('\n');

            const reply = await this.chat(
                [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                { temperature: 0.95, max_tokens: 250 }
            );

            const parsed = this._parseJSONFromReply(reply);
            if (parsed && parsed.name && parsed.event) {
                return {
                    item: {
                        name: parsed.name,
                        description: parsed.description || '',
                        rarity: parsed.rarity || 'common',
                    },
                    event: parsed.event,
                    effect: parsed.effect || null,
                    source: 'ai',
                };
            }
            return this._localGenerateItem(context);
        } catch (err) {
            console.warn('AI 生成物品事件失败：', err.message);
            return this._localGenerateItem(context);
        }
    }

    /**
     * 清除已保存的配置与密钥
     */
    clearConfig() {
        this.provider = 'minimax';
        this.apiKey = '';
        this.baseUrl = PROVIDERS.minimax.baseUrl;
        this.model = PROVIDERS.minimax.defaultModel;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (_) {
            // 忽略存储不可用的情况
        }
    }

    // --------------------------------------------------------
    // API 调用实现
    // --------------------------------------------------------

    /**
     * 调用 OpenAI 兼容接口（OpenAI / MiniMax / DeepSeek / GLM / 自定义）
     */
    async _callOpenAICompatible(messages, { temperature, maxTokens }) {
        const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const body = {
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false
        };

        const data = await this._fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!data.choices || !data.choices[0]) {
            throw new Error('API 返回格式异常：缺少 choices 字段。');
        }
        return data.choices[0].message?.content?.trim() || '';
    }

    /**
     * 调用 Google Gemini 接口
     */
    async _callGemini(messages, { temperature, maxTokens }) {
        const baseUrl = this.baseUrl.replace(/\/+$/, '');
        const url = `${baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

        // 将标准消息格式转换为 Gemini 格式
        const contents = this._convertToGeminiFormat(messages);

        const body = {
            contents,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens
            }
        };

        const data = await this._fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!data.candidates || !data.candidates[0]) {
            throw new Error('Gemini API 返回格式异常：缺少 candidates 字段。');
        }
        const parts = data.candidates[0].content?.parts;
        if (!parts || !parts[0]) {
            throw new Error('Gemini API 返回格式异常：缺少 content.parts 字段。');
        }
        return parts[0].text?.trim() || '';
    }

    /**
     * 将标准消息格式转换为 Gemini 格式
     */
    _convertToGeminiFormat(messages) {
        const contents = [];
        let systemText = '';

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemText += msg.content + '\n';
                continue;
            }
            const role = msg.role === 'assistant' ? 'model' : 'user';
            const text = msg.role === 'user' && systemText
                ? systemText + '\n' + msg.content
                : msg.content;

            if (msg.role === 'user' && systemText) {
                systemText = '';
            }
            contents.push({ role, parts: [{ text }] });
        }

        // 如果只有 system 消息，包装成 user 消息
        if (contents.length === 0 && systemText) {
            contents.push({ role: 'user', parts: [{ text: systemText }] });
        }
        return contents;
    }

    /**
     * 带重试的 fetch 请求
     */
    async _fetchWithRetry(url, options, retries = MAX_RETRIES) {
        let lastError;

        for (let attempt = 0; attempt < retries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    return await response.json();
                }

                // 处理 HTTP 错误
                const errorBody = await response.text().catch(() => '');
                const statusMsg = this._getHttpErrorMessage(response.status, errorBody);

                // 速率限制使用更长的等待时间
                if (response.status === 429) {
                    const waitTime = BASE_RETRY_DELAY * Math.pow(2, attempt + 1);
                    console.warn(`请求频率过高，${waitTime / 1000} 秒后重试...`);
                    await this._sleep(waitTime);
                    lastError = new Error(statusMsg);
                    continue;
                }

                // 4xx 错误（非 429）不重试
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(statusMsg);
                }

                // 5xx 服务器错误进行重试
                lastError = new Error(statusMsg);
            } catch (err) {
                clearTimeout(timeoutId);

                if (err.name === 'AbortError') {
                    lastError = new Error('请求超时（30秒），请检查网络连接或稍后重试。');
                } else if (err.message && !err.message.includes('API')) {
                    // 网络错误
                    if (err instanceof TypeError && err.message.includes('fetch')) {
                        lastError = new Error('网络连接失败，请检查网络设置或 API 地址是否正确。');
                    } else {
                        lastError = err;
                    }
                } else {
                    throw err;
                }
            }

            // 指数退避等待
            if (attempt < retries - 1) {
                const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
                console.warn(`第 ${attempt + 1} 次请求失败，${delay / 1000} 秒后重试...`);
                await this._sleep(delay);
            }
        }

        throw lastError || new Error('请求失败，已达最大重试次数。');
    }

    /**
     * 根据 HTTP 状态码生成中文错误消息
     */
    _getHttpErrorMessage(status, body) {
        let detail = '';
        try {
            const parsed = JSON.parse(body);
            detail = parsed.error?.message || parsed.message || '';
        } catch (_) {
            detail = body.slice(0, 200);
        }

        const messages = {
            400: `请求参数错误（400）：${detail || '请检查模型名称和参数设置。'}`,
            401: '认证失败（401）：API 密钥无效或已过期，请检查密钥设置。',
            403: '权限不足（403）：当前密钥无权访问此模型或接口。',
            404: `接口不存在（404）：${detail || '请检查 API 地址和模型名称。'}`,
            429: '请求频率过高（429）：已超过速率限制，请稍后重试。',
            500: '服务器内部错误（500）：AI 服务暂时不可用，请稍后重试。',
            502: '网关错误（502）：AI 服务暂时不可用，请稍后重试。',
            503: '服务不可用（503）：AI 服务正在维护中，请稍后重试。'
        };

        return messages[status] || `API 请求失败（${status}）：${detail || '未知错误，请稍后重试。'}`;
    }

    // --------------------------------------------------------
    // 提示词构建
    // --------------------------------------------------------

    /**
     * 构建年度事件生成提示词
     */
    _buildYearlyEventPrompt(context) {
        const { age, properties, system, talents, recentEvents, memory } = context;
        const propDesc = this._formatProperties(properties);
        const talentDesc = talents?.length ? `天赋：${talents.join('、')}` : '';
        const recentDesc = this._formatRecentEvents(recentEvents);
        const memoryBlock = this._buildMemoryBlock(context);
        const systemDesc = this._formatSystemContext(system);

        const systemPrompt = [
            '你是「人生重开模拟器」的游戏系统，负责为玩家模拟真实而丰富的人生经历。',
            `当前体系设定：${systemDesc}。`,
            '请根据玩家当前的年龄、属性和历史经历，生成该年发生的 1 到 3 个事件。',
            '每个事件应以独立一行输出，格式为纯文本描述，生动具体，有叙事感。',
            '事件需合理反映年龄阶段特征和属性影响，前后连贯，与历史记忆保持一致。',
            '如果涉及属性变化，在事件末尾用中文括号标注，如：（颜值+1）（智力-2）。',
            '属性名称：颜值/智力/体质/家境/快乐',
            '严禁输出思考过程、分析过程、推理过程、解释、前言、标题、编号、JSON、Markdown。',
            '直接输出事件正文，一行一个事件。'
        ].join('\n');

        const userPrompt = [
            `当前年龄：${age ?? 0} 岁`,
            propDesc,
            talentDesc,
            recentDesc,
            memoryBlock,
            '请生成本年度的人生事件。'
        ].filter(Boolean).join('\n');

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
    }

    /**
     * 构建系统人格回复提示词
     */
    _buildSystemReplyPrompt(context, userMessage) {
        const { system, properties, age, personality, chatHistory } = context;
        const systemDesc = this._formatSystemContext(system);
        const personalityDesc = typeof personality === 'string'
            ? personality
            : (personality?.description || personality?.tone || personality?.name || '睿智而幽默的人生导师');
        const propDesc = this._formatProperties(properties);
        const memoryBlock = this._buildMemoryBlock(context);

        const systemPrompt = [
            `你是「人生重开模拟器」中的系统人格"${personalityDesc}"。`,
            `当前世界体系：${systemDesc}。`,
            '你需要以该人格身份回复玩家的消息，语气要符合角色设定。',
            '回复应简洁有趣，可以包含对玩家人生状态的评论、建议或吐槽。',
            '保持角色一致性，不要跳出设定。',
            '严禁展示思考过程、推理过程、分析过程或任何类似"让我想想/我的分析是"的内容。',
            '直接给出系统的最终回复。'
        ].join('\n');

        const messages = [
            { role: 'system', content: systemPrompt },
        ];

        const stateLines = [
            `玩家当前年龄：${age ?? 0} 岁`,
            propDesc,
            memoryBlock,
        ].filter(Boolean).join('\n');
        if (stateLines) {
            messages.push({ role: 'system', content: stateLines });
        }

        if (Array.isArray(chatHistory) && chatHistory.length > 0) {
            const recentHistory = chatHistory.slice(-MAX_CHAT_HISTORY_MESSAGES);
            for (const msg of recentHistory) {
                if (msg.role === 'user') {
                    messages.push({ role: 'user', content: msg.content });
                } else if (msg.role === 'system' || msg.role === 'assistant') {
                    messages.push({ role: 'assistant', content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: `宿主说：「${userMessage}」\n请以系统人格身份回复。` });

        return messages;
    }

    /**
     * 构建人生总结提示词
     */
    _buildSummaryPrompt(lifeData) {
        const { age, properties, events, talents, system, deathReason } = lifeData;
        const propDesc = this._formatProperties(properties);
        const talentDesc = talents?.length ? `天赋：${talents.join('、')}` : '';
        const eventSummary = events?.length
            ? events.slice(-20).map((e, i) => `${i}岁：${e}`).join('\n')
            : '（无事件记录）';

        const systemPrompt = [
            '你是一位文采斐然的传记作家，为「人生重开模拟器」的玩家撰写人生总结。',
            '请根据提供的人生数据，写一篇感人至深、文学性强的人生传记。',
            '传记应涵盖人生的重要阶段，有起承转合，有情感共鸣。',
            '字数控制在 300-500 字之间，使用优美的中文叙述。',
            '最后给出一句精辟的人生评语作为墓志铭。',
            '不要输出思考过程、分析说明、提纲或小标题。'
        ].join('\n');

        const userPrompt = [
            `享年：${age ?? 0} 岁`,
            `死因：${deathReason || '寿终正寝'}`,
            `世界体系：${system || '普通人生'}`,
            propDesc,
            talentDesc,
            `人生轨迹：\n${eventSummary}`,
            '请撰写人生传记和墓志铭。'
        ].filter(Boolean).join('\n');

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
    }

    /**
     * 构建动态任务提示词
     */
    _buildTaskPrompt(context, task) {
        const { age, properties, system } = context;
        const propDesc = this._formatProperties(properties);
        const taskType = task.type || '通用任务';
        const taskDesc = task.description || '';

        const systemPrompt = [
            '你是「人生重开模拟器」的任务系统，负责为玩家生成动态互动任务。',
            `当前世界体系：${this._formatSystemContext(system)}。`,
            '任务内容应贴合玩家当前的年龄和属性状态，有一定挑战性和趣味性。',
            '请生成任务描述、2-4个选项以及每个选项的可能结果。',
            '输出格式：先写任务描述，然后每行一个选项，格式为"A. 选项内容 → 结果描述"。',
            '不要输出思考过程或分析过程。'
        ].join('\n');

        const userPrompt = [
            `玩家年龄：${age ?? 0} 岁`,
            propDesc,
            `任务类型：${taskType}`,
            taskDesc ? `任务背景：${taskDesc}` : '',
            '请生成一个动态任务。'
        ].filter(Boolean).join('\n');

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
    }

    /**
     * 格式化属性描述
     */
    _formatProperties(properties) {
        if (!properties) return '';
        const labels = {
            CHR: '魅力', INT: '智力', STR: '体质',
            MNY: '家境', SPR: '快乐', LIF: '生命',
            AGE: '年龄'
        };
        const parts = [];
        for (const [key, val] of Object.entries(properties)) {
            if (val !== undefined && val !== null) {
                const label = labels[key] || key;
                parts.push(`${label}:${val}`);
            }
        }
        return parts.length ? `属性 — ${parts.join(' | ')}` : '';
    }

    /**
     * 解析 AI 返回的事件文本
     */
    _parseEventReply(reply) {
        if (!reply) return [];
        const cleaned = this._sanitizeAIText(reply);
        return cleaned
            .split('\n')
            .map(line => line.trim())
            .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)、]\s*/, ''))
            .filter(line => line.length > 0)
            .filter(line => !line.startsWith('#'))
            .filter(line => !/^(思考|分析|推理|reasoning|analysis)[:：]/i.test(line));
    }

    // --------------------------------------------------------
    // 本地回退引擎
    // --------------------------------------------------------

    /**
     * 本地生成年度事件（无 API 密钥时使用）
     */
    _formatSystemContext(system) {
        if (!system) return '普通人生';
        if (typeof system === 'string') return system;
        const parts = [system.name, system.description, system.personality].filter(Boolean);
        return parts.length ? parts.join('｜') : '普通人生';
    }

    _formatRecentEvents(recentEvents) {
        if (!Array.isArray(recentEvents) || recentEvents.length === 0) return '';
        const lines = recentEvents.slice(-5).map(item => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            const age = item.age !== undefined ? `${item.age}岁` : '';
            const events = Array.isArray(item.events) ? item.events.join('；') : (item.text || item.content || '');
            return [age, events].filter(Boolean).join('：');
        }).filter(Boolean);
        return lines.length ? `近期事件：\n${lines.join('\n')}` : '';
    }

    _sanitizeAIText(text) {
        if (!text) return '';
        let cleaned = String(text);
        cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
        cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
        cleaned = cleaned.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
        cleaned = cleaned.replace(/^(思考过程|推理过程|分析过程|Reasoning|Analysis)[:：][\s\S]*?(?=\n\n|最终|答复|回复|事件|$)/gim, '');
        cleaned = cleaned.replace(/^(最终回答|最终回复|答复|回复)[:：]\s*/gim, '');
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        return cleaned.trim();
    }

    /**
     * Build a compact memory block for AI prompts
     */
    _buildMemoryBlock(context) {
        const { memory, age } = context;
        if (!memory) return '';

        if (typeof memory === 'string') {
            return memory ? `记忆档案：${memory}` : '';
        }

        if (typeof memory.buildContextSummary === 'function') {
            const summary = memory.buildContextSummary(age);
            return summary ? `记忆档案：\n${summary}` : '';
        }

        return '';
    }

    /**
     * Estimate token count (rough: 1 token ≈ 1.5 Chinese chars)
     */
    _estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 1.5);
    }

    _localGenerateEvent(context) {
        const { age = 0, properties = {}, system, talents = [] } = context;
        const events = [];
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // 基于年龄段的基础事件库
        const ageEvents = this._getAgeStageEvents(age);
        events.push(pick(ageEvents));

        // 基于属性的额外事件
        const propEvent = this._getPropertyEvent(age, properties);
        if (propEvent) events.push(propEvent);

        // 基于世界体系的特殊事件
        const systemEvent = this._getSystemEvent(age, system, properties);
        if (systemEvent) events.push(systemEvent);

        // 基于天赋的事件
        if (talents.length > 0 && Math.random() < 0.3) {
            const talentEvent = this._getTalentEvent(age, talents);
            if (talentEvent) events.push(talentEvent);
        }

        const reply = events.join('\n');
        return { reply, events, source: 'local' };
    }

    /**
     * 获取年龄段基础事件
     */
    _getAgeStageEvents(age) {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        if (age <= 5) {
            return [
                '你开始牙牙学语，妈妈高兴得合不拢嘴。',
                '你学会了走路，虽然经常摔倒，但每次都爬起来继续走。',
                '你在幼儿园交到了第一个好朋友。',
                '你特别爱哭，邻居们都认识了你的嗓门。',
                '你对家里的小猫产生了浓厚兴趣，天天追着它跑。',
                '你第一次叫出了"爸爸"，全家人都激动不已。',
                '你把家里的花瓶打碎了，但眨着无辜的大眼睛没被骂。',
                '你开始对绘本产生兴趣，每晚缠着父母讲故事。'
            ];
        }
        if (age <= 11) {
            return [
                '你进入了小学，对新环境既兴奋又紧张。',
                '你在班级里被选为小组长，感觉自己很了不起。',
                '期末考试你考了全班第一，父母奖励了你一套新文具。',
                '你和同学因为一块橡皮吵了一架，放学后又和好了。',
                '暑假你参加了夏令营，学会了游泳。',
                '你在学校运动会上参加了接力赛，虽然掉了棒但大家都安慰你。',
                '你开始学习一门乐器，虽然练习很枯燥但还是坚持了下来。',
                '你养了一只小仓鼠，每天放学第一件事就是去看它。'
            ];
        }
        if (age <= 14) {
            return [
                '你升入了初中，课程突然变难了许多。',
                '你开始注意自己的外表，偷偷照了好几次镜子。',
                '月考成绩不理想，你暗暗下定决心要努力。',
                '你在学校社团中找到了志同道合的伙伴。',
                '你和父母因为成绩的事吵了一架。',
                '你暗暗喜欢上了隔壁班的一个同学。',
                '你开始沉迷网络，成绩有所下滑，被老师找了家长。',
                '一次校际比赛中你获得了奖项，信心大增。'
            ];
        }
        if (age <= 17) {
            return [
                '高中生活紧张而充实，你开始为高考做准备。',
                '你参加了学校的社团活动，结识了很多新朋友。',
                '模拟考试你发挥失常，但老师鼓励你不要灰心。',
                '你和好朋友深夜聊天，谈论着对未来的憧憬。',
                '你在一次文艺汇演中上台表演，获得了热烈掌声。',
                '高考临近，压力让你有些喘不过气。',
                '你收到了一封匿名信，心跳加速了一整天。',
                '暑假打了第一份工，体会到了赚钱的不易。'
            ];
        }
        if (age <= 22) {
            return [
                '你进入了大学/开始工作，人生翻开了新的篇章。',
                '你在新环境中逐渐找到了自己的节奏。',
                '你参加了实习，第一次体验职场生活。',
                '你和室友成为了无话不谈的好朋友。',
                '你开始思考人生的方向，感到既期待又迷茫。',
                '你谈了一场恋爱，心中充满了甜蜜。',
                '一次考试挂科让你痛定思痛，开始认真学习。',
                '你利用课余时间学习了一项新技能，收获颇丰。'
            ];
        }
        if (age <= 30) {
            return [
                '你在事业上取得了一定成绩，开始崭露头角。',
                '你经历了一次重要的职业选择，最终做出了决定。',
                '你开始考虑成家立业的问题。',
                '工作压力让你一度想要放弃，但最终坚持了下来。',
                '你在行业中积累了不少经验和人脉。',
                '一次意外的机遇改变了你的职业轨迹。',
                '你搬进了自己的新家，感慨万千。',
                '你开始关注健康，养成了运动的习惯。'
            ];
        }
        if (age <= 50) {
            return [
                '你的事业进入了稳定期，开始追求生活品质。',
                '孩子的成长让你感受到了为人父母的喜悦与责任。',
                '你在一次体检中发现了一些小问题，开始更加注重养生。',
                '工作上遇到了瓶颈，你考虑是否要转型。',
                '你和老朋友重逢，感慨岁月如梭。',
                '一次家庭旅行让你暂时忘却了烦恼。',
                '你开始培养新的兴趣爱好，生活变得丰富多彩。',
                '你在社区中成了热心人，邻居们都很喜欢你。'
            ];
        }
        return [
            '退休后的生活平静而充实，你每天在公园散步。',
            '你开始整理一生的回忆，翻看旧照片时不禁感慨。',
            '孙辈们的到来让你的生活充满了欢笑。',
            '你学会了使用智能手机，和老朋友视频聊天。',
            '一场小病让你住了几天院，但很快就康复了。',
            '你在老年大学报了书法班，找到了新的乐趣。',
            '你和老伴一起去旅行，弥补了年轻时的遗憾。',
            '邻居家的小朋友很喜欢听你讲过去的故事。'
        ];
    }

    /**
     * 基于属性生成额外事件
     */
    _getPropertyEvent(age, properties) {
        const { CHR = 5, INT = 5, STR = 5, MNY = 5, SPR = 5 } = properties;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // 高魅力触发社交/感情事件
        if (CHR >= 8 && Math.random() < 0.4) {
            const events = [
                '你的出色外表和谈吐让你在社交场合备受欢迎。',
                '有人对你一见钟情，向你表白了。',
                '你被邀请参加一个高端聚会，结识了不少有趣的人。',
                '你的个人魅力为你赢得了一个意想不到的机会。'
            ];
            return pick(events);
        }

        // 高智力触发学术/技术事件
        if (INT >= 8 && Math.random() < 0.4) {
            const events = [
                '你的聪明才智在工作中得到了充分发挥。',
                '你提出了一个巧妙的解决方案，获得了领导赏识。',
                '你在一次竞赛中凭借过人的智慧脱颖而出。',
                '你发表了一篇有影响力的文章/论文。'
            ];
            return pick(events);
        }

        // 高体质触发运动/健康事件
        if (STR >= 8 && Math.random() < 0.4) {
            const events = [
                '你强健的体魄让你在体育活动中表现出色。',
                '你参加了马拉松并成功完赛，感到无比自豪。',
                '你的好身体让你精力充沛，做什么都干劲十足。',
                '你在一次户外探险中展现了惊人的体能。'
            ];
            return pick(events);
        }

        // 高家境触发财富事件
        if (MNY >= 8 && Math.random() < 0.35) {
            const events = [
                '优越的家庭条件为你提供了更好的发展平台。',
                '你利用家族的资源成功投资了一个项目。',
                '你参加了一次高端培训，视野得到了极大拓展。',
                '你慷慨地帮助了一位遇到困难的朋友。'
            ];
            return pick(events);
        }

        // 低快乐触发负面事件
        if (SPR <= 2 && Math.random() < 0.5) {
            const events = [
                '你感到莫名的低落，整个人提不起精神。',
                '失眠困扰着你，你在深夜里辗转反侧。',
                '你感觉自己被全世界遗忘了，内心十分孤独。',
                '生活的压力让你有些喘不过气来。'
            ];
            return pick(events);
        }

        // 低体质触发健康问题
        if (STR <= 2 && Math.random() < 0.4) {
            const events = [
                '你的身体亮起了红灯，不得不去医院检查。',
                '一场感冒让你卧床了好几天。',
                '体检报告上的几项异常让你有些担忧。',
                '你开始尝试改善作息，但总是坚持不下来。'
            ];
            return pick(events);
        }

        return null;
    }

    /**
     * 基于世界体系生成特殊事件
     */
    _getSystemEvent(age, system, properties) {
        if (!system || Math.random() > 0.35) return null;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const sysLower = system.toLowerCase();

        // 修仙体系
        if (sysLower.includes('修仙') || sysLower.includes('仙') || sysLower.includes('cultivation')) {
            const events = [
                '你在修炼中感悟到一丝天地法则，修为有所精进。（体质+1）',
                '一位神秘前辈路过，给了你一枚筑基丹。',
                '你在秘境中遭遇了一只妖兽，险些丧命。',
                '山门大比即将开始，你加紧了修炼。',
                '你成功突破了一个小境界，实力更上一层楼。（体质+2）',
                '你在藏经阁中发现了一本残缺的功法秘籍。'
            ];
            return pick(events);
        }

        // 大亨/商业体系
        if (sysLower.includes('大亨') || sysLower.includes('商') || sysLower.includes('tycoon') || sysLower.includes('business')) {
            const events = [
                '你的公司获得了一笔重要投资，业务迅速扩张。（家境+2）',
                '市场行情波动，你的资产缩水了不少。（家境-1）',
                '你发现了一个新的商业机会，果断出手。',
                '竞争对手发起了价格战，你不得不调整策略。',
                '你的品牌知名度大幅提升，客户蜂拥而至。（家境+1）',
                '一次商业谈判中，你展现了出色的谈判技巧。'
            ];
            return pick(events);
        }

        // 娱乐/明星体系
        if (sysLower.includes('娱乐') || sysLower.includes('明星') || sysLower.includes('entertainment')) {
            const events = [
                '你参加了一个选秀节目，获得了不少曝光。（魅力+1）',
                '一段绯闻让你上了热搜，粉丝议论纷纷。',
                '你的新作品获得了好评，事业迎来了转机。',
                '经纪公司给你安排了一个重要的商业活动。',
                '你在颁奖典礼上获得了一个奖项，激动不已。（魅力+2）',
                '网上出现了一些负面评论，让你心情低落。（快乐-1）'
            ];
            return pick(events);
        }

        // 学术体系
        if (sysLower.includes('学术') || sysLower.includes('科研') || sysLower.includes('academic')) {
            const events = [
                '你的论文被顶级期刊录用，在学界引起了关注。（智力+1）',
                '实验室的项目取得了突破性进展。',
                '你获得了一笔科研基金的资助。（家境+1）',
                '学术会议上你的演讲获得了同行的认可。',
                '一个实验失败了，你不得不重新调整研究方向。',
                '你开始指导研究生，体验到了教学相长的乐趣。'
            ];
            return pick(events);
        }

        return null;
    }

    /**
     * 基于天赋生成事件
     */
    _getTalentEvent(age, talents) {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const talent = pick(talents);

        const templates = [
            `你的天赋「${talent}」在关键时刻发挥了作用，帮你化险为夷。`,
            `因为「${talent}」的天赋加持，你在一次重要场合中表现出色。`,
            `你的「${talent}」天赋引起了某位贵人的注意。`,
            `「${talent}」的天赋让你比同龄人多了一些独特的体验。`
        ];
        return pick(templates);
    }

    /**
     * 本地生成系统人格回复
     */
    _localGenerateReply(context, userMessage) {
        const { system, personality } = context;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // 基础回复模板
        const generalReplies = [
            '嗯，有意思的想法。继续你的人生旅途吧。',
            '人生就像一盒巧克力，你永远不知道下一颗是什么味道。',
            '别太纠结了，走一步看一步嘛。',
            '你的人生还长着呢，慢慢来。',
            '这就是命运的安排，接受它吧。',
            '有些事情急不来，耐心等待机会。',
            '哈，你的人生剧本还真是精彩呢。',
            '保持这个状态，你会有好运的。'
        ];

        // 关键词匹配回复
        const msg = userMessage || '';
        if (msg.includes('帮助') || msg.includes('怎么办')) {
            return {
                reply: pick([
                    '遇到困难是人生常态，关键是不要放弃。',
                    '我能做的就是陪你走过这段路，加油！',
                    '试着从不同角度看问题，也许会有新的发现。'
                ]),
                source: 'local'
            };
        }
        if (msg.includes('开心') || msg.includes('高兴') || msg.includes('快乐')) {
            return {
                reply: pick([
                    '看到你这么开心我也很高兴！继续保持吧。',
                    '快乐是人生最好的调味品，好好珍惜这份心情。',
                    '开心就好，人生苦短，及时行乐。'
                ]),
                source: 'local'
            };
        }
        if (msg.includes('难过') || msg.includes('伤心') || msg.includes('痛苦')) {
            return {
                reply: pick([
                    '别灰心，风雨之后总会见到彩虹的。',
                    '我理解你的感受，但请相信一切都会好起来的。',
                    '人生有起有落，低谷过后就是上坡路。'
                ]),
                source: 'local'
            };
        }

        return { reply: pick(generalReplies), source: 'local' };
    }

    /**
     * 本地生成人生总结
     */
    _localGenerateSummary(lifeData) {
        const { age = 0, properties = {}, events = [], deathReason, system } = lifeData;
        const { CHR = 5, INT = 5, STR = 5, MNY = 5, SPR = 5 } = properties;

        // 评价等级
        const totalScore = CHR + INT + STR + MNY + SPR;
        let grade, gradeDesc;
        if (totalScore >= 40) { grade = 'SSS'; gradeDesc = '传奇一生'; }
        else if (totalScore >= 35) { grade = 'SS'; gradeDesc = '辉煌人生'; }
        else if (totalScore >= 28) { grade = 'S'; gradeDesc = '精彩人生'; }
        else if (totalScore >= 20) { grade = 'A'; gradeDesc = '充实人生'; }
        else if (totalScore >= 15) { grade = 'B'; gradeDesc = '平凡人生'; }
        else if (totalScore >= 10) { grade = 'C'; gradeDesc = '坎坷人生'; }
        else { grade = 'D'; gradeDesc = '艰难人生'; }

        // 属性亮点
        const highlights = [];
        if (CHR >= 8) highlights.push('以出众的魅力赢得了众人的喜爱');
        if (INT >= 8) highlights.push('凭借过人的智慧在学业和事业上取得了优异成绩');
        if (STR >= 8) highlights.push('拥有强健的体魄，一生鲜少疾病');
        if (MNY >= 8) highlights.push('家境优渥，物质生活十分富足');
        if (SPR >= 8) highlights.push('始终保持着乐观积极的心态');
        if (CHR <= 2) highlights.push('在社交方面遇到了不少困难');
        if (INT <= 2) highlights.push('学业之路走得格外艰辛');
        if (STR <= 2) highlights.push('体弱多病，健康问题始终困扰着ta');
        if (MNY <= 2) highlights.push('生活拮据，经济压力很大');
        if (SPR <= 2) highlights.push('内心时常感到不快乐');

        const highlightText = highlights.length
            ? highlights.join('；') + '。'
            : '各方面表现都比较均衡。';

        // 重要事件摘要
        const keyEvents = events.slice(-5);
        const eventText = keyEvents.length
            ? `生命中的重要片段包括：${keyEvents.join('；')}。`
            : '';

        const deathText = deathReason ? `最终因${deathReason}离开了这个世界。` : '最终安详地离开了这个世界。';
        const systemText = system ? `在${system}的世界中，` : '';

        const biography = [
            `【${gradeDesc}】`,
            `${systemText}这是一段${age}年的人生旅程。`,
            highlightText,
            eventText,
            deathText,
            '',
            `人生评级：${grade}`,
            `墓志铭：${this._generateEpitaph(grade, properties)}`
        ].filter(s => s !== undefined).join('\n');

        return { reply: biography, source: 'local' };
    }

    /**
     * 生成墓志铭
     */
    _generateEpitaph(grade, properties) {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const epitaphs = {
            SSS: [
                '此生无憾，来世再续传奇。',
                '星辰大海，皆为足下之路。',
                '一生璀璨，照亮了无数人的道路。'
            ],
            SS: [
                '虽不完美，但足够精彩。',
                '活出了自己想要的模样。',
                '人生如诗，每一章都值得铭记。'
            ],
            S: [
                '不负韶华，不负此生。',
                '认真生活过的人生，都值得尊重。',
                '回首往事，无怨无悔。'
            ],
            A: [
                '平凡之中见不凡。',
                '脚踏实地，问心无愧。',
                '虽非波澜壮阔，却也细水长流。'
            ],
            B: [
                '平平淡淡才是真。',
                '简单的一生，简单的幸福。',
                '生而为人，已尽全力。'
            ],
            C: [
                '风雨兼程，终见彩虹。',
                '坎坷的道路，坚强的灵魂。',
                '历经磨难，方知人间值得。'
            ],
            D: [
                '命运多舛，但从未认输。',
                '下辈子，希望能过得更好。',
                '纵使生活不易，也曾努力活过。'
            ]
        };

        return pick(epitaphs[grade] || epitaphs.B);
    }

    /**
     * 本地生成动态任务
     */
    _localGenerateTask(context, task) {
        const { age = 0 } = context;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const taskType = task?.type || '';

        if (age <= 17) {
            return pick([
                '【课堂挑战】老师突然点名让你回答问题：\nA. 自信作答 → 可能答对获得表扬\nB. 坦承不会 → 诚实但可能被批评\nC. 转移话题 → 机智但风险较大',
                '【友情考验】好朋友考试想抄你的答案：\nA. 果断拒绝 → 坚守原则但可能影响友情\nB. 悄悄给看 → 帮了朋友但违反规则\nC. 考后再教 → 两全其美但需要花时间',
                '【意外发现】你在路边捡到了一个钱包：\nA. 交给警察 → 做好事但花时间\nB. 寻找失主 → 可能获得感谢\nC. 留在原地 → 避免麻烦'
            ]);
        }
        if (age <= 30) {
            return pick([
                '【职场抉择】领导让你接手一个困难的项目：\nA. 欣然接受 → 挑战自我，可能获得晋升机会\nB. 委婉推辞 → 保持现状但可能错失良机\nC. 提出条件 → 争取更多资源但可能得罪领导\nD. 组建团队 → 分担风险但需要领导力',
                '【感情抉择】有人向你表白了：\nA. 接受告白 → 开始一段新恋情\nB. 婉言谢绝 → 保持现状\nC. 给个机会 → 先相处看看',
                '【投资机会】朋友推荐了一个投资项目：\nA. 大胆投入 → 高风险高回报\nB. 少量试水 → 稳健策略\nC. 谨慎观望 → 安全但可能错失机会'
            ]);
        }
        return pick([
            '【人生选择】你有一个出国旅行的机会：\nA. 说走就走 → 开阔眼界但花费不菲\nB. 精心计划 → 准备充分但可能拖延\nC. 留在家中 → 省钱省心但少了体验',
            '【健康管理】体检报告提示你需要注意身体：\nA. 立即改变生活方式 → 积极但需要毅力\nB. 定期复查 → 关注但不过度紧张\nC. 顺其自然 → 潇洒但有风险',
            '【家庭决策】家人需要你做一个重要决定：\nA. 承担责任 → 家人信赖但压力增大\nB. 共同商议 → 民主但可能意见不合\nC. 请教长辈 → 借鉴经验但可能观念不同'
        ]);
    }

    // --------------------------------------------------------
    // JSON 解析辅助
    // --------------------------------------------------------

    /**
     * 从 AI 回复中提取 JSON 对象
     */
    _parseJSONFromReply(reply) {
        if (!reply) return null;
        try {
            // 先尝试直接解析
            return JSON.parse(reply.trim());
        } catch (_) {
            // 尝试从文本中提取 JSON 块
            const jsonMatch = reply.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (_e) {
                    return null;
                }
            }
            return null;
        }
    }

    /**
     * 解析 AI 返回的任务 JSON
     */
    _parseTaskJSON(reply) {
        const parsed = this._parseJSONFromReply(reply);
        if (!parsed || !parsed.description || !Array.isArray(parsed.choices)) return null;
        // 标准化 choices 中的 effect 属性
        const validProps = new Set(['CHR', 'INT', 'STR', 'MNY', 'SPR']);
        for (const choice of parsed.choices) {
            if (choice.effect && typeof choice.effect === 'object') {
                const cleaned = {};
                for (const [k, v] of Object.entries(choice.effect)) {
                    if (validProps.has(k) && typeof v === 'number') {
                        cleaned[k] = Math.max(-3, Math.min(3, Math.round(v)));
                    }
                }
                choice.effect = Object.keys(cleaned).length > 0 ? cleaned : { SPR: 1 };
            } else {
                choice.effect = { SPR: 1 };
            }
            if (!choice.result) choice.result = choice.text;
        }
        return parsed;
    }

    /**
     * 本地 NPC 遭遇生成（AI 不可用时的兜底）
     */
    _localGenerateNPC(context) {
        const { age = 0 } = context;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const npcPools = {
            child: [
                { name: '小明', relation: '同学', event: '你在学校认识了一个新朋友，你们很快成为了好伙伴。', attitude: 20 },
                { name: '王老师', relation: '恩师', event: '班主任王老师对你格外关注，鼓励你好好学习。', attitude: 30 },
                { name: '邻居奶奶', relation: '邻居', event: '隔壁的奶奶经常给你带好吃的，你很喜欢她。', attitude: 25 },
            ],
            teen: [
                { name: '陈思涵', relation: '同学', event: '你在社团活动中结识了陈思涵，你们志趣相投。', attitude: 25 },
                { name: '刘教练', relation: '恩师', event: '体育老师发现了你的潜力，开始特别培养你。', attitude: 20 },
                { name: '赵小曼', relation: '朋友', event: '你和赵小曼因为一次合作项目成为了好朋友。', attitude: 30 },
            ],
            adult: [
                { name: '张伟', relation: '同事', event: '新来的同事张伟和你分在了同一个项目组。', attitude: 15 },
                { name: '李经理', relation: '上司', event: '李经理对你的工作能力很认可，开始给你更多机会。', attitude: 20 },
                { name: '林小雨', relation: '朋友', event: '你在一次聚会上认识了林小雨，聊得很投机。', attitude: 25 },
                { name: '老王', relation: '邻居', event: '你的新邻居老王是个热心人，经常帮你的忙。', attitude: 15 },
            ],
            senior: [
                { name: '老李', relation: '朋友', event: '公园里认识的老李和你成了棋友，每天约着下棋。', attitude: 25 },
                { name: '小孙女', relation: '家人', event: '小孙女的到来给你的生活增添了无穷的乐趣。', attitude: 40 },
                { name: '社区张主任', relation: '朋友', event: '你参加社区活动时认识了热心的张主任。', attitude: 20 },
            ],
        };

        let pool;
        if (age <= 11) pool = npcPools.child;
        else if (age <= 17) pool = npcPools.teen;
        else if (age <= 55) pool = npcPools.adult;
        else pool = npcPools.senior;

        const chosen = pick(pool);
        return {
            npc: { name: chosen.name, relation: chosen.relation, attitude: chosen.attitude },
            event: chosen.event,
            item: null,
            source: 'local',
        };
    }

    /**
     * 本地物品生成（AI 不可用时的兜底）
     */
    _localGenerateItem(context) {
        const { age = 0, system } = context;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const sysName = typeof system === 'string' ? system : (system?.name || '');

        const itemPools = {
            child: [
                { name: '幸运弹珠', description: '一颗闪亮的玻璃弹珠', rarity: 'common', event: '你在操场上捡到了一颗漂亮的弹珠，决定留作纪念。' },
                { name: '故事书', description: '一本精彩的冒险故事', rarity: 'common', event: '爸妈送了你一本故事书，你爱不释手。' },
                { name: '小金鱼', description: '一条活泼的金鱼', rarity: 'common', event: '你在庙会上赢了一条小金鱼带回了家。' },
            ],
            teen: [
                { name: '日记本', description: '记录青春秘密的精致日记本', rarity: 'common', event: '你开始用日记本记录自己的心情和想法。' },
                { name: '吉他', description: '一把二手的木吉他', rarity: 'rare', event: '你用攒了很久的零花钱买了一把吉他。' },
                { name: '友谊手链', description: '好朋友亲手编织的手链', rarity: 'rare', event: '好朋友在你生日时送了你一条手工手链。' },
            ],
            adult: [
                { name: '商务名片夹', description: '高档皮质名片夹', rarity: 'common', event: '你在职场社交中获得了一个精致的名片夹。' },
                { name: '投资合同', description: '一份有潜力的投资协议', rarity: 'rare', event: '你签下了人生中第一份重要的投资合同。' },
                { name: '老照片', description: '一张泛黄的全家福', rarity: 'rare', event: '整理旧物时你发现了一张珍贵的全家福。' },
                { name: '神秘钥匙', description: '不知道能打开什么的古老钥匙', rarity: 'epic', event: '你在老房子的地下室发现了一把神秘的钥匙。' },
            ],
            senior: [
                { name: '传家宝', description: '世代相传的家族信物', rarity: 'epic', event: '长辈将家族传家宝郑重地交到了你手上。' },
                { name: '老花镜', description: '一副舒适的老花镜', rarity: 'common', event: '你终于配了一副合适的老花镜，看报纸清楚多了。' },
                { name: '人生相册', description: '精心整理的人生影集', rarity: 'rare', event: '你把一辈子的照片整理成了一本精美的相册。' },
            ],
        };

        // 系统专属物品
        if (sysName.includes('修仙') || sysName.includes('仙')) {
            const cultivationItems = [
                { name: '灵石', description: '蕴含灵气的天然矿石', rarity: 'rare', event: '你在山中发现了一块散发微光的灵石。', effect: { STR: 1 } },
                { name: '古卷残篇', description: '记载功法的古旧竹简', rarity: 'epic', event: '你在藏经阁的角落发现了一卷古老的功法残篇。', effect: { INT: 1 } },
                { name: '辟谷丹', description: '可以数日不食的仙丹', rarity: 'rare', event: '师兄赠你一枚辟谷丹，以备不时之需。' },
            ];
            const chosen = pick(cultivationItems);
            return { item: { name: chosen.name, description: chosen.description, rarity: chosen.rarity }, event: chosen.event, effect: chosen.effect || null, source: 'local' };
        }

        let pool;
        if (age <= 11) pool = itemPools.child;
        else if (age <= 17) pool = itemPools.teen;
        else if (age <= 55) pool = itemPools.adult;
        else pool = itemPools.senior;

        const chosen = pick(pool);
        return { item: { name: chosen.name, description: chosen.description, rarity: chosen.rarity }, event: chosen.event, effect: null, source: 'local' };
    }

    // --------------------------------------------------------
    // 密钥存储（简单混淆）
    // --------------------------------------------------------

    /**
     * 简单混淆编码（非加密，仅防止明文直接暴露）
     */
    _encryptKey(key) {
        if (!key) return '';
        const shifted = key.split('').map(ch => {
            return String.fromCharCode(ch.charCodeAt(0) + 3);
        }).join('');
        return btoa(shifted);
    }

    /**
     * 反混淆解码
     */
    _decryptKey(encoded) {
        if (!encoded) return '';
        try {
            const shifted = atob(encoded);
            return shifted.split('').map(ch => {
                return String.fromCharCode(ch.charCodeAt(0) - 3);
            }).join('');
        } catch (_) {
            return '';
        }
    }

    /**
     * 密钥脱敏显示
     */
    _maskKey(key) {
        if (!key) return '';
        if (key.length <= 8) return '****';
        return key.slice(0, 4) + '****' + key.slice(-4);
    }

    // --------------------------------------------------------
    // 配置持久化
    // --------------------------------------------------------

    /**
     * 从 localStorage 加载配置
     */
    _loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved.provider && PROVIDERS[saved.provider]) {
                this.provider = saved.provider;
            }
            if (saved.baseUrl) this.baseUrl = saved.baseUrl;
            if (saved.model) this.model = saved.model;
            if (saved.apiKey) {
                this.apiKey = this._decryptKey(saved.apiKey);
            }
        } catch (_) {
            // localStorage 不可用或数据损坏时忽略
        }
    }

    /**
     * 将配置保存到 localStorage
     */
    _saveConfig() {
        try {
            const data = {
                provider: this.provider,
                baseUrl: this.baseUrl,
                model: this.model,
                apiKey: this._encryptKey(this.apiKey)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (_) {
            // localStorage 不可用时忽略
        }
    }

    // --------------------------------------------------------
    // 工具方法
    // --------------------------------------------------------

    /**
     * 延迟指定毫秒
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================
// 导出
// ============================================================
export const aiService = new AIService();
export { AIService, PROVIDERS };
