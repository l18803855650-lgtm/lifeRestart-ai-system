/**
 * 分享与人生报告卡生成系统
 * 处理系统分享码、人生报告卡生成（雷达图）及分享功能
 */

function normalizeSystem(system) {
    if (!system) return { name: '默认系统', emoji: '🎮' };
    if (typeof system === 'string') return { name: system, emoji: '🎮' };
    return {
        name: system.name || '默认系统',
        emoji: system.emoji || '🎮',
    };
}

function normalizeTalentGrade(grade) {
    if (typeof grade === 'number') return Math.max(0, Math.min(4, grade));
    const mapping = { C: 0, B: 1, A: 2, S: 3, SS: 4, SSR: 4 };
    return mapping[String(grade || '').toUpperCase()] ?? 0;
}

function getTalentGradeColor(grade) {
    const numeric = normalizeTalentGrade(grade);
    const colors = {
        0: '#9ca3af',
        1: '#22c55e',
        2: '#3b82f6',
        3: '#a855f7',
        4: '#f59e0b',
    };
    return colors[numeric] || colors[0];
}

function normalizeDeathReasonText(value) {
    if (!value) return '寿终正寝';
    const known = {
        health: '因病离世',
        despair: '心力交瘁而终',
        oldAge: '寿终正寝',
        random: '意外离世',
        madness: '理智崩溃而亡',
        apocalypse: '倒在末世浩劫中',
    };
    return known[value] || value;
}

export class ShareSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    // ========== 系统分享码 ==========

    /**
     * 将自定义系统编码为分享码
     * @param {Object} system - 系统配置对象
     * @returns {string} 分享码字符串
     */
    generateSystemCode(system) {
        const minified = {
            n: system.name,
            d: system.description,
            p: system.personality,
            t: system.tone,
            th: system.theme,
            g: system.grade,
            w: system.weights,
            a: system.abilities,
            m: system.milestones,
            cs: system.customStats,
        };
        const json = JSON.stringify(minified);
        const encoded = btoa(unescape(encodeURIComponent(json)));
        return 'LR-SYS-' + encoded;
    }

    /**
     * 从分享码解码并还原系统配置
     * @param {string} code - 分享码
     * @returns {Object} 还原后的系统对象
     */
    importSystemCode(code) {
        if (!code || typeof code !== 'string') {
            throw new Error('分享码不能为空');
        }
        if (!code.startsWith('LR-SYS-')) {
            throw new Error('无效的分享码格式：缺少 LR-SYS- 前缀');
        }

        let parsed;
        try {
            const base64 = code.slice(7);
            const json = decodeURIComponent(escape(atob(base64)));
            parsed = JSON.parse(json);
        } catch (e) {
            throw new Error('分享码解码失败：数据已损坏或被篡改');
        }

        const system = {
            name: parsed.n,
            description: parsed.d,
            personality: parsed.p,
            tone: parsed.t,
            theme: parsed.th,
            grade: parsed.g,
            weights: parsed.w,
            abilities: parsed.a,
            milestones: parsed.m,
            customStats: parsed.cs,
        };

        if (!system.name || typeof system.name !== 'string') {
            throw new Error('无效的系统数据：缺少系统名称');
        }
        if (!system.description || typeof system.description !== 'string') {
            throw new Error('无效的系统数据：缺少系统描述');
        }

        return system;
    }

    /**
     * 验证分享码是否有效（不执行导入）
     * @param {string} code - 分享码
     * @returns {boolean} 是否有效
     */
    validateSystemCode(code) {
        try {
            this.importSystemCode(code);
            return true;
        } catch {
            return false;
        }
    }

    // ========== 评分与评价系统 ==========

    /**
     * 根据人生数据计算总分
     * @param {Object} lifeData - 人生数据
     * @returns {number} 总分
     */
    calculateScore(lifeData) {
        const props = lifeData.properties || {};
        const base =
            ((props.CHR || 0) +
                (props.INT || 0) +
                (props.STR || 0) +
                (props.MNY || 0) +
                (props.SPR || 0)) *
            10;

        const milestones = lifeData.milestones || [];
        const milestoneBonus = milestones.length * 5;

        const talents = lifeData.talents || [];
        const gradeValues = { 0: 4, 1: 8, 2: 12, 3: 18, 4: 24 };
        const talentBonus = talents.reduce((sum, t) => {
            return sum + (gradeValues[normalizeTalentGrade(t.grade)] || 0);
        }, 0);

        const age = lifeData.age || 0;
        const ageBonus = Math.floor(age / 10);

        const customBonus = (lifeData.customStats || []).reduce((sum, stat) => {
            const max = Math.max(1, stat.max || 100);
            const current = Math.max(0, stat.current ?? stat.initial ?? 0);
            return sum + Math.min(6, (current / max) * 6);
        }, 0);

        return Math.min(500, base + milestoneBonus + talentBonus + ageBonus + customBonus);
    }

    /**
     * 根据分数返回评价等级
     * @param {number} score - 总分
     * @returns {{ text: string, emoji: string }} 评价对象
     */
    getJudge(score) {
        if (score <= 50) return { text: '地狱难度人生', emoji: '💀' };
        if (score <= 100) return { text: '平凡的一生', emoji: '😐' };
        if (score <= 150) return { text: '还不错的人生', emoji: '😊' };
        if (score <= 200) return { text: '优秀人生', emoji: '🌟' };
        if (score <= 300) return { text: '传奇人生', emoji: '👑' };
        return { text: '天命之人', emoji: '🏆' };
    }

    // ========== 人生报告卡生成 ==========

    /**
     * 生成人生报告卡（Canvas 图像）
     * @param {Object} lifeData - 人生数据
     * @returns {HTMLCanvasElement} 绘制完成的画布
     */
    generateReportCard(lifeData) {
        const W = 375;
        const H = 667;

        this.canvas = document.createElement('canvas');
        this.canvas.width = W;
        this.canvas.height = H;
        this.ctx = this.canvas.getContext('2d');
        const ctx = this.ctx;

        const judge =
            lifeData.judge ||
            this.getJudge(lifeData.score || this.calculateScore(lifeData));

        // 1. 渐变背景
        this._drawGradientBackground(ctx, W, H, judge);

        // 2. 标题
        this._drawGlowText(ctx, '人生终章', W / 2, 48, '#ffffff', 28);

        // 3. 系统徽章
        const sys = normalizeSystem(lifeData.system);
        this._drawBadge(
            ctx,
            `${sys.emoji} ${sys.name}`,
            W / 2,
            80,
            'rgba(255,255,255,0.2)'
        );

        // 4. 基本信息
        ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        const deathReasonText = lifeData.deathReasonText || normalizeDeathReasonText(lifeData.deathReason);
        const infoText = `享年${lifeData.age || '??'}岁 | ${deathReasonText}`;
        ctx.fillText(infoText, W / 2, 110);

        // 5-6. 雷达图及属性值
        const props = lifeData.properties || {};
        const values = [
            props.CHR || 0,
            props.INT || 0,
            props.STR || 0,
            props.MNY || 0,
            props.SPR || 0,
        ];
        const labels = ['颜值', '智力', '体质', '家境', '快乐'];
        const colors = {
            fill: 'rgba(255,255,255,0.25)',
            stroke: 'rgba(255,255,255,0.8)',
            grid: 'rgba(255,255,255,0.15)',
            label: '#ffffff',
        };
        this._drawRadarChart(ctx, W / 2, 230, 80, values, labels, colors);

        // 7. 总分与评价
        const score = lifeData.score || this.calculateScore(lifeData);
        const judgeObj =
            typeof judge === 'object' ? judge : this.getJudge(score);

        ctx.textAlign = 'center';
        ctx.font =
            'bold 42px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${score}`, W / 2, 355);

        ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('最终得分', W / 2, 375);

        this._drawGlowText(
            ctx,
            `${judgeObj.emoji} ${judgeObj.text}`,
            W / 2,
            410,
            '#FFD700',
            20
        );

        // 8. 天赋徽章
        const talents = (lifeData.talents || []).slice(0, 4);
        if (talents.length > 0) {
            const badgeY = 440;
            const totalWidth = talents.length * 80;
            let startX = (W - totalWidth) / 2 + 40;
            talents.forEach((talent) => {
                const color = getTalentGradeColor(talent.grade);
                this._drawBadge(
                    ctx,
                    `${talent.name}`,
                    startX,
                    badgeY,
                    color
                );
                startX += 80;
            });
        }

        // 9. 人生亮点（前3条）
        const highlights = (lifeData.highlights || []).slice(0, 3);
        if (highlights.length > 0) {
            ctx.textAlign = 'left';
            ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            let hlY = 480;
            highlights.forEach((hl) => {
                const line = `• ${hl}`;
                this._wrapText(ctx, line, 30, hlY, W - 60, 16);
                hlY += 20;
            });
        }

        // 10. 底部信息
        const separator = '━━━━━━━━━━━━━━━━━━';
        ctx.textAlign = 'center';
        ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(separator, W / 2, H - 45);

        ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('人生重开模拟器 - AI系统版', W / 2, H - 25);

        const today = new Date();
        const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
        ctx.fillText(dateStr, W / 2, H - 10);

        return this.canvas;
    }

    /**
     * 绘制五边形雷达图
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {number} x - 中心X坐标
     * @param {number} y - 中心Y坐标
     * @param {number} radius - 半径
     * @param {number[]} values - 五项属性值（0~100范围映射）
     * @param {string[]} labels - 五项属性标签
     * @param {Object} colors - 颜色配置
     */
    _drawRadarChart(ctx, x, y, radius, values, labels, colors) {
        const sides = 5;
        const angleStep = (Math.PI * 2) / sides;
        const startAngle = -Math.PI / 2;

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 绘制网格线（25%、50%、75%、100%）
        const gridLevels = [0.25, 0.5, 0.75, 1.0];
        gridLevels.forEach((level) => {
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const angle = startAngle + angleStep * (i % sides);
                const px = x + Math.cos(angle) * radius * level;
                const py = y + Math.sin(angle) * radius * level;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // 绘制轴线
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + angleStep * i;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius
            );
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 计算归一化值（人生属性主标尺按 10，超出则自动扩容）
        const maxVal = Math.max(10, ...values.map((v) => Math.ceil(Math.max(0, v) / 5) * 5));
        const normalizedValues = values.map((v) =>
            Math.min(1, Math.max(0, v / maxVal))
        );

        // 绘制数据多边形填充
        ctx.beginPath();
        normalizedValues.forEach((val, i) => {
            const angle = startAngle + angleStep * i;
            const px = x + Math.cos(angle) * radius * val;
            const py = y + Math.sin(angle) * radius * val;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        });
        ctx.closePath();
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制顶点圆点
        normalizedValues.forEach((val, i) => {
            const angle = startAngle + angleStep * i;
            const px = x + Math.cos(angle) * radius * val;
            const py = y + Math.sin(angle) * radius * val;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = colors.stroke;
            ctx.fill();
        });

        // 绘制标签和数值
        ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        labels.forEach((label, i) => {
            const angle = startAngle + angleStep * i;
            const labelRadius = radius + 28;
            const lx = x + Math.cos(angle) * labelRadius;
            const ly = y + Math.sin(angle) * labelRadius;

            ctx.fillStyle = colors.label;
            ctx.fillText(label, lx, ly - 7);

            ctx.font =
                '11px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(String(values[i]), lx, ly + 8);

            ctx.font =
                'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
        });

        ctx.restore();
    }

    // ========== 报告卡辅助绘制方法 ==========

    /**
     * 根据评价等级绘制渐变背景
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {number} w - 宽度
     * @param {number} h - 高度
     * @param {Object|string} judge - 评价对象或文本
     */
    _drawGradientBackground(ctx, w, h, judge) {
        const judgeText = typeof judge === 'object' ? judge.text : judge;
        const colorMap = {
            地狱难度人生: ['#1a1a2e', '#16213e'],
            平凡的一生: ['#2c3e50', '#3498db'],
            还不错的人生: ['#0f3443', '#34e89e'],
            优秀人生: ['#4a00e0', '#8e2de2'],
            传奇人生: ['#f12711', '#f5af19'],
            天命之人: ['#FFD700', '#FF6B6B'],
        };
        const [c1, c2] = colorMap[judgeText] || ['#2c3e50', '#3498db'];

        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, c1);
        gradient.addColorStop(1, c2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // 装饰性光晕效果
        const radGrad = ctx.createRadialGradient(
            w / 2, h * 0.3, 0,
            w / 2, h * 0.3, w * 0.6
        );
        radGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
        radGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
    }

    /**
     * 绘制带发光效果的文字
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {string} text - 文字内容
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {string} color - 文字颜色
     * @param {number} size - 字号
     */
    _drawGlowText(ctx, text, x, y, color, size) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;

        // 发光层
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        // 清除阴影后再绘制一层（使文字更锐利）
        ctx.shadowBlur = 0;
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    /**
     * 绘制圆角矩形
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {number} x - 左上角X
     * @param {number} y - 左上角Y
     * @param {number} w - 宽度
     * @param {number} h - 高度
     * @param {number} r - 圆角半径
     * @param {string|null} fill - 填充色
     * @param {string|null} stroke - 描边色
     */
    _drawRoundedRect(ctx, x, y, w, h, r, fill, stroke) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * 绘制徽章（居中圆角标签）
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {string} text - 徽章文字
     * @param {number} x - 中心X坐标
     * @param {number} y - 中心Y坐标
     * @param {string} color - 背景色
     */
    _drawBadge(ctx, text, x, y, color) {
        ctx.save();
        ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
        const metrics = ctx.measureText(text);
        const paddingX = 12;
        const paddingY = 6;
        const bw = metrics.width + paddingX * 2;
        const bh = 24;

        this._drawRoundedRect(
            ctx,
            x - bw / 2,
            y - bh / 2,
            bw,
            bh,
            bh / 2,
            color,
            null
        );

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    /**
     * 绘制自动换行文本
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {string} text - 文本内容
     * @param {number} x - 起始X
     * @param {number} y - 起始Y
     * @param {number} maxWidth - 最大宽度
     * @param {number} lineHeight - 行高
     * @returns {number} 实际绘制的总高度
     */
    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const chars = text.split('');
        let line = '';
        let currentY = y;

        for (let i = 0; i < chars.length; i++) {
            const testLine = line + chars[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line.length > 0) {
                ctx.fillText(line, x, currentY);
                line = chars[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, x, currentY);
            currentY += lineHeight;
        }
        return currentY - y;
    }

    // ========== 分享功能 ==========

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>} 是否成功
     */
    async copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                // 降级到旧方案
            }
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            return ok;
        } catch {
            return false;
        }
    }

    /**
     * 生成可分享的纯文本摘要
     * @param {Object} lifeData - 人生数据
     * @returns {string} 分享文本
     */
    generateShareText(lifeData) {
        const props = lifeData.properties || {};
        const score = lifeData.score || this.calculateScore(lifeData);
        const judgeObj = lifeData.judge || this.getJudge(score);
        const judgeText =
            typeof judgeObj === 'object' ? judgeObj.text : judgeObj;
        const sys = normalizeSystem(lifeData.system);
        const highlights = lifeData.highlights || [];
        const customStats = lifeData.customStats || [];

        const lines = [
            '🎮 人生重开模拟器 - AI系统版',
            '━━━━━━━━━━━━━━━━',
            `📋 系统：${sys.emoji} ${sys.name}`,
            `⏰ 享年：${lifeData.age || '??'}岁`,
            `💀 死因：${lifeData.deathReasonText || normalizeDeathReasonText(lifeData.deathReason)}`,
            '━━━━━━━━━━━━━━━━',
            '📊 最终属性：',
            `😊 颜值: ${props.CHR || 0} | 🧠 智力: ${props.INT || 0}`,
            `💪 体质: ${props.STR || 0} | 💰 家境: ${props.MNY || 0}`,
            `😄 快乐: ${props.SPR || 0}`,
            '━━━━━━━━━━━━━━━━',
            `🏆 评价：${judgeText}（${score}分）`,
        ];

        if (customStats.length > 0) {
            lines.push(`✨ 系统成长：${customStats.map((stat) => `${stat.icon || '✨'}${stat.name}${stat.current ?? stat.initial ?? 0}`).join(' | ')}`);
        }

        if (highlights.length > 0) {
            lines.push(`📝 一句话：${highlights[0]}`);
        }

        lines.push('━━━━━━━━━━━━━━━━');
        lines.push('来开启你的AI人生吧！');

        return lines.join('\n');
    }

    /**
     * 生成报告卡图片并下载为 PNG
     * @param {Object} lifeData - 人生数据
     * @param {string} [filename] - 文件名
     * @returns {Promise<void>}
     */
    async downloadReportImage(lifeData, filename) {
        const canvas = this.generateReportCard(lifeData);
        const name = filename || `人生报告卡_${Date.now()}.png`;

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('图像生成失败'));
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = name;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                resolve();
            }, 'image/png');
        });
    }

    /**
     * 尝试使用 Web Share API 分享报告卡，不支持则降级为下载
     * @param {Object} lifeData - 人生数据
     * @returns {Promise<void>}
     */
    async shareReportCard(lifeData) {
        const canvas = this.generateReportCard(lifeData);
        const shareText = this.generateShareText(lifeData);

        const blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (!blob) {
            throw new Error('图像生成失败');
        }

        const imageFile = new File([blob], '人生报告卡.png', {
            type: 'image/png',
        });

        // 检测 Web Share API 及文件分享能力
        if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files: [imageFile] })
        ) {
            try {
                await navigator.share({
                    files: [imageFile],
                    text: shareText,
                });
                return;
            } catch (err) {
                // 用户取消分享不视为错误
                if (err.name === 'AbortError') return;
            }
        }

        // 降级为直接下载
        await this.downloadReportImage(lifeData);
    }
}

export const shareSystem = new ShareSystem();
export { ShareSystem as default };
