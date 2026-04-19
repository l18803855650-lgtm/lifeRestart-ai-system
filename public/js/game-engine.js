/**
 * 人生重开 AI 系统 —— 核心游戏引擎
 *
 * 管理天赋系统、属性分配、人生模拟循环，以及与 AI / 记忆 / 系统管理器的集成。
 * 本文件是整个游戏的心脏，负责驱动从出生到死亡的完整生命周期。
 */

import { aiService } from './ai-service.js';
import { memoryEngine } from './memory-engine.js';

// ═══════════════════════════════════════════════════════════════
// 常量定义
// ═══════════════════════════════════════════════════════════════

/**
 * 角色属性定义
 */
const PROPERTIES = {
    CHR: { name: '颜值', icon: '😊', color: '#ff6b9d', max: 10 },
    INT: { name: '智力', icon: '🧠', color: '#4facfe', max: 10 },
    STR: { name: '体质', icon: '💪', color: '#43e97b', max: 10 },
    MNY: { name: '家境', icon: '💰', color: '#f9d423', max: 10 },
    SPR: { name: '快乐', icon: '😄', color: '#a18cd1', max: 10 },
};

/**
 * 天赋池 —— 包含所有可抽取的天赋
 * grade: 0=白色/普通  1=绿色/优秀  2=蓝色/稀有  3=紫色/史诗  4=橙色/传说
 */
const TALENT_POOL = [
    // ── Grade 0（白色 / 普通）—— 20 个 ──
    { id: 1001, name: '平凡之路', description: '没有特殊效果', grade: 0, effect: {} },
    { id: 1002, name: '健康体质', description: '体质+1', grade: 0, effect: { STR: 1 } },
    { id: 1003, name: '聪明伶俐', description: '智力+1', grade: 0, effect: { INT: 1 } },
    { id: 1004, name: '眉清目秀', description: '颜值+1', grade: 0, effect: { CHR: 1 } },
    { id: 1005, name: '小康之家', description: '家境+1', grade: 0, effect: { MNY: 1 } },
    { id: 1006, name: '乐观开朗', description: '快乐+2', grade: 0, effect: { SPR: 2 } },
    { id: 1007, name: '身体棒棒', description: '体质+2', grade: 0, effect: { STR: 2 } },
    { id: 1008, name: '书香门第', description: '智力+1, 家境+1', grade: 0, effect: { INT: 1, MNY: 1 } },
    { id: 1009, name: '五官端正', description: '颜值+2', grade: 0, effect: { CHR: 2 } },
    { id: 1010, name: '心宽体胖', description: '快乐+1, 体质+1', grade: 0, effect: { SPR: 1, STR: 1 } },
    { id: 1011, name: '安分守己', description: '快乐+1', grade: 0, effect: { SPR: 1 } },
    { id: 1012, name: '吃苦耐劳', description: '体质+1, 智力+1', grade: 0, effect: { STR: 1, INT: 1 } },
    { id: 1013, name: '邻家孩子', description: '颜值+1, 快乐+1', grade: 0, effect: { CHR: 1, SPR: 1 } },
    { id: 1014, name: '勤俭持家', description: '家境+2', grade: 0, effect: { MNY: 2 } },
    { id: 1015, name: '早睡早起', description: '体质+1, 快乐+1', grade: 0, effect: { STR: 1, SPR: 1 } },
    { id: 1016, name: '好奇心强', description: '智力+2', grade: 0, effect: { INT: 2 } },
    { id: 1017, name: '开朗外向', description: '颜值+1, 快乐+1', grade: 0, effect: { CHR: 1, SPR: 1 } },
    { id: 1018, name: '手工达人', description: '智力+1, 体质+1', grade: 0, effect: { INT: 1, STR: 1 } },
    { id: 1019, name: '小小画家', description: '颜值+1, 智力+1', grade: 0, effect: { CHR: 1, INT: 1 } },
    { id: 1020, name: '童年无忧', description: '快乐+2', grade: 0, effect: { SPR: 2 } },

    // ── Grade 1（绿色 / 优秀）—— 15 个 ──
    { id: 1101, name: '过目不忘', description: '智力+3', grade: 1, effect: { INT: 3 } },
    { id: 1102, name: '天生丽质', description: '颜值+3', grade: 1, effect: { CHR: 3 } },
    { id: 1103, name: '铁骨铮铮', description: '体质+3', grade: 1, effect: { STR: 3 } },
    { id: 1104, name: '富贵人家', description: '家境+3', grade: 1, effect: { MNY: 3 } },
    { id: 1105, name: '万人迷', description: '颜值+2, 快乐+2', grade: 1, effect: { CHR: 2, SPR: 2 } },
    { id: 1106, name: '学霸基因', description: '智力+2, 快乐+1', grade: 1, effect: { INT: 2, SPR: 1 } },
    { id: 1107, name: '运动天赋', description: '体质+2, 颜值+1', grade: 1, effect: { STR: 2, CHR: 1 } },
    { id: 1108, name: '投胎高手', description: '家境+2, 快乐+1', grade: 1, effect: { MNY: 2, SPR: 1 } },
    { id: 1109, name: '社交达人', description: '颜值+1, 智力+1, 快乐+1', grade: 1, effect: { CHR: 1, INT: 1, SPR: 1 } },
    { id: 1110, name: '坚韧不拔', description: '体质+2, 智力+1', grade: 1, effect: { STR: 2, INT: 1 } },
    { id: 1111, name: '财商过人', description: '家境+2, 智力+1', grade: 1, effect: { MNY: 2, INT: 1 } },
    { id: 1112, name: '元气满满', description: '体质+1, 快乐+3', grade: 1, effect: { STR: 1, SPR: 3 } },
    { id: 1113, name: '人见人爱', description: '颜值+2, 家境+1', grade: 1, effect: { CHR: 2, MNY: 1 } },
    { id: 1114, name: '钢铁意志', description: '体质+1, 智力+2', grade: 1, effect: { STR: 1, INT: 2 } },
    { id: 1115, name: '心态稳定', description: '快乐+3, 智力+1', grade: 1, effect: { SPR: 3, INT: 1 } },

    // ── Grade 2（蓝色 / 稀有）—— 10 个 ──
    { id: 1201, name: '天才少年', description: '智力+5, 快乐+1', grade: 2, effect: { INT: 5, SPR: 1 } },
    { id: 1202, name: '倾国倾城', description: '颜值+5, 快乐+1', grade: 2, effect: { CHR: 5, SPR: 1 } },
    { id: 1203, name: '钢筋铁骨', description: '体质+5, 快乐+1', grade: 2, effect: { STR: 5, SPR: 1 } },
    { id: 1204, name: '含着金汤匙', description: '家境+5, 快乐+1', grade: 2, effect: { MNY: 5, SPR: 1 } },
    { id: 1205, name: '文武双全', description: '智力+3, 体质+3', grade: 2, effect: { INT: 3, STR: 3 } },
    { id: 1206, name: '白富美', description: '颜值+3, 家境+3', grade: 2, effect: { CHR: 3, MNY: 3 } },
    { id: 1207, name: '锦鲤附体', description: '所有属性+1', grade: 2, effect: { CHR: 1, INT: 1, STR: 1, MNY: 1, SPR: 1 } },
    { id: 1208, name: '不死之身', description: '体质+4, 快乐+2', grade: 2, effect: { STR: 4, SPR: 2 } },
    { id: 1209, name: '商业奇才', description: '家境+4, 智力+2', grade: 2, effect: { MNY: 4, INT: 2 } },
    { id: 1210, name: '快乐源泉', description: '快乐+5, 颜值+1', grade: 2, effect: { SPR: 5, CHR: 1 } },

    // ── Grade 3（紫色 / 史诗）—— 5 个 ──
    { id: 1301, name: '天选之人', description: '所有属性+2', grade: 3, effect: { CHR: 2, INT: 2, STR: 2, MNY: 2, SPR: 2 } },
    { id: 1302, name: '转世重修', description: '智力+8', grade: 3, effect: { INT: 8 } },
    { id: 1303, name: '龙凤之姿', description: '颜值+4, 智力+4', grade: 3, effect: { CHR: 4, INT: 4 } },
    { id: 1304, name: '皇族血脉', description: '家境+6, 颜值+2', grade: 3, effect: { MNY: 6, CHR: 2 } },
    { id: 1305, name: '先天道体', description: '体质+6, 智力+2', grade: 3, effect: { STR: 6, INT: 2 } },

    // ── Grade 4（橙色 / 传说）—— 3 个 ──
    { id: 1401, name: '天道宠儿', description: '所有属性+3, 快乐+5', grade: 4, effect: { CHR: 3, INT: 3, STR: 3, MNY: 3, SPR: 5 } },
    { id: 1402, name: '混沌之体', description: '体质+10, 颜值+2', grade: 4, effect: { STR: 10, CHR: 2 } },
    { id: 1403, name: '万界之主', description: '所有属性+5', grade: 4, effect: { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 } },
];

/**
 * 天赋品级权重 —— 数值越高越容易抽到
 */
const GRADE_WEIGHTS = { 0: 40, 1: 30, 2: 18, 3: 8, 4: 3, 5: 1 };

/**
 * 天赋品级颜色映射
 */
const GRADE_COLORS = {
    0: '#b0b0b0', // 白色 / 普通
    1: '#4caf50', // 绿色 / 优秀
    2: '#2196f3', // 蓝色 / 稀有
    3: '#9c27b0', // 紫色 / 史诗
    4: '#ff9800', // 橙色 / 传说
};

/**
 * 游戏阶段枚举
 */
const PHASE = {
    IDLE: 'idle',
    TALENTS: 'talents',
    PROPERTIES: 'properties',
    LIVING: 'living',
    ENDED: 'ended',
};

/**
 * 默认属性初始分配点数
 */
const BASE_PROPERTY_POINTS = 20;

/**
 * 最大选择天赋数量
 */
const MAX_TALENT_SELECTIONS = 3;

// ═══════════════════════════════════════════════════════════════
// 本地事件库 —— 按年龄段细分的丰富叙事文本
// ═══════════════════════════════════════════════════════════════

/**
 * 婴幼儿时期事件（0-2 岁）
 */
const EVENTS_BABY = [
    { text: '你呱呱坠地，用响亮的啼哭宣告了自己的到来。', importance: 3 },
    { text: '你学会了翻身，虽然经常翻到一半就卡住。', importance: 1 },
    { text: '你迈出了人生的第一步，虽然立刻就摔了个屁墩。', importance: 2 },
    { text: '你蹦出了第一个词，全家人都激动得不行。', importance: 2 },
    { text: '你对着镜子里的自己笑了半天，以为遇到了新朋友。', importance: 1 },
    { text: '你把碗里的粥扣在了头上，还冲着妈妈笑。', importance: 1 },
    { text: '你在学步车里疯狂冲刺，吓得家里的猫躲到了柜子顶上。', importance: 1 },
    { text: '深夜你哭闹不止，全家轮流抱你到天亮。', importance: 1 },
    { text: '你在睡梦中露出了天使般的微笑，全家人都被萌化了。', importance: 1 },
    { text: '你第一次抓住了父亲的手指，握得出奇地紧。', importance: 1 },
];

/**
 * 幼儿园时期事件（3-5 岁）
 */
const EVENTS_KINDERGARTEN = [
    { text: '你上了幼儿园，第一天哭得撕心裂肺，第二天就交到了新朋友。', importance: 2 },
    { text: '你在幼儿园学会了一首儿歌，回家反复唱了一百遍。', importance: 1 },
    { text: '你画了一幅"全家福"，只不过每个人都长了六根手指。', importance: 1 },
    { text: '你和小伙伴打了一架，原因是争一个红色的小汽车玩具。', importance: 1 },
    { text: '你在幼儿园表演节目，忘词了站在台上发呆，观众笑成一片。', importance: 1 },
    { text: '你学会了骑三轮车，骄傲得像开了一辆法拉利。', importance: 1 },
    { text: '你问妈妈"我是从哪里来的"，妈妈支支吾吾半天。', importance: 1 },
    { text: '你把邻居家的花全拔了，说是要送给妈妈当礼物。', importance: 1 },
    { text: '你在幼儿园的涂鸦墙上画了一条大鲤鱼，老师说很有创意。', importance: 1 },
    { text: '你学会了整理自己的小书包，妈妈很欣慰。', importance: 1 },
];

/**
 * 小学时期事件（6-11 岁）
 */
const EVENTS_PRIMARY = [
    { text: '你上小学了，背着新书包意气风发。', importance: 2 },
    { text: '你考了人生第一个一百分，被贴在了光荣榜上。', importance: 2, condition: { INT: 5 } },
    { text: '你期中考试不及格，回家被罚抄了十遍课文。', importance: 1, condition: { INT: [0, 4] } },
    { text: '你和同桌画了一条"三八线"，谁也不许越界。', importance: 1 },
    { text: '你在运动会上跑了第一名，成了班里的英雄。', importance: 2, condition: { STR: 5 } },
    { text: '你加入了学校合唱团，虽然老师让你"小声点"。', importance: 1 },
    { text: '你被选为班长，从此肩负起收作业的重任。', importance: 2, condition: { INT: 6 } },
    { text: '你养了一只蚕宝宝，每天小心翼翼地喂桑叶。', importance: 1 },
    { text: '你在课堂上偷看漫画被老师没收了，心疼了好几天。', importance: 1 },
    { text: '你学会了游泳，在水里像一条欢快的小鱼。', importance: 1, condition: { STR: 4 } },
    { text: '你在科学课上做的火山模型喷发了，全班都惊呆了。', importance: 1, condition: { INT: 4 } },
    { text: '你第一次独自坐公交车去上学，感觉自己像个大人。', importance: 1 },
    { text: '你在书法比赛中获得了优秀奖，字写得越来越好看了。', importance: 1, condition: { INT: 5 } },
];

/**
 * 初中时期事件（12-14 岁）
 */
const EVENTS_MIDDLE = [
    { text: '你升入初中，面对堆积如山的课本感到一阵迷茫。', importance: 2 },
    { text: '你在学校遇到了一个特别投缘的朋友，成了无话不说的铁哥们。', importance: 2 },
    { text: '你对隔壁班的同学产生了懵懂的好感。', importance: 1, condition: { CHR: 5 } },
    { text: '你参加了数学竞赛，拿了个不错的名次。', importance: 2, condition: { INT: 7 } },
    { text: '你在体育课上扭了脚，拄拐走了一个月。', importance: 1, condition: { STR: [0, 4] } },
    { text: '你迷上了网络小说，每天晚上躲在被窝里偷偷看。', importance: 1 },
    { text: '你帮助了一个被欺负的同学，获得了大家的尊重。', importance: 2, condition: { STR: 5, SPR: 3 } },
    { text: '你在黑板报比赛中为班级赢得了一等奖。', importance: 1 },
    { text: '你和父母发生了一次激烈的争吵，感受到了成长的阵痛。', importance: 2 },
    { text: '你在期末考试中进步了二十名，自信心大增。', importance: 2, condition: { INT: 5 } },
    { text: '你在科技节上展示了自己制作的机器人，引来众多围观。', importance: 2, condition: { INT: 6 } },
    { text: '你开始写日记，记录生活中的点点滴滴。', importance: 1 },
    { text: '你在一次班级辩论赛中表现出色，逻辑清晰让对手哑口无言。', importance: 2, condition: { INT: 6, CHR: 4 } },
];

/**
 * 高中时期事件（15-17 岁）
 */
const EVENTS_HIGH = [
    { text: '你进入高中，开始了披星戴月的苦读生涯。', importance: 2 },
    { text: '你在模拟考试中考进了年级前十。', importance: 2, condition: { INT: 7 } },
    { text: '你参加了学校的篮球队，在球场上挥洒汗水。', importance: 1, condition: { STR: 6 } },
    { text: '你暗恋的人给你递了一张纸条，你的心跳快到了极限。', importance: 2, condition: { CHR: 5 } },
    { text: '你在物理竞赛中获奖，老师说你有科研天赋。', importance: 2, condition: { INT: 8 } },
    { text: '你高考前夕焦虑得睡不着觉，在天台吹了一晚上的风。', importance: 2 },
    { text: '你和死党在毕业典礼上拍了一张珍贵的合照。', importance: 2 },
    { text: '你在一次义工活动中，感受到了帮助他人的温暖。', importance: 1, condition: { SPR: 5 } },
    { text: '你因为偏科严重，咬牙报了补习班恶补。', importance: 1 },
    { text: '你在学校文艺汇演中表演了一个节目，掌声雷动。', importance: 1, condition: { CHR: 6 } },
    { text: '你在数学建模比赛中带领团队获得了省级一等奖。', importance: 2, condition: { INT: 8 } },
    { text: '你组建了一支乐队，在校园音乐节上大放异彩。', importance: 2, condition: { CHR: 6, SPR: 5 } },
];

/**
 * 大学时期事件（18-22 岁）
 */
const EVENTS_COLLEGE = [
    { text: '你收到了大学录取通知书，一家人喜极而泣。', importance: 3 },
    { text: '你在大学里加入了学生会，锻炼了组织能力。', importance: 1, condition: { INT: 5, CHR: 4 } },
    { text: '你在图书馆里泡了一整个学期，GPA名列前茅。', importance: 2, condition: { INT: 7 } },
    { text: '你交到了大学里最好的朋友，约定毕业后也要常联系。', importance: 2 },
    { text: '你在校园招聘会上拿到了第一份实习offer。', importance: 2 },
    { text: '你谈了一场甜蜜的恋爱，校园里到处是你们的足迹。', importance: 2, condition: { CHR: 6 } },
    { text: '你在创业比赛中获奖，对商业产生了浓厚兴趣。', importance: 2, condition: { INT: 6, MNY: 5 } },
    { text: '你通宵打游戏挂了两门课，被辅导员约谈了。', importance: 1, condition: { INT: [0, 4] } },
    { text: '你利用暑假去支教，在山区度过了难忘的一个月。', importance: 2, condition: { SPR: 5 } },
    { text: '你的毕业论文被评为优秀，导师邀请你继续深造。', importance: 2, condition: { INT: 8 } },
    { text: '你的一篇课程论文被学术期刊选中发表了。', importance: 2, condition: { INT: 8 } },
    { text: '你和室友们一起通宵准备创新创业大赛，最终杀入了全国决赛。', importance: 2, condition: { INT: 6, MNY: 4 } },
    { text: '你在海外交流项目中开阔了眼界，对世界有了新的理解。', importance: 2, condition: { INT: 5, MNY: 5 } },
];

/**
 * 青年时期事件（23-30 岁）
 */
const EVENTS_YOUNG_ADULT = [
    { text: '你开始了第一份正式工作，在大城市里租了一个小房间。', importance: 2 },
    { text: '你凭借出色的表现获得了晋升，同事们纷纷祝贺。', importance: 2, condition: { INT: 6 } },
    { text: '你攒够了首付，买下了人生中的第一套房子。', importance: 3, condition: { MNY: 7 } },
    { text: '你遇到了人生中的另一半，决定携手走完余下的路。', importance: 3, condition: { CHR: 5 } },
    { text: '你和朋友合伙创业，虽然艰难但充满激情。', importance: 2, condition: { MNY: 5, INT: 6 } },
    { text: '你在职场中遭遇了一次重大挫折，一度非常迷茫。', importance: 2 },
    { text: '你考取了行业含金量最高的证书，职业前景一片光明。', importance: 2, condition: { INT: 7 } },
    { text: '你在周末学了一门新技能，给生活增添了不少乐趣。', importance: 1 },
    { text: '你父母开始催婚，每次回家都要经历"灵魂拷问"。', importance: 1 },
    { text: '你独自去旅行了一趟，在陌生的城市里找到了内心的平静。', importance: 1, condition: { SPR: 4 } },
    { text: '你的副业收入超过了主业，开始认真思考全职转型。', importance: 2, condition: { INT: 6, MNY: 5 } },
    { text: '你在健身房坚持了整整一年，身材发生了惊人的变化。', importance: 1, condition: { STR: 5 } },
    { text: '你买了人生第一辆车，虽然是二手的但你格外珍惜。', importance: 1, condition: { MNY: 4 } },
];

/**
 * 壮年时期事件（31-45 岁）
 */
const EVENTS_MIDDLE_AGE = [
    { text: '你的孩子出生了，手忙脚乱中体会到了为人父母的喜悦。', importance: 3 },
    { text: '你升职成了部门主管，肩上的担子更重了。', importance: 2, condition: { INT: 7 } },
    { text: '你的事业蒸蒸日上，在行业里小有名气。', importance: 2, condition: { INT: 7, MNY: 6 } },
    { text: '你开始关注健康，每天坚持跑步五公里。', importance: 1, condition: { STR: 5 } },
    { text: '你经历了一次投资失败，损失了不少积蓄。', importance: 2, condition: { MNY: [0, 5] } },
    { text: '你带着全家去了一趟国外旅游，留下了美好的回忆。', importance: 1, condition: { MNY: 6 } },
    { text: '你和老友重聚，感叹岁月如梭。', importance: 1 },
    { text: '你在工作中做出了一个关键决策，为公司挽回了巨大损失。', importance: 2, condition: { INT: 8 } },
    { text: '你开始学习投资理财，为未来做打算。', importance: 1 },
    { text: '你经历了中年危机，开始思考人生的意义。', importance: 2 },
    { text: '你被评选为行业年度十大杰出人物之一。', importance: 3, condition: { INT: 8, MNY: 7 } },
    { text: '你的孩子在学校获了奖，你比自己得奖还开心。', importance: 1 },
    { text: '你开始学习一门乐器，在繁忙中找到了内心的宁静。', importance: 1, condition: { SPR: 4 } },
];

/**
 * 中老年时期事件（46-60 岁）
 */
const EVENTS_SENIOR = [
    { text: '你的孩子考上了大学，你百感交集地送他去了报到。', importance: 2 },
    { text: '你的身体开始出现一些小毛病，医生叮嘱你多注意休息。', importance: 2, condition: { STR: [0, 5] } },
    { text: '你达到了事业的巅峰，回望来路感慨万千。', importance: 3, condition: { INT: 8, MNY: 7 } },
    { text: '你退居二线，把更多精力放在了家庭上。', importance: 1 },
    { text: '你学会了下棋，在公园里找到了几个棋友。', importance: 1 },
    { text: '你的存款终于达到了年轻时设定的目标。', importance: 2, condition: { MNY: 8 } },
    { text: '你在社区当了志愿者，邻居们都很敬佩你。', importance: 1, condition: { SPR: 5 } },
    { text: '你参加了同学聚会，大家都变了模样，只有笑声还是从前的味道。', importance: 1 },
    { text: '你开始写回忆录，记录这些年的酸甜苦辣。', importance: 1, condition: { INT: 6 } },
    { text: '你和老伴一起去了年轻时没来得及去的地方。', importance: 2 },
    { text: '你把多年的人生经验写成了一本畅销书。', importance: 2, condition: { INT: 7, CHR: 5 } },
    { text: '你学会了使用智能手机和社交媒体，与远方的朋友们重新取得了联系。', importance: 1 },
];

/**
 * 老年时期事件（61-80 岁）
 */
const EVENTS_OLD = [
    { text: '你正式退休了，终于可以过上自己想要的生活。', importance: 2 },
    { text: '你抱上了孙子，隔代亲的快乐超乎想象。', importance: 2 },
    { text: '你每天在公园里打太极，身体反而比以前硬朗了。', importance: 1, condition: { STR: 5 } },
    { text: '你的老友突然离世，你在医院里沉默了很久。', importance: 3 },
    { text: '你把毕生的经验写成了一本书，虽然只印了一百本。', importance: 2, condition: { INT: 7 } },
    { text: '你和老伴手牵手在夕阳下散步，觉得这就是幸福。', importance: 2 },
    { text: '你在社区活动中心教小朋友书法，找到了新的乐趣。', importance: 1 },
    { text: '你经历了一次住院，家人寸步不离地陪在身边。', importance: 2, condition: { STR: [0, 4] } },
    { text: '你收到了一封来自远方的信，是年轻时帮助过的人的感谢。', importance: 2 },
    { text: '你看着窗外的夕阳，觉得这辈子虽有遗憾，但也很精彩。', importance: 2 },
    { text: '你的自传出版了，虽然销量不大但每一个字都是真实的人生。', importance: 2, condition: { INT: 6 } },
    { text: '你在公园的长椅上和一位陌生人聊了一个下午，觉得人与人之间的缘分真奇妙。', importance: 1 },
];

/**
 * 耄耋时期事件（81+ 岁）
 */
const EVENTS_ELDER = [
    { text: '你成了社区里最受尊敬的老人，晚辈们都喜欢来听你讲故事。', importance: 2 },
    { text: '你的身体一天不如一天，但精神依然矍铄。', importance: 1 },
    { text: '你在百岁寿宴上，四世同堂，其乐融融。', importance: 3 },
    { text: '你常常坐在摇椅上回忆往事，嘴角不自觉地浮现微笑。', importance: 1 },
    { text: '你虽然行动不便，但每天都会看看窗外的世界。', importance: 1 },
    { text: '你收到了政府颁发的"长寿之星"荣誉证书。', importance: 2 },
    { text: '你和老伙计在棋盘上再下了一局，胜负已不重要。', importance: 1 },
    { text: '你平静地度过了又一个春秋，感恩每一天的阳光。', importance: 1 },
    { text: '你的曾孙出生了，你颤抖着抱起了这个小小的生命。', importance: 2 },
    { text: '有人专程来拜访你，想要记录你传奇的一生。', importance: 2 },
];

/**
 * 高属性触发的特殊事件
 */
const EVENTS_SPECIAL = {
    HIGH_CHR: [
        { text: '你因为出众的外貌被星探发现，获得了一次试镜机会。', importance: 2, minAge: 16 },
        { text: '你成为了社交媒体上的红人，粉丝数蹭蹭上涨。', importance: 2, minAge: 18 },
        { text: '你凭借出色的形象拿到了一个品牌代言合同。', importance: 2, minAge: 20 },
    ],
    HIGH_INT: [
        { text: '你发表了一篇学术论文，在学术圈引起了不小的关注。', importance: 2, minAge: 20 },
        { text: '你解决了一个困扰业界多年的技术难题。', importance: 3, minAge: 25 },
        { text: '你被邀请到大学做客座讲师。', importance: 2, minAge: 30 },
    ],
    HIGH_STR: [
        { text: '你在业余马拉松中跑进了前十名。', importance: 2, minAge: 18 },
        { text: '你凭借强健的体魄在极限运动中大放异彩。', importance: 2, minAge: 20 },
        { text: '你八十岁了还能做三十个俯卧撑，医生都觉得不可思议。', importance: 2, minAge: 80 },
    ],
    HIGH_MNY: [
        { text: '你的投资获得了丰厚的回报，身价翻了一番。', importance: 2, minAge: 25 },
        { text: '你买下了一栋海景别墅，实现了小时候的梦想。', importance: 2, minAge: 30 },
        { text: '你成立了一个慈善基金，帮助了许多有需要的人。', importance: 3, minAge: 40 },
    ],
    HIGH_SPR: [
        { text: '你笑容灿烂地走在路上，陌生人都忍不住朝你微笑。', importance: 1, minAge: 10 },
        { text: '你的乐观精神感染了身边的人，朋友们都爱找你聊天。', importance: 1, minAge: 15 },
        { text: '你成为了朋友圈里公认的"快乐源泉"。', importance: 1, minAge: 20 },
    ],
    LOW_STR: [
        { text: '你感冒了，在床上躺了整整一周。', importance: 1, minAge: 5 },
        { text: '你身体虚弱，不得不放弃了一次重要的出行计划。', importance: 1, minAge: 20 },
        { text: '你因为体力不支住进了医院，医生建议你好好调养。', importance: 2, minAge: 40 },
    ],
    LOW_SPR: [
        { text: '你感到一阵莫名的空虚，望着天花板发了半天呆。', importance: 1, minAge: 12 },
        { text: '你失眠了好几天，精神状态很差。', importance: 1, minAge: 18 },
        { text: '你感到生活失去了色彩，决定去看心理医生。', importance: 2, minAge: 25 },
    ],
};

/**
 * 通用随机事件 —— 在任何年龄段都有可能发生
 */
const EVENTS_GENERIC = [
    { text: '这一年风平浪静，日子过得平淡而充实。', importance: 0 },
    { text: '你在路上捡到了一笔钱，犹豫再三还是交给了警察。', importance: 1 },
    { text: '你养的植物终于开花了，你拍了很多照片。', importance: 0 },
    { text: '你生了一场不大不小的病，恢复后更加珍惜健康。', importance: 1 },
    { text: '你读了一本好书，改变了你对某件事的看法。', importance: 1 },
    { text: '你在深夜里想起了一个很久不联系的人。', importance: 0 },
    { text: '你搬了一次家，新环境让你有了新的开始。', importance: 1 },
    { text: '你学会了做一道新菜，味道还不错。', importance: 0 },
];

// ═══════════════════════════════════════════════════════════════
// 属性变化事件 —— 本地引擎会产出的属性波动
// ═══════════════════════════════════════════════════════════════

/**
 * 正面属性变化模板
 */
const POSITIVE_CHANGES = [
    { text: '坚持锻炼带来了效果。', props: { STR: 1 }, condition: { STR: 4 } },
    { text: '最近学了很多新东西。', props: { INT: 1 }, condition: { INT: 4 } },
    { text: '周围人都说你越来越好看了。', props: { CHR: 1 }, condition: { CHR: 4 } },
    { text: '一笔意外之财。', props: { MNY: 1 } },
    { text: '最近心情不错。', props: { SPR: 1 } },
];

/**
 * 负面属性变化模板
 */
const NEGATIVE_CHANGES = [
    { text: '缺乏运动，身体素质下降了。', props: { STR: -1 }, condition: { STR: [0, 5] } },
    { text: '最近总是记不住事情。', props: { INT: -1 } },
    { text: '熬夜太多，气色变差了。', props: { CHR: -1 } },
    { text: '一笔意外的开销。', props: { MNY: -1 } },
    { text: '最近总觉得不开心。', props: { SPR: -1 } },
];

// ═══════════════════════════════════════════════════════════════
// 评价与总结
// ═══════════════════════════════════════════════════════════════

/**
 * 人生评价等级
 */
const LIFE_RATINGS = [
    { min: 0,   max: 39,  title: '苦难人生',   emoji: '😢', description: '命运多舛，历经坎坷。' },
    { min: 40,  max: 59,  title: '平凡人生',   emoji: '😐', description: '普普通通，平平淡淡。' },
    { min: 60,  max: 74,  title: '小康人生',   emoji: '🙂', description: '虽不大富大贵，但也知足常乐。' },
    { min: 75,  max: 89,  title: '精彩人生',   emoji: '😊', description: '有高有低，但总体过得精彩。' },
    { min: 90,  max: 99,  title: '辉煌人生',   emoji: '🌟', description: '一生璀璨，令人艳羡。' },
    { min: 100, max: Infinity, title: '传奇人生', emoji: '👑', description: '天命之人，万中无一。' },
];

/**
 * 死因描述模板
 */
const DEATH_REASONS = {
    health: '你的身体再也承受不住了，在一个安静的夜晚永远地闭上了眼睛。',
    despair: '你的内心已经无法承受生活的重压，灵魂在沉默中慢慢熄灭。',
    oldAge:  '你安详地离开了这个世界，走完了漫长而充实的一生。',
    random:  '命运无常，一场突如其来的意外带走了你。',
    madness: '理智在不可名状的低语中彻底崩塌，你被深渊吞没。',
    apocalypse: '末世的寒风吹熄了最后的火种，你倒在黎明之前。',
    adventure: '你在一次冒险中永远地留在了远方，带着微笑和不悔。',
    wealth: '你在富裕中安详离世，一生的积累化为了后人的福泽。',
    glory: '你在荣耀的巅峰画上了句号，世人将铭记你的名字。',
    peace: '你在亲人的环绕中平静地闭上了眼，没有遗憾。',
};

export function getDeathReasonText(reason) {
    if (!reason) return DEATH_REASONS.oldAge;
    return DEATH_REASONS[reason] || reason;
}

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/**
 * 在 [min, max] 范围内生成随机整数
 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从数组中随机挑选一个元素
 */
function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 从数组中随机挑选 n 个不重复的元素
 */
function pickRandomN(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

/**
 * 限制数值在指定范围内
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 按照权重随机选择
 */
function weightedRandom(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return Number(key);
    }
    return Number(entries[entries.length - 1][0]);
}

/**
 * 检查属性是否满足条件
 * 条件格式: { INT: 5 }  => INT >= 5
 *           { STR: [0, 4] } => 0 <= STR <= 4
 */
function checkCondition(condition, properties) {
    if (!condition) return true;
    for (const [key, value] of Object.entries(condition)) {
        const prop = properties[key] ?? 0;
        if (Array.isArray(value)) {
            if (prop < value[0] || prop > value[1]) return false;
        } else {
            if (prop < value) return false;
        }
    }
    return true;
}

/**
 * 深拷贝
 */
function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return { ...obj };
    }
}

// ═══════════════════════════════════════════════════════════════
// 动态任务模板
// ═══════════════════════════════════════════════════════════════

/**
 * 按年龄段的动态任务池
 */
const TASK_POOL = [
    {
        ageRange: [6, 12],
        tasks: [
            {
                id: 'task_study_hard',
                description: '老师布置了一道很难的奥数题，你要不要挑战？',
                choices: [
                    { text: '挑战！', effect: { INT: 1, SPR: -1 }, result: '你冥思苦想终于解出来了，智力有所提升，但过程很痛苦。' },
                    { text: '算了吧', effect: { SPR: 1 }, result: '你选择出去玩耍，快乐是最重要的。' },
                ],
            },
            {
                id: 'task_sports_day',
                description: '学校运动会要选拔队员，你要报名参加吗？',
                choices: [
                    { text: '报名！', effect: { STR: 1, CHR: 1 }, result: '你在运动会上奋力拼搏，体质和形象都有提升。' },
                    { text: '当观众就好', effect: { SPR: 1 }, result: '你在看台上为同学加油，度过了愉快的一天。' },
                ],
            },
        ],
    },
    {
        ageRange: [13, 17],
        tasks: [
            {
                id: 'task_confession',
                description: '你鼓起勇气想向喜欢的人表白，怎么办？',
                choices: [
                    { text: '勇敢表白', effect: { CHR: 1, SPR: 1 }, result: '不管结果如何，你迈出了勇敢的一步。' },
                    { text: '把心意藏在心底', effect: { INT: 1 }, result: '你把这份感情化为了学习的动力。' },
                ],
            },
            {
                id: 'task_study_path',
                description: '临近中考/高考，你想走哪条路？',
                choices: [
                    { text: '拼命学习冲名校', effect: { INT: 2, STR: -1, SPR: -1 }, result: '你日夜苦读，成绩突飞猛进，但身心俱疲。' },
                    { text: '劳逸结合，稳扎稳打', effect: { INT: 1, SPR: 1 }, result: '你保持了良好的状态，稳步前进。' },
                ],
            },
        ],
    },
    {
        ageRange: [18, 25],
        tasks: [
            {
                id: 'task_career_choice',
                description: '你面前有两条职业道路，如何选择？',
                choices: [
                    { text: '进入大公司，稳定发展', effect: { MNY: 2, INT: 1 }, result: '你加入了一家知名企业，获得了不错的薪资和成长机会。' },
                    { text: '自己创业，搏一把', effect: { MNY: -1, INT: 2, SPR: 1 }, result: '创业路上荆棘满布，但你学到了课本上没有的东西。' },
                ],
            },
            {
                id: 'task_invest',
                description: '朋友推荐了一个投资机会，你怎么看？',
                choices: [
                    { text: '投入一部分积蓄', effect: { MNY: 2 }, result: '这笔投资获得了不错的回报！' },
                    { text: '谨慎观望', effect: { SPR: 1 }, result: '你没有冒险，保住了本金，安心不少。' },
                ],
            },
        ],
    },
    {
        ageRange: [26, 45],
        tasks: [
            {
                id: 'task_family',
                description: '工作和家庭之间产生了冲突，你偏向哪边？',
                choices: [
                    { text: '以事业为重', effect: { MNY: 2, INT: 1, SPR: -1 }, result: '你加班加点完成了项目，但错过了家人的重要时刻。' },
                    { text: '回归家庭', effect: { SPR: 2, MNY: -1 }, result: '你选择陪伴家人，内心感到无比充实。' },
                ],
            },
            {
                id: 'task_health_check',
                description: '体检报告上出现了一些异常指标，你怎么处理？',
                choices: [
                    { text: '开始认真锻炼和调理', effect: { STR: 2, SPR: 1 }, result: '你改变了生活方式，身体状况逐渐好转。' },
                    { text: '应该没什么大事', effect: { SPR: 1, STR: -1 }, result: '你选择了忽视，日子照旧。' },
                ],
            },
        ],
    },
    {
        ageRange: [46, 70],
        tasks: [
            {
                id: 'task_retirement',
                description: '你考虑提前退休享受生活，还是继续拼搏？',
                choices: [
                    { text: '提前退休', effect: { SPR: 3, MNY: -1 }, result: '你放下了工作的重担，开始了悠闲的退休生活。' },
                    { text: '继续奋斗', effect: { MNY: 2, STR: -1 }, result: '你继续在职场上发光发热，但身体有些吃不消了。' },
                ],
            },
            {
                id: 'task_legacy',
                description: '你想为这个世界留下些什么？',
                choices: [
                    { text: '写一本自传', effect: { INT: 1, SPR: 2 }, result: '你把一生的故事凝结成文字，感动了很多人。' },
                    { text: '投身公益事业', effect: { SPR: 2, MNY: -1 }, result: '你把积蓄和精力投入公益，帮助了许多需要帮助的人。' },
                ],
            },
        ],
    },
];

// ═══════════════════════════════════════════════════════════════
// 核心引擎类
// ═══════════════════════════════════════════════════════════════

export class GameEngine {
    constructor() {
        /** @type {string} 当前游戏阶段 */
        this._phase = PHASE.IDLE;

        /** @type {Object|null} 绑定的系统（来自 systemManager） */
        this._system = null;

        /** @type {Object|null} AI 服务引用（默认使用导入的单例） */
        this._aiService = aiService;

        /** @type {Object[]} 本次抽取的天赋 */
        this._drawnTalents = [];

        /** @type {Object[]} 玩家选择的天赋（最多 3 个） */
        this._selectedTalents = [];

        /** @type {Object} 角色当前属性 */
        this._properties = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };

        /** @type {number} 总可分配点数（可被天赋修改） */
        this._totalPoints = BASE_PROPERTY_POINTS;

        /** @type {boolean} 属性是否已锁定 */
        this._propertiesLocked = false;

        /** @type {number} 当前年龄 */
        this._age = -1;

        /** @type {boolean} 角色是否存活 */
        this._alive = false;

        /** @type {Object[]} 全部人生事件记录 */
        this._lifeEvents = [];

        /** @type {Object|null} 当前活跃的动态任务 */
        this._currentTask = null;

        /** @type {string|null} 死亡原因 */
        this._deathReason = null;

        /** @type {number} 自然寿命上限（基于体质计算） */
        this._naturalLifespan = 80;

        /** @type {Object.<string, number>} 系统自定义属性实时值 */
        this._customStats = {};

        /** @type {Set<string>} 已触发的特殊事件 ID，用于去重 */
        this._triggeredSpecials = new Set();

        /** @type {number} 上次生成任务的年龄 */
        this._lastTaskAge = -10;

        /** @type {Set<string>} 剧情路线标签，决定后续事件走向 */
        this._storyFlags = new Set();

        /** @type {number} 上次出现关键人生抉择的年龄 */
        this._lastDecisionAge = -10;

        /** @type {Array} Bug #6: 任务/主线/支线系统 */
        this._quests = [];

        /** @type {number} 用于生成唯一任务 ID */
        this._questIdCounter = 0;
    }

    // ─────────────────────────────────────────────────
    // 初始化与重置
    // ─────────────────────────────────────────────────

    /**
     * 重置所有游戏状态，准备新一局
     */
    reset() {
        this._phase = PHASE.IDLE;
        this._drawnTalents = [];
        this._selectedTalents = [];
        this._properties = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };
        this._totalPoints = BASE_PROPERTY_POINTS;
        this._propertiesLocked = false;
        this._age = -1;
        this._alive = false;
        this._lifeEvents = [];
        this._currentTask = null;
        this._deathReason = null;
        this._naturalLifespan = 80;
        this._customStats = {};
        this._triggeredSpecials = new Set();
        this._lastTaskAge = -10;
        this._storyFlags = new Set();
        this._lastDecisionAge = -10;
        this._quests = [];
        this._questIdCounter = 0;

        // 重置记忆引擎
        try {
            memoryEngine.reset();
        } catch (e) {
            console.warn('重置记忆引擎失败：', e.message);
        }

        return this;
    }

    /**
     * 设置当前绑定的系统
     * @param {Object|null} system - 来自 systemManager 的系统对象
     */
    setSystem(system) {
        this._system = system ? deepClone(system) : null;
        this._initializeCustomStatsFromSystem(this._system);
        return this;
    }

    /**
     * 设置 AI 服务引用
     * @param {Object} service - AI 服务实例
     */
    setAIService(service) {
        if (service) {
            this._aiService = service;
        }
        return this;
    }

    // ─────────────────────────────────────────────────
    // 天赋抽取阶段
    // ─────────────────────────────────────────────────

    /**
     * 从天赋池中随机抽取天赋
     * 按品级权重抽取，不重复
     * @param {number} count - 抽取数量，默认 10
     * @returns {Object[]} 抽到的天赋列表
     */
    drawTalents(count = 10) {
        this._phase = PHASE.TALENTS;
        this._drawnTalents = [];
        this._selectedTalents = [];

        // 按品级分组
        const gradeGroups = {};
        for (const talent of TALENT_POOL) {
            const g = talent.grade;
            if (!gradeGroups[g]) gradeGroups[g] = [];
            gradeGroups[g].push(talent);
        }

        const drawn = new Set();
        let attempts = 0;
        const maxAttempts = count * 20;

        while (this._drawnTalents.length < count && attempts < maxAttempts) {
            attempts++;

            // 按权重选品级
            const grade = weightedRandom(GRADE_WEIGHTS);
            const pool = gradeGroups[grade];
            if (!pool || pool.length === 0) continue;

            // 从该品级中随机选一个
            const talent = pickRandom(pool);
            if (!talent || drawn.has(talent.id)) continue;

            drawn.add(talent.id);
            this._drawnTalents.push(deepClone(talent));
        }

        // 如果抽取不足，从所有剩余天赋中补充
        if (this._drawnTalents.length < count) {
            const remaining = TALENT_POOL.filter(t => !drawn.has(t.id));
            const needed = count - this._drawnTalents.length;
            const extra = pickRandomN(remaining, needed);
            for (const t of extra) {
                this._drawnTalents.push(deepClone(t));
            }
        }

        return this._drawnTalents;
    }

    /**
     * 获取当前抽取的天赋列表
     * @returns {Object[]}
     */
    getDrawnTalents() {
        return [...this._drawnTalents];
    }

    /**
     * 玩家选择天赋（最多 3 个）
     * @param {number[]} ids - 天赋 ID 数组
     * @returns {Object[]} 选中的天赋列表
     */
    selectTalents(ids) {
        if (!Array.isArray(ids)) {
            throw new Error('天赋 ID 必须是数组');
        }

        const validIds = ids.slice(0, MAX_TALENT_SELECTIONS);
        this._selectedTalents = [];

        for (const id of validIds) {
            const talent = this._drawnTalents.find(t => t.id === id);
            if (talent) {
                this._selectedTalents.push(deepClone(talent));
            }
        }

        return this._selectedTalents;
    }

    /**
     * 获取已选择的天赋列表
     * @returns {Object[]}
     */
    getSelectedTalents() {
        return [...this._selectedTalents];
    }

    // ─────────────────────────────────────────────────
    // 属性分配阶段
    // ─────────────────────────────────────────────────

    /**
     * 获取总可分配点数（包含天赋加成）
     * @returns {number}
     */
    getPropertyPoints() {
        return this._totalPoints;
    }

    /**
     * 获取当前已分配的点数
     * @returns {number}
     */
    getAllocatedPoints() {
        return Object.values(this._properties).reduce((sum, v) => sum + v, 0);
    }

    /**
     * 获取剩余可分配点数
     * @returns {number}
     */
    getRemainingPoints() {
        return this._totalPoints - this.getAllocatedPoints();
    }

    /**
     * 设置单个属性值
     * @param {string} key - 属性键（CHR / INT / STR / MNY / SPR）
     * @param {number} value - 要设置的值
     * @returns {boolean} 是否设置成功
     */
    allocateProperty(key, value) {
        if (this._propertiesLocked) {
            console.warn('属性已锁定，无法修改');
            return false;
        }
        if (!PROPERTIES[key]) {
            console.warn(`未知属性：${key}`);
            return false;
        }

        const maxVal = PROPERTIES[key].max;
        const clamped = clamp(Math.floor(value), 0, maxVal);

        // 计算修改后总点数是否超支
        const otherPoints = Object.entries(this._properties)
            .filter(([k]) => k !== key)
            .reduce((sum, [, v]) => sum + v, 0);

        if (otherPoints + clamped > this._totalPoints) {
            console.warn('点数不足');
            return false;
        }

        this._properties[key] = clamped;
        this._phase = PHASE.PROPERTIES;
        return true;
    }

    /**
     * 获取当前所有属性
     * @returns {Object} { CHR, INT, STR, MNY, SPR }
     */
    getProperties() {
        return { ...this._properties };
    }

    /**
     * 确认属性分配，锁定并叠加天赋效果
     * @returns {Object} 最终属性
     */
    confirmAllocation() {
        if (this._propertiesLocked) {
            return this.getProperties();
        }

        // 叠加天赋效果
        for (const talent of this._selectedTalents) {
            if (talent.effect) {
                for (const [key, bonus] of Object.entries(talent.effect)) {
                    if (this._properties[key] !== undefined) {
                        this._properties[key] += bonus;
                    }
                }
            }
        }

        this._propertiesLocked = true;

        // 计算自然寿命上限
        this._naturalLifespan = Math.min(120, 60 + this._properties.STR * 4);

        return this.getProperties();
    }

    // ─────────────────────────────────────────────────
    // 人生模拟
    // ─────────────────────────────────────────────────

    /**
     * 开始人生模拟
     * @returns {Object} 初始状态
     */
    startLife() {
        if (!this._propertiesLocked) {
            this.confirmAllocation();
        }

        this._phase = PHASE.LIVING;
        this._age = -1;
        this._alive = true;
        this._lifeEvents = [];
        this._deathReason = null;
        this._triggeredSpecials = new Set();
        this._lastTaskAge = -10;
        this._quests = [];
        this._questIdCounter = 0;

        // 更新自然寿命
        this._naturalLifespan = Math.min(120, 60 + this._properties.STR * 4);

        return {
            phase: this._phase,
            properties: this.getProperties(),
            talents: this.getSelectedTalents(),
            system: this._system ? { id: this._system.id, name: this._system.name } : null,
        };
    }

    /**
     * 推进一年，返回该年的事件和变化
     * 核心模拟循环
     * @returns {Promise<Object>} 年度结果
     */
    async nextYear() {
        if (!this._alive || this._phase !== PHASE.LIVING) {
            return { age: this._age, events: [], isEnd: true, deathReason: this._deathReason };
        }

        this._age++;
        const age = this._age;
        const events = [];
        const propertyChanges = {};
        let systemMessage = null;
        let task = null;
        let encounter = null;

        // ── 1. 检查系统里程碑 ──
        const milestones = this._checkSystemMilestones(age);
        for (const m of milestones) {
            events.push({
                type: 'milestone',
                text: `【系统里程碑】${m.milestone.description}`,
                importance: 3,
            });
            // 应用里程碑效果
            for (const eff of m.effects) {
                this._applyPropertyChange(eff.property, eff.value, propertyChanges);
            }
            // 记录到记忆
            try {
                memoryEngine.addMilestone(age, m.milestone.description, 3);
            } catch (e) { /* 静默处理 */ }
        }

        // ── 2. 检查系统能力 ──
        const abilities = this._checkSystemAbilities(age);
        for (const a of abilities) {
            events.push({
                type: 'ability',
                text: `【系统能力】${a.ability.name}：${a.ability.description}`,
                importance: 2,
            });
            for (const eff of a.effects) {
                this._applyPropertyChange(eff.property, eff.value, propertyChanges);
            }
        }

        // ── 3. 系统消息（如果有绑定系统） ──
        if (this._system) {
            systemMessage = this._generateSystemMessage(age);
        }

        // ── 4. 生成年度事件 ──
        const yearlyEvents = await this._generateYearlyEvents(age);
        for (const evt of yearlyEvents) {
            events.push(evt);
            // 记录到记忆引擎
            try {
                memoryEngine.addEvent(age, evt.text, evt.importance || 1);
            } catch (e) { /* 静默处理 */ }
        }

        // ── 5. 属性随机波动 ──
        const fluctuation = this._generatePropertyFluctuation(age);
        if (fluctuation) {
            events.push({
                type: 'property_change',
                text: fluctuation.text,
                importance: 1,
            });
            for (const [key, delta] of Object.entries(fluctuation.props)) {
                this._applyPropertyChange(key, delta, propertyChanges);
            }
        }

        // ── 6. 年龄衰老效果（40 岁以后体质和颜值缓慢下降） ──
        if (age > 40 && age % 5 === 0) {
            const decay = age > 70 ? 2 : 1;
            if (Math.random() < 0.6) {
                this._applyPropertyChange('STR', -decay, propertyChanges);
                events.push({ type: 'aging', text: '岁月不饶人，你感觉体力不如从前了。', importance: 1 });
            }
            if (age > 50 && Math.random() < 0.4) {
                this._applyPropertyChange('CHR', -1, propertyChanges);
            }
        }

        // ── 7. 动态任务生成 ──
        if (age - this._lastTaskAge >= 4 && Math.random() < 0.45) {
            task = this._generateTask(age);
            if (task) {
                this._currentTask = task;
                this._lastTaskAge = age;
            }
        }

        // ── 7.5 Bug #6: 更新任务系统 ──
        this._updateQuestSystem(age);

        // v3.0 Random encounter
        encounter = this._generateRandomEncounter(age);

        // ── 8. 关键人生抉择 ──
        let decision = null;
        if (this._alive && age >= 12 && age - this._lastDecisionAge >= 4) {
            decision = this._generateLifeDecision(age);
            if (decision) {
                this._lastDecisionAge = age;
                events.push({
                    type: 'decision',
                    text: `【关键抉择】${decision.description}`,
                    importance: 3,
                });
            }
        }

        // ── 9. 生成阶段总结（每 10 年） ──
        try {
            if (memoryEngine.shouldGenerateSummary && memoryEngine.shouldGenerateSummary(age)) {
                memoryEngine.generatePeriodSummary(age);
            }
        } catch (e) { /* 静默处理 */ }

        // ── 10. 死亡判定 ──
        const deathCheck = this._checkDeath(age);
        if (deathCheck.isDead) {
            this._alive = false;
            this._phase = PHASE.ENDED;
            this._deathReason = deathCheck.reason;

            events.push({
                type: 'death',
                text: DEATH_REASONS[deathCheck.reason] || DEATH_REASONS.oldAge,
                importance: 5,
            });

            // 记录死亡事件
            try {
                memoryEngine.addMilestone(age, `人生终结：${deathCheck.reason}`, 5);
            } catch (e) { /* 静默处理 */ }
        }

        // 记录到人生事件列表
        const yearRecord = {
            age,
            events,
            propertyChanges,
            systemMessage,
            task: task ? this._buildTaskForUI(age, task) : undefined,
            encounter: encounter || undefined,
            isEnd: !this._alive,
            deathReason: this._deathReason || undefined,
            properties: this.getProperties(),
        };

        if (decision) {
            yearRecord.choices = decision.choices.map(choice => ({
                text: choice.text,
                callback: async () => this._resolveLifeDecision(yearRecord, decision, choice),
            }));
        }

        this._lifeEvents.push(yearRecord);

        return yearRecord;
    }

    /**
     * 获取当前年龄
     * @returns {number}
     */
    getCurrentAge() {
        return this._age;
    }

    /**
     * 检查角色是否存活
     * @returns {boolean}
     */
    isAlive() {
        return this._alive;
    }

    /**
     * 获取全部人生事件记录
     * @returns {Object[]}
     */
    getLifeEvents() {
        return [...this._lifeEvents];
    }

    // ─────────────────────────────────────────────────
    // 动态任务
    // ─────────────────────────────────────────────────

    /**
     * 获取当前活跃的动态任务
     * @returns {Object|null}
     */
    getCurrentTask() {
        return this._currentTask ? deepClone(this._currentTask) : null;
    }

    /**
     * 构建供 UI 渲染的任务对象
     * @param {number} age
     * @param {Object} task
     * @returns {Object}
     */
    _buildTaskForUI(age, task) {
        return {
            title: task.title || '系统任务',
            description: task.description,
            urgency: task.urgency || 'normal',
            choices: (task.choices || []).map((choice, index) => ({
                text: choice.text,
                callback: async () => this.respondToTask(index),
            })),
        };
    }

    /**
     * 玩家响应动态任务
     * @param {number} choiceIndex - 选项索引
     * @returns {Object|null} 任务结果
     */
    respondToTask(choiceIndex) {
        if (!this._currentTask) return null;

        const task = this._currentTask;
        const choice = task.choices?.[choiceIndex];

        if (!choice) {
            console.warn(`无效的任务选项索引：${choiceIndex}`);
            return null;
        }

        const propertyChanges = {};
        this._applyEffectMap(choice.effect, propertyChanges);
        this._applyNarrativeRewards(choice, this._age);

        const taskText = `任务「${task.description}」—— ${choice.text}：${choice.result}`;
        this._appendCurrentYearEvent({ type: 'task', text: taskText, importance: 3 });

        try {
            memoryEngine.addEvent(this._age, taskText, 2);
        } catch (e) { /* 静默处理 */ }

        this._currentTask = null;

        return {
            task: task.description,
            choice: choice.text,
            result: choice.result,
            propertyChanges,
            properties: this.getProperties(),
            world: this.getWorldPanels(),
        };
    }

    // ─────────────────────────────────────────────────
    // 状态查询
    // ─────────────────────────────────────────────────

    /**
     * 获取完整游戏状态快照
     * @returns {Object}
     */
    getState() {
        return {
            phase: this._phase,
            age: this._age,
            alive: this._alive,
            properties: this.getProperties(),
            customStats: this.getCustomStats(),
            totalPoints: this._totalPoints,
            remainingPoints: this.getRemainingPoints(),
            propertiesLocked: this._propertiesLocked,
            drawnTalents: this.getDrawnTalents(),
            selectedTalents: this.getSelectedTalents(),
            lifeEvents: this.getLifeEvents(),
            currentTask: this.getCurrentTask(),
            deathReason: this._deathReason,
            system: this._system ? { id: this._system.id, name: this._system.name } : null,
            naturalLifespan: this._naturalLifespan,
        };
    }

    /**
     * 获取当前游戏阶段
     * @returns {string} 'idle'|'talents'|'properties'|'living'|'ended'
     */
    getPhase() {
        return this._phase;
    }

    /**
     * 导出可序列化的存档数据
     * @returns {Object}
     */
    exportSaveData() {
        return {
            phase: this._phase,
            age: this._age,
            alive: this._alive,
            properties: deepClone(this._properties),
            totalPoints: this._totalPoints,
            propertiesLocked: this._propertiesLocked,
            drawnTalents: deepClone(this._drawnTalents),
            selectedTalents: deepClone(this._selectedTalents),
            lifeEvents: deepClone(this._lifeEvents),
            currentTask: deepClone(this._currentTask),
            deathReason: this._deathReason,
            naturalLifespan: this._naturalLifespan,
            customStats: deepClone(this._customStats),
            systemId: this._system?.id || null,
            system: deepClone(this._system),
            triggeredSpecials: Array.from(this._triggeredSpecials),
            lastTaskAge: this._lastTaskAge,
            storyFlags: Array.from(this._storyFlags),
            lastDecisionAge: this._lastDecisionAge,
            memory: memoryEngine.exportData(),
        };
    }

    /**
     * 从存档数据恢复游戏状态
     * @param {Object} data
     * @param {Object|null} restoredSystem
     */
    importSaveData(data, restoredSystem = null) {
        if (!data || typeof data !== 'object') return false;

        this._phase = data.phase || PHASE.IDLE;
        this._age = typeof data.age === 'number' ? data.age : -1;
        this._alive = !!data.alive;
        this._properties = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0, ...(data.properties || {}) };
        this._totalPoints = typeof data.totalPoints === 'number' ? data.totalPoints : BASE_PROPERTY_POINTS;
        this._propertiesLocked = !!data.propertiesLocked;
        this._drawnTalents = Array.isArray(data.drawnTalents) ? deepClone(data.drawnTalents) : [];
        this._selectedTalents = Array.isArray(data.selectedTalents) ? deepClone(data.selectedTalents) : [];
        this._lifeEvents = Array.isArray(data.lifeEvents) ? deepClone(data.lifeEvents) : [];
        this._currentTask = data.currentTask ? deepClone(data.currentTask) : null;
        this._deathReason = data.deathReason || null;
        this._naturalLifespan = typeof data.naturalLifespan === 'number' ? data.naturalLifespan : 80;
        this._system = restoredSystem ? deepClone(restoredSystem) : (data.system ? deepClone(data.system) : null);
        this._customStats = data.customStats && typeof data.customStats === 'object'
            ? { ...data.customStats }
            : {};
        this._triggeredSpecials = new Set(Array.isArray(data.triggeredSpecials) ? data.triggeredSpecials : []);
        this._lastTaskAge = typeof data.lastTaskAge === 'number' ? data.lastTaskAge : -10;
        this._storyFlags = new Set(Array.isArray(data.storyFlags) ? data.storyFlags : []);
        this._lastDecisionAge = typeof data.lastDecisionAge === 'number' ? data.lastDecisionAge : -10;
        this._initializeCustomStatsFromSystem(this._system, this._customStats);

        if (data.memory) {
            try {
                memoryEngine.importData(data.memory);
            } catch (err) {
                console.warn('恢复记忆存档失败：', err.message);
            }
        }
        return true;
    }

    /** 获取当前世界状态摘要 */
    getWorldPanels() {
        return {
            inventory: memoryEngine.getInventory(),
            relationships: memoryEngine.getRelationships(6),
            storyFlags: Array.from(this._storyFlags),
            currentTask: this._currentTask ? deepClone(this._currentTask) : null,
            customStats: this.getCustomStats(),
        };
    }

    // ─────────────────────────────────────────────────
    // Bug #6: 任务/主线/支线系统
    // ─────────────────────────────────────────────────

    /**
     * 获取所有任务（主线+支线）
     * @returns {Array}
     */
    getQuests() {
        return deepClone(this._quests);
    }

    /**
     * 添加新任务
     * @param {Object} quest - 任务配置
     * @returns {Object} 创建的任务
     */
    addQuest(quest) {
        const id = `quest_${++this._questIdCounter}`;
        const newQuest = {
            id,
            type: quest.type || 'side', // 'main' 或 'side'
            title: quest.title || '未命名任务',
            description: quest.description || '',
            status: 'active', // 'active', 'completed', 'failed'
            progress: 0,
            target: quest.target || 1,
            reward: quest.reward || '',
            triggerAge: this._age,
            ...quest,
        };
        this._quests.push(newQuest);
        return newQuest;
    }

    /**
     * 推进任务进度
     * @param {string} questId - 任务 ID
     * @param {number} amount - 进度增量
     */
    advanceQuest(questId, amount = 1) {
        const quest = this._quests.find(q => q.id === questId);
        if (!quest || quest.status !== 'active') return null;
        quest.progress = Math.min(quest.target, quest.progress + amount);
        if (quest.progress >= quest.target) {
            quest.status = 'completed';
            // 应用奖励
            if (quest.rewardEffect) {
                this._applyEffectMap(quest.rewardEffect, {});
            }
        }
        return quest;
    }

    /**
     * 根据年龄自动生成/更新任务（每年调用）
     */
    _updateQuestSystem(age) {
        const systemId = this._system?.id || 'default';

        // 系统通用主线任务
        if (age === 0 && !this._quests.some(q => q.type === 'main')) {
            this.addQuest({
                type: 'main',
                title: '活过而立',
                description: '活到30岁，完成人生第一阶段',
                target: 30,
                reward: '人生阅历加成',
                rewardEffect: { SPR: 2, INT: 1 },
            });
        }

        // 更新主线任务进度
        this._quests.forEach(q => {
            if (q.status === 'active' && q.title === '活过而立') {
                q.progress = Math.min(30, age);
            }
            if (q.status === 'active' && q.title === '不惑之年') {
                q.progress = Math.min(40, age);
            }
            if (q.status === 'active' && q.title === '知天命') {
                q.progress = Math.min(50, age);
            }
        });

        // 30岁完成后开新主线
        if (age === 30) {
            const mainDone = this._quests.find(q => q.title === '活过而立' && q.status === 'completed');
            if (mainDone) {
                this.addQuest({
                    type: 'main',
                    title: '不惑之年',
                    description: '活到40岁，在人生中段找到方向',
                    target: 40,
                    reward: '智慧沉淀',
                    rewardEffect: { INT: 2 },
                });
            }
        }

        if (age === 40) {
            const mainDone = this._quests.find(q => q.title === '不惑之年' && q.status === 'completed');
            if (mainDone) {
                this.addQuest({
                    type: 'main',
                    title: '知天命',
                    description: '活到50岁，接受命运的安排',
                    target: 50,
                    reward: '天命感悟',
                    rewardEffect: { SPR: 3 },
                });
            }
        }

        // 系统专属支线任务
        if (systemId === 'cultivation' && age === 16 && !this._quests.some(q => q.title === '筑基入门')) {
            this.addQuest({
                type: 'side',
                title: '筑基入门',
                description: '修炼到一定程度，完成筑基',
                target: 1,
                reward: '灵根觉醒',
                rewardEffect: { STR: 2, INT: 1 },
            });
        }

        if (systemId === 'tycoon' && age === 20 && !this._quests.some(q => q.title === '第一桶金')) {
            this.addQuest({
                type: 'side',
                title: '第一桶金',
                description: '在商业领域赚到第一笔大钱',
                target: 1,
                reward: '商业嗅觉',
                rewardEffect: { MNY: 3 },
            });
        }

        if (systemId === 'villain' && age === 18 && !this._quests.some(q => q.title === '初露锋芒')) {
            this.addQuest({
                type: 'side',
                title: '初露锋芒',
                description: '在一次冲突中展示你的能力',
                target: 1,
                reward: '威慑力提升',
                rewardEffect: { CHR: 2, INT: 1 },
            });
        }

        if ((systemId === 'checkin' || systemId === 'signin') && age === 12 && !this._quests.some(q => q.title === '连续签到')) {
            this.addQuest({
                type: 'side',
                title: '连续签到',
                description: '坚持签到，积累好运',
                target: 10,
                reward: '签到大礼包',
                rewardEffect: { SPR: 2, MNY: 1 },
            });
        }

        // 签到系统进度跟随年龄
        if (systemId === 'checkin' || systemId === 'signin') {
            const signInQuest = this._quests.find(q => q.title === '连续签到' && q.status === 'active');
            if (signInQuest) {
                signInQuest.progress = Math.min(signInQuest.target, age - 11);
            }
        }

        // 修仙突破支线自动完成
        if (systemId === 'cultivation') {
            const jjQuest = this._quests.find(q => q.title === '筑基入门' && q.status === 'active');
            if (jjQuest && this._storyFlags.has('cultivation:breakthrough')) {
                jjQuest.progress = 1;
            }
        }

        // 商战第一桶金
        if (systemId === 'tycoon') {
            const moneyQuest = this._quests.find(q => q.title === '第一桶金' && q.status === 'active');
            if (moneyQuest && this._properties.MNY >= 6) {
                moneyQuest.progress = 1;
            }
        }

        // 反派初露锋芒
        if (systemId === 'villain') {
            const villainQuest = this._quests.find(q => q.title === '初露锋芒' && q.status === 'active');
            if (villainQuest && (this._storyFlags.has('villain:dominant') || this._storyFlags.has('villain:scheme'))) {
                villainQuest.progress = 1;
            }
        }
    }

    // ─────────────────────────────────────────────────
    // 总结与评分
    // ─────────────────────────────────────────────────

    /**
     * 生成人生终结总结
     * 优先使用 AI 生成传记，失败则使用本地模板
     * @returns {Promise<Object>} 总结数据
     */
    async generateSummary() {
        const stats = this.getFinalStats();
        const score = this.getLifeScore();
        const rating = LIFE_RATINGS.find(r => score >= r.min && score <= r.max) || LIFE_RATINGS[0];

        // 构建传记数据
        const lifeData = {
            age: this._age,
            properties: this.getProperties(),
            customStats: this.getCustomStats(),
            talents: this._selectedTalents.map(t => t.name),
            system: this._system
                ? { id: this._system.id, name: this._system.name, emoji: this._system.emoji || '🎮' }
                : null,
            events: this._lifeEvents.map(y => ({
                age: y.age,
                events: y.events.map(e => e.text),
            })),
            deathReason: this._deathReason,
            deathReasonText: getDeathReasonText(this._deathReason),
            score,
        };

        let biography = '';

        // 尝试 AI 生成传记
        try {
            if (this._aiService && this._aiService.isConfigured()) {
                const result = await this._aiService.generateSummary(lifeData);
                if (result && result.reply) {
                    biography = result.reply;
                }
            }
        } catch (e) {
            console.warn('AI 生成人生总结失败，使用本地模板：', e.message);
        }

        // 本地模板兜底
        if (!biography) {
            biography = this._generateLocalBiography(lifeData, rating);
        }

        return {
            score,
            rating,
            stats,
            biography,
            lifeData,
        };
    }

    /**
     * 计算人生总评分（0-120）
     * @returns {number}
     */
    getLifeScore() {
        const props = this.getProperties();

        // 属性得分（每个属性满分 10，总计 50 分，权重系数 1.0）
        const propScore = (props.CHR + props.INT + props.STR + props.MNY + props.SPR) * 1.0;

        // 寿命得分（最高 30 分）
        const ageScore = Math.min(30, Math.floor(this._age / 3));

        // 里程碑得分（每个里程碑 3 分，最高 20 分）
        const milestoneCount = this._lifeEvents
            .reduce((count, y) => count + y.events.filter(e => e.type === 'milestone').length, 0);
        const milestoneScore = Math.min(20, milestoneCount * 3);

        // 事件丰富度（最高 15 分）
        const totalEvents = this._lifeEvents.reduce((count, y) => count + y.events.length, 0);
        const eventScore = Math.min(15, Math.floor(totalEvents / 5));

        // 快乐加成（最高 5 分）
        const sprBonus = Math.min(5, Math.floor(props.SPR / 2));

        // 系统成长加成（最高 10 分）
        const customStats = this.getCustomStats();
        const customScore = customStats.length > 0
            ? Math.min(10, Math.round(customStats.reduce((sum, stat) => {
                const max = Math.max(1, stat.max || 100);
                const current = Math.max(0, stat.current ?? stat.initial ?? 0);
                return sum + Math.min(1, current / max);
            }, 0) * 4))
            : 0;

        return Math.round(propScore + ageScore + milestoneScore + eventScore + sprBonus + customScore);
    }

    /**
     * 获取最终统计数据
     * @returns {Object}
     */
    getFinalStats() {
        const props = this.getProperties();
        const totalEvents = this._lifeEvents.reduce((count, y) => count + y.events.length, 0);
        const milestones = this._lifeEvents
            .reduce((arr, y) => arr.concat(y.events.filter(e => e.type === 'milestone')), []);

        // 为每个属性生成评价
        const propEvaluations = {};
        for (const [key, config] of Object.entries(PROPERTIES)) {
            const val = props[key] || 0;
            let judge = '';
            if (val >= 9) judge = '登峰造极';
            else if (val >= 7) judge = '出类拔萃';
            else if (val >= 5) judge = '中规中矩';
            else if (val >= 3) judge = '差强人意';
            else judge = '惨不忍睹';

            propEvaluations[key] = {
                name: config.name,
                icon: config.icon,
                value: val,
                judge,
            };
        }

        return {
            age: this._age,
            properties: props,
            customStats: this.getCustomStats(),
            propEvaluations,
            totalEvents,
            milestones: milestones.map(m => m.text),
            talents: this._selectedTalents.map(t => ({ name: t.name, grade: t.grade })),
            highlights: this._getLifeHighlights(5),
            system: this._system
                ? { id: this._system.id, name: this._system.name, emoji: this._system.emoji || '🎮' }
                : { id: 'none', name: '无', emoji: '🎮' },
            systemName: this._system ? this._system.name : '无',
            deathReason: this._deathReason,
            deathReasonText: getDeathReasonText(this._deathReason),
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法
    // ═══════════════════════════════════════════════════════════

    /**
     * 应用属性变化并记录到变化表中
     */
    _applyPropertyChange(key, delta, changeRecord) {
        if (this._properties.hasOwnProperty(key)) {
            this._properties[key] += delta;
            // 属性下限为 0（不设上限，天赋可以超过 10）
            if (this._properties[key] < 0) this._properties[key] = 0;

            if (changeRecord) {
                changeRecord[key] = (changeRecord[key] || 0) + delta;
            }
            return;
        }

        if (Object.prototype.hasOwnProperty.call(this._customStats, key)) {
            this._applyCustomStatChange(key, delta, changeRecord);
        }
    }

    _applyEffectMap(effectMap, changeRecord) {
        if (!effectMap) return;
        for (const [key, delta] of Object.entries(effectMap)) {
            this._applyPropertyChange(key, delta, changeRecord);
        }
    }

    applyExternalEffects(effectMap, options = {}) {
        if (!effectMap || typeof effectMap !== 'object') return {};

        const changes = {};
        this._applyEffectMap(effectMap, changes);
        this._syncSystemCustomStatsSnapshot();

        if (Object.keys(changes).length > 0 && this._age >= 0) {
            const source = options.source || '系统赐福';
            const summary = this._formatChangeSummary(changes);
            const text = summary ? `【${source}】${summary}` : `【${source}】你的命运出现了新的波动。`;

            this._appendCurrentYearEvent({
                type: 'chat_effect',
                text,
                importance: 2,
            });

            try {
                memoryEngine.addEvent(this._age, text, 1.5);
            } catch (e) {
                console.warn('记录对话效果到记忆失败：', e.message);
            }
        }

        return changes;
    }

    getCustomStats() {
        const statDefs = this._system?.customStats || [];
        return statDefs.map((stat) => ({
            ...deepClone(stat),
            current: this._customStats[stat.id] ?? stat.initial ?? 0,
        }));
    }

    _initializeCustomStatsFromSystem(system, existingValues = null) {
        const nextStats = {};
        const statDefs = system?.customStats || [];

        statDefs.forEach((stat) => {
            const fallback = stat.initial ?? 0;
            const rawValue = existingValues && Object.prototype.hasOwnProperty.call(existingValues, stat.id)
                ? existingValues[stat.id]
                : fallback;
            nextStats[stat.id] = this._clampCustomStatValue(stat, rawValue);
        });

        this._customStats = nextStats;
        this._syncSystemCustomStatsSnapshot();
    }

    _syncSystemCustomStatsSnapshot() {
        if (!this._system?.customStats) return;
        this._system.customStats = this._system.customStats.map((stat) => ({
            ...stat,
            current: this._customStats[stat.id] ?? stat.initial ?? 0,
        }));
    }

    _applyCustomStatChange(key, delta, changeRecord) {
        const stat = this._system?.customStats?.find((item) => item.id === key);
        if (!stat) return;

        const before = this._customStats[key] ?? stat.initial ?? 0;
        const after = this._clampCustomStatValue(stat, before + delta);
        const actualDelta = after - before;

        this._customStats[key] = after;
        if (actualDelta !== 0 && changeRecord) {
            changeRecord[key] = (changeRecord[key] || 0) + actualDelta;
        }
        this._syncSystemCustomStatsSnapshot();
    }

    _clampCustomStatValue(stat, value) {
        let next = Number.isFinite(value) ? value : Number(value) || 0;
        if (typeof stat.min === 'number') next = Math.max(stat.min, next);
        if (typeof stat.max === 'number') next = Math.min(stat.max, next);
        return next;
    }

    _formatChangeSummary(changes = {}) {
        return Object.entries(changes)
            .filter(([, delta]) => delta !== 0)
            .map(([key, delta]) => {
                const baseProp = PROPERTIES[key];
                const customStat = this._system?.customStats?.find((stat) => stat.id === key);
                const label = baseProp?.name || customStat?.name || key;
                const icon = baseProp?.icon || customStat?.icon || '✨';
                return `${icon}${label}${delta > 0 ? '+' : ''}${delta}`;
            })
            .join(' · ');
    }

    _getLifeHighlights(count = 5) {
        const important = memoryEngine.getImportantEvents
            ? memoryEngine.getImportantEvents(Math.max(count * 2, count))
            : [];

        const highlights = important
            .filter((item) => item?.event)
            .slice(0, count)
            .map((item) => `${item.age}岁：${item.event}`);

        if (highlights.length > 0) return highlights;

        return this._lifeEvents
            .flatMap((year) => year.events.map((evt) => `${year.age}岁：${evt.text}`))
            .slice(-count);
    }

    _appendCurrentYearEvent(event) {
        if (!event) return;
        const current = this._lifeEvents[this._lifeEvents.length - 1];
        if (current && current.age === this._age) {
            current.events.push(event);
        }
    }

    _applyNarrativeRewards(payload, age = this._age) {
        if (!payload) return;

        if (payload.money) {
            this._applyPropertyChange('MNY', payload.money, null);
        }

        if (payload.item) {
            memoryEngine.addItem(payload.item, payload.itemDesc || '', payload.itemRarity || 'rare');
        }

        if (Array.isArray(payload.items)) {
            payload.items.forEach(item => {
                if (!item?.name) return;
                memoryEngine.addItem(item.name, item.description || '', item.rarity || 'common');
            });
        }

        if (payload.relationship) {
            memoryEngine.updateRelationship(
                payload.relationship.name,
                payload.relationship.delta || 0,
                payload.relationship.event || payload.result || payload.text || '命运因你而改变'
            );
        }

        if (Array.isArray(payload.relationships)) {
            payload.relationships.forEach(rel => {
                if (!rel?.name) return;
                memoryEngine.updateRelationship(rel.name, rel.delta || 0, rel.event || payload.result || '命运因你而改变');
            });
        }

        if (Array.isArray(payload.flags)) {
            payload.flags.forEach(flag => this._storyFlags.add(flag));
        }

        if (Array.isArray(payload.removeFlags)) {
            payload.removeFlags.forEach(flag => this._storyFlags.delete(flag));
        }

        if (payload.milestone) {
            memoryEngine.addMilestone(age, payload.milestone, payload.importance || 3);
        }
    }

    _buildStageDecisionPool(age) {
        const systemId = this._system?.id || 'default';
        const pools = [];

        if (age >= 12 && age <= 17) {
            pools.push(
                {
                    description: '班主任把你叫到办公室：你的人生要开始分路了。你要怎么度过接下来的学生时代？',
                    choices: [
                        { text: '埋头学习，冲高分路线', effect: { INT: 2, SPR: -1 }, flags: ['route:study'], result: '你选择把青春押在课桌和试卷上，成绩一路上扬。', relationship: { name: '班主任', delta: 6, event: '你成了老师重点关照的对象' }, milestone: '学生时代选择了高分路线' },
                        { text: '加入社团，经营人脉和表达', effect: { CHR: 2, SPR: 1 }, flags: ['route:social'], result: '你在社团里混得风生水起，越来越会说话，也认识了不少朋友。', relationship: { name: '社团伙伴', delta: 12, event: '你在社团里结识了可靠伙伴' }, item: '社团荣誉证书', itemDesc: '记录你活跃青春的证明', itemRarity: 'common' },
                        { text: '偷偷培养兴趣，押注一门自己的本事', effect: { INT: 1, CHR: 1, SPR: 1 }, flags: ['route:craft'], result: '你把课余时间悄悄投入自己的兴趣，这项本事日后会反复救你。', item: '兴趣作品集', itemDesc: '你少年时期积累的第一批作品', itemRarity: 'rare', milestone: '学生时代打下了兴趣技能基础' },
                    ],
                }
            );
        }

        if (age >= 18 && age <= 28) {
            pools.push(
                {
                    description: '成年之后，第一个真正属于你自己的岔路口来了。你准备怎么赌这一把？',
                    choices: [
                        { text: '继续升学，走长期成长路线', effect: { INT: 2, STR: -1 }, flags: ['route:education'], result: '你选择延迟兑现，继续积累学历和认知，人生节奏变慢但更稳。', relationship: { name: '导师', delta: 10, event: '你遇到了一位影响深远的导师' }, milestone: '青年期选择了深造路线' },
                        { text: '直接工作，尽快赚钱立足', effect: { MNY: 2, STR: 1 }, flags: ['route:career'], result: '你比同龄人更早进入社会，现实的压力也让你更快成熟。', relationship: { name: '同事阿晋', delta: 8, event: '你在职场结识了第一位真正能并肩作战的人' } },
                        { text: '拉人创业，赌一把命运上限', effect: { CHR: 1, MNY: 1, SPR: 1 }, flags: ['route:startup'], result: '你选择不按常规来，哪怕会摔得很疼，也要试一次自己定义人生。', item: '创业计划书', itemDesc: '写满野心和风险的创业蓝图', itemRarity: 'epic', relationship: { name: '合伙人林舟', delta: 14, event: '你和林舟一拍即合，决定联手创业' }, milestone: '青年期走上创业路线' },
                    ],
                }
            );
        }

        if (age >= 29 && age <= 45) {
            pools.push(
                {
                    description: '你已经不再年轻，手里的筹码和责任一起变多。这一次，你把重心放在哪里？',
                    choices: [
                        { text: '冲事业，争一个更高的位置', effect: { INT: 1, MNY: 2, STR: -1 }, flags: ['route:ambition'], result: '你把更多时间投入事业，名望和收益开始快速抬升，但身体也在发出抗议。', relationship: { name: '竞争对手', delta: -12, event: '你在事业上树立了明显的对手' } },
                        { text: '顾家庭，稳住真正重要的人', effect: { CHR: 1, SPR: 2 }, flags: ['route:family'], removeFlags: ['route:ambition'], result: '你决定把时间留给更重要的人，生活的节奏变慢，但心开始安定。', relationship: { name: '家人', delta: 18, event: '你重新把精力放回家人身上' }, milestone: '中年期选择了家庭路线' },
                        { text: '投资自己和资产，准备下一阶段跃迁', effect: { MNY: 1, INT: 1, SPR: 1 }, flags: ['route:invest'], result: '你开始系统经营资源和资产，人生从“赚钱”走向“配置未来”。', item: '长期投资组合', itemDesc: '你亲手打造的资产配置组合', itemRarity: 'rare' },
                    ],
                }
            );
        }

        if (systemId === 'cultivation' && age >= 16 && age <= 60) {
            pools.push({
                description: '灵台一震，你感觉自己站在突破与走火入魔的临界点上，要不要赌这次破境？',
                choices: [
                    { text: '强行破境，搏一次逆天改命', effect: { INT: 1, STR: 1, SPR: -1 }, flags: ['cultivation:breakthrough'], result: '你顶着风险硬冲境界，虽然心神震荡，但修为精进了一大步。', item: '残缺灵玉', itemDesc: '突破时遗留下来的灵性碎片', itemRarity: 'epic', milestone: '修仙路线完成了一次高风险破境' },
                    { text: '先稳固根基，缓一步再说', effect: { STR: 1, SPR: 1 }, flags: ['cultivation:stable'], result: '你压下躁动，选择稳固根基，这让未来的突破更扎实。', relationship: { name: '授业长老', delta: 10, event: '长老认可了你的心性' } },
                ],
            });
        }

        if (systemId === 'tycoon' && age >= 18 && age <= 55) {
            pools.push({
                description: '系统推来一笔高风险机会：你要立刻梭哈，还是稳着做现金流？',
                choices: [
                    { text: '押注高风险高回报项目', effect: { MNY: 3, SPR: -1 }, flags: ['tycoon:aggressive'], result: '你把钱砸向风口，短期波动极大，但收益也开始疯狂放大。', item: '控股协议', itemDesc: '一份足以改变资产规模的协议', itemRarity: 'epic' },
                    { text: '先做稳健现金流生意', effect: { MNY: 2, STR: 1 }, flags: ['tycoon:steady'], result: '你不追一夜暴富，而是把商业体系搭扎实，后劲更足。', relationship: { name: '金牌客户', delta: 12, event: '你拿下了长期合作客户' } },
                ],
            });
        }

        if (systemId === 'villain' && age >= 15 && age <= 50) {
            pools.push({
                description: '有人当众踩你的脸，这次你要忍，还是当场反击？',
                choices: [
                    { text: '忍住，暗中布局再反杀', effect: { INT: 2, SPR: 1 }, flags: ['villain:scheme'], result: '你没有马上翻脸，而是把这口气记在心里，开始布一盘更大的局。', relationship: { name: '宿敌韩岳', delta: -18, event: '你和韩岳结下梁子' }, milestone: '反派路线进入布局期' },
                    { text: '当场打脸，先把场子找回来', effect: { CHR: 1, STR: 1 }, flags: ['villain:dominant'], result: '你毫不退让，当场把对方压住，名声和仇恨一起上涨。', relationship: { name: '围观者', delta: 6, event: '很多人第一次真正记住了你' } },
                ],
            });
        }

        if (systemId === 'checkin' && age >= 12 && age <= 70) {
            pools.push({
                description: '今日签到触发特殊暴击：你要把好运花在眼前，还是存到以后再爆？',
                choices: [
                    { text: '立刻领取，先把眼前提升吃满', effect: { STR: 1, MNY: 1, SPR: 1 }, flags: ['checkin:cashout'], result: '你把今天的好运马上兑现，眼前的手感明显变顺了。', item: '暴击签到礼包', itemDesc: '签到系统暴击奖励', itemRarity: 'rare' },
                    { text: '选择累计，赌后面的大爆发', effect: { INT: 1, SPR: 1 }, flags: ['checkin:stack'], result: '你把好运压进未来的池子里，虽然眼前收益少了些，但后劲更值得期待。', milestone: '签到路线开始累积大奖概率' },
                ],
            });
        }

        return pools;
    }

    _generateLifeDecision(age) {
        const pools = this._buildStageDecisionPool(age);
        if (!pools.length) return null;
        const picked = pools[Math.floor(Math.random() * pools.length)];
        return deepClone(picked);
    }

    async _resolveLifeDecision(yearRecord, decision, choice) {
        const propertyChanges = {};
        this._applyEffectMap(choice.effect, propertyChanges);
        this._applyNarrativeRewards(choice, yearRecord.age);

        const resultText = choice.result || '你的选择在命运里激起了一圈涟漪。';
        const event = {
            type: 'choice-result',
            text: `【你选择了：${choice.text}】${resultText}`,
            importance: 3,
        };
        yearRecord.events.push(event);
        yearRecord.propertyChanges = {
            ...(yearRecord.propertyChanges || {}),
            ...Object.fromEntries(Object.entries(propertyChanges).map(([k, v]) => [k, (yearRecord.propertyChanges?.[k] || 0) + v]))
        };
        yearRecord.properties = this.getProperties();
        yearRecord.choices = [];

        try {
            memoryEngine.addEvent(yearRecord.age, `${decision.description}｜你选择了${choice.text}：${resultText}`, 3);
        } catch (err) {
            console.warn('记录人生抉择失败：', err.message);
        }

        return {
            result: resultText,
            propertyChanges,
            properties: this.getProperties(),
            world: this.getWorldPanels(),
        };
    }

    /**
     * 检查系统里程碑
     */
    _checkSystemMilestones(age) {
        if (!this._system) return [];
        try {
            // 如果 systemManager 通过外部集成可用
            if (typeof globalThis !== 'undefined' && globalThis.systemManager) {
                return globalThis.systemManager.checkMilestones(age, this._properties);
            }
            // 本地处理：检查系统对象中的 milestones
            return this._localCheckMilestones(age);
        } catch (e) {
            return this._localCheckMilestones(age);
        }
    }

    /**
     * 本地里程碑检查（不依赖外部 systemManager）
     */
    _localCheckMilestones(age) {
        if (!this._system || !Array.isArray(this._system.milestones)) return [];

        const triggered = [];
        for (const milestone of this._system.milestones) {
            const key = `ms:${milestone.age}:${milestone.description}`;
            if (this._triggeredSpecials.has(key)) continue;
            if (age < milestone.age) continue;

            this._triggeredSpecials.add(key);

            const effects = [];
            if (milestone.effect && milestone.effect.property && typeof milestone.effect.value === 'number') {
                effects.push({
                    property: milestone.effect.property,
                    value: milestone.effect.value,
                    source: milestone.description,
                });
            }
            triggered.push({ milestone: deepClone(milestone), effects });
        }
        return triggered;
    }

    /**
     * 检查系统能力
     */
    _checkSystemAbilities(age) {
        if (!this._system) return [];
        try {
            if (typeof globalThis !== 'undefined' && globalThis.systemManager) {
                return globalThis.systemManager.checkAbilities(age, this._properties);
            }
            return this._localCheckAbilities(age);
        } catch (e) {
            return this._localCheckAbilities(age);
        }
    }

    /**
     * 本地能力检查
     */
    _localCheckAbilities(age) {
        if (!this._system || !Array.isArray(this._system.abilities)) return [];

        const triggered = [];
        for (const ability of this._system.abilities) {
            if (!ability.trigger || typeof ability.trigger.every !== 'number') continue;

            const interval = ability.trigger.every;
            if (age <= 0 || age % interval !== 0) continue;

            const key = `ab:${ability.name}:${age}`;
            if (this._triggeredSpecials.has(key)) continue;
            this._triggeredSpecials.add(key);

            const effects = [];
            if (ability.effect && ability.effect.property && typeof ability.effect.value === 'number') {
                effects.push({
                    property: ability.effect.property,
                    value: ability.effect.value,
                    source: ability.name,
                });
            }
            triggered.push({ ability: deepClone(ability), effects });
        }
        return triggered;
    }

    /**
     * Bug #7: 生成系统个性消息（增强网文风格）
     */
    _generateSystemMessage(age) {
        if (!this._system) return null;

        const messages = [];
        const sys = this._system;
        const sysId = sys.id;

        // 特殊年龄节点消息（网文风格）
        if (age === 0) {
            messages.push(sys.greeting || `【${sys.name}】已绑定，开始你的人生吧！`);
        } else if (age === 18) {
            const adultMessages = {
                cultivation: `【${sys.name}】"汝已成年，灵根初成，正式踏入修行之路。记住，修仙者，逆天而行。"`,
                villain: `【${sys.name}】"哟，成年了？终于不是个毛头小子了。从今天开始，你的反派人生才刚刚开始！"`,
                tycoon: `【${sys.name}】"宿主大人成年啦！从今天起，您的每一笔投资都将获得系统加成！小的好激动！"`,
                apocalypse: `【${sys.name}】——成年判定通过——你已具备独立生存能力。生存概率重新计算中……注意：成年意味着更大的威胁。`,
                signin: `【${sys.name}】"恭喜宿主成年！签到系统升级啦！从今天起解锁成人签到奖池，奖励更丰厚哦～✨"`,
            };
            messages.push(adultMessages[sysId] || `【${sys.name}】恭喜成年！更多系统功能已解锁。`);
        } else if (age % 10 === 0 && age > 0) {
            const decade = age / 10;
            const decadeMessages = {
                cultivation: [
                    `【${sys.name}】${decade}个甲子弹指一挥间。修行路漫漫，望汝不忘初心。`,
                    `【${sys.name}】又一轮修行过去了。汝之修为……尚可。`,
                    `【${sys.name}】光阴似箭，转眼已过${age}载。道心是否依旧坚定？`,
                ],
                villain: [
                    `【${sys.name}】${age}岁了，你的实力终于不那么难看了。勉强吧。`,
                    `【${sys.name}】又十年过去了。废物，你还活着呢？算你运气好。`,
                    `【${sys.name}】${age}岁……嗯，总算有点反派的气势了。继续。`,
                ],
                tycoon: [
                    `【${sys.name}】宿主大人${age}岁生日快乐！您的资产又创新高了！小的好崇拜您！`,
                    `【${sys.name}】${age}年的商业传奇！宿主大人您太了不起了！`,
                    `【${sys.name}】又一个十年过去了，宿主大人的商业帝国越来越辉煌了！`,
                ],
                apocalypse: [
                    `【${sys.name}】——存活${age}年——生存记录：优秀。继续保持警戒。`,
                    `【${sys.name}】${age}年了。在末世中活这么久不容易。别松懈。`,
                    `【${sys.name}】又活过了十年。生存概率已更新。不要大意。`,
                ],
                signin: [
                    `【${sys.name}】哇！宿主已经签到${age}年了！超级签到达人！奖励送上～✨`,
                    `【${sys.name}】${age}年连续签到成就达成！系统为你准备了特别奖励！`,
                    `【${sys.name}】第${decade}个十年签到纪念日！你是签到之王！🎉`,
                ],
            };
            const pool = decadeMessages[sysId] || [
                `【${sys.name}】${decade}0 岁了，时光飞逝。`,
                `【${sys.name}】又一个十年过去了，继续加油。`,
                `【${sys.name}】人生第 ${decade} 个十年，精彩继续。`,
            ];
            messages.push(pickRandom(pool));
        }

        return messages.length > 0 ? messages.join(' ') : null;
    }

    /**
     * 生成年度事件（核心事件引擎）
     * 优先使用 AI，失败则回退到本地生成
     */
    async _generateYearlyEvents(age) {
        // 尝试 AI 生成
        try {
            if (this._aiService && this._aiService.isConfigured()) {
                const context = {
                    age,
                    properties: this.getProperties(),
                    system: this._system,
                    talents: this._selectedTalents.map(t => t.name),
                    recentEvents: this._lifeEvents.slice(-3).map(y => ({
                        age: y.age,
                        events: y.events.map(e => e.text),
                    })),
                };

                const result = await this._aiService.generateYearlyEvent(context);
                if (result && result.events && result.events.length > 0) {
                    return result.events.map(e => ({
                        type: 'story',
                        text: typeof e === 'string' ? e : (e.text || e.content || String(e)),
                        importance: typeof e === 'object' && e.importance ? e.importance : 2,
                        source: 'ai',
                    }));
                }
                // AI 返回了但解析失败时，使用原始回复
                if (result && result.reply) {
                    return [{
                        type: 'story',
                        text: result.reply,
                        importance: 2,
                        source: 'ai',
                    }];
                }
            }
        } catch (e) {
            console.warn(`AI 生成第 ${age} 岁事件失败，回退本地引擎：`, e.message);
        }

        // 本地事件生成
        return this._generateLocalEvents(age);
    }

    /**
     * 本地事件生成引擎
     * 根据年龄段、属性、天赋生成丰富的叙事事件
     */
    _generateLocalEvents(age) {
        const props = this.getProperties();
        const events = [];

        // ── 按年龄段选取基础事件池 ──
        let pool;
        if (age <= 2) pool = EVENTS_BABY;
        else if (age <= 5) pool = EVENTS_KINDERGARTEN;
        else if (age <= 11) pool = EVENTS_PRIMARY;
        else if (age <= 14) pool = EVENTS_MIDDLE;
        else if (age <= 17) pool = EVENTS_HIGH;
        else if (age <= 22) pool = EVENTS_COLLEGE;
        else if (age <= 30) pool = EVENTS_YOUNG_ADULT;
        else if (age <= 45) pool = EVENTS_MIDDLE_AGE;
        else if (age <= 60) pool = EVENTS_SENIOR;
        else if (age <= 80) pool = EVENTS_OLD;
        else pool = EVENTS_ELDER;

        // 筛选满足条件的事件
        const eligible = pool.filter(e => checkCondition(e.condition, props));

        if (eligible.length > 0) {
            // 选取 1-2 个事件
            const count = Math.random() < 0.3 ? 2 : 1;
            const selected = pickRandomN(eligible, count);
            for (const evt of selected) {
                events.push({
                    type: 'story',
                    text: evt.text,
                    importance: evt.importance || 1,
                    source: 'local',
                });
            }
        }

        // ── 高属性特殊事件 ──
        const specialEvents = this._checkSpecialEvents(age, props);
        for (const se of specialEvents) {
            events.push({
                type: 'special',
                text: se.text,
                importance: se.importance || 2,
                source: 'local',
            });
        }

        // ── 如果没有生成任何事件，使用通用事件兜底 ──
        if (events.length === 0) {
            const generic = pickRandom(EVENTS_GENERIC);
            if (generic) {
                events.push({
                    type: 'story',
                    text: generic.text,
                    importance: generic.importance || 0,
                    source: 'local',
                });
            }
        }

        // ── 系统专属叙事（如果绑定了系统） ──
        if (this._system) {
            const sysEvent = this._generateSystemNarrative(age, props);
            if (sysEvent) {
                events.push({
                    type: 'system_narrative',
                    text: sysEvent,
                    importance: 2,
                    source: 'local',
                });
            }
        }

        // ── 剧情路线后续反馈 ──
        const routeEvent = this._generateRouteFollowupEvent(age, props);
        if (routeEvent) {
            events.push({
                type: 'branch_followup',
                text: routeEvent,
                importance: 2,
                source: 'local',
            });
        }

        return events;
    }

    /**
     * 检查并生成高/低属性触发的特殊事件
     */
    _checkSpecialEvents(age, props) {
        const results = [];

        const checks = [
            { key: 'HIGH_CHR', prop: 'CHR', threshold: 8, above: true },
            { key: 'HIGH_INT', prop: 'INT', threshold: 8, above: true },
            { key: 'HIGH_STR', prop: 'STR', threshold: 8, above: true },
            { key: 'HIGH_MNY', prop: 'MNY', threshold: 8, above: true },
            { key: 'HIGH_SPR', prop: 'SPR', threshold: 7, above: true },
            { key: 'LOW_STR',  prop: 'STR', threshold: 3, above: false },
            { key: 'LOW_SPR',  prop: 'SPR', threshold: 3, above: false },
        ];

        for (const check of checks) {
            const val = props[check.prop] || 0;
            const match = check.above ? (val >= check.threshold) : (val <= check.threshold);
            if (!match) continue;

            const pool = EVENTS_SPECIAL[check.key];
            if (!pool) continue;

            const eligible = pool.filter(e => {
                if (e.minAge && age < e.minAge) return false;
                const eventKey = `special:${check.key}:${e.text}`;
                if (this._triggeredSpecials.has(eventKey)) return false;
                return true;
            });

            if (eligible.length > 0 && Math.random() < 0.25) {
                const chosen = pickRandom(eligible);
                const eventKey = `special:${check.key}:${chosen.text}`;
                this._triggeredSpecials.add(eventKey);
                results.push(chosen);
            }
        }

        return results;
    }

    /**
     * Bug #7: 生成系统专属叙事片段（增强网文小说风格）
     */
    _generateSystemNarrative(age, props) {
        if (!this._system) return null;
        const sysId = this._system.id;
        const sysName = this._system.name;

        // 只在部分年份触发，避免刷屏
        if (Math.random() > 0.40) return null;

        // 根据系统类型生成特色叙事（网文风格）
        const narratives = {
            signin: [
                `【${sysName}】叮！签到成功，获得了系统积分。今日运势：大吉！`,
                `【${sysName}】连续签到奖励：今日份的好运已送达。"宿主，记得每天来打卡哦～"`,
                `【${sysName}】签到暴击！奖励翻倍！系统欢快地发出了金色光芒。`,
                `【${sysName}】签到系统提醒你：今天也要元气满满哦。顺便一提，你的签到连击数又创新高了！`,
                `【${sysName}】"恭喜宿主，今日签到获得隐藏奖励！"系统的声音里带着难以掩饰的兴奋。`,
                `【${sysName}】签到排行榜更新！你的排名又上升了三位，距离传说级签到者只差一步之遥。`,
            ],
            cultivation: [
                `【${sysName}】你盘膝而坐，感受到一股灵气涌入体内，丹田微微发热，修为有所精进。`,
                `【${sysName}】修炼中你隐约触摸到了更高境界的门槛，仿佛有一层薄纱即将被捅破。`,
                `【${sysName}】"汝之灵根资质有所提升。"系统的声音在脑海中回荡，冷冽如九天之上的寒风。`,
                `【${sysName}】一本古老的功法在你脑海中浮现，字字珠玑，每一个字都蕴含着天地至理。`,
                `【${sysName}】你在修炼中领悟了一丝天地法则，周身气势为之一变，仿佛脱胎换骨。`,
                `【${sysName}】灵台清明，你隐约感受到了天劫的气息。系统冷然道："莫要得意忘形，修行路远。"`,
                `【${sysName}】你在洞府中闭关三日，出关时修为精进一层，身上隐约有仙气环绕。`,
                `【${sysName}】门派传来消息，有一处秘境即将开启。系统道："此乃机缘，不可错过。"`,
            ],
            tycoon: [
                `【${sysName}】"宿主大人！今天的返利到账了！"系统献媚地说道，一笔资金悄然入账。`,
                `【${sysName}】系统为你获取了一条独家投资信息，据说稳赚不赔。"宿主大人英明神武！"`,
                `【${sysName}】VIP会员专属福利已发放。系统热切地说："宿主大人的每一分消费都是投资！"`,
                `【${sysName}】系统分析了最近的市场趋势，为你推荐了一个暴利项目。"小的为宿主鞍前马后！"`,
                `【${sysName}】你的商业帝国版图又扩大了一块。系统激动得声音都在颤抖："宿主大人太厉害了！"`,
                `【${sysName}】一位神秘的合作伙伴找上了你。系统兴奋道："这是顶级资源，宿主快把握住！"`,
            ],
            apocalypse: [
                `【${sysName}】——扫描完毕——远处传来丧尸的嘶吼声，建议保持警戒状态。生存概率微调：+0.3%。`,
                `【${sysName}】你在废墟中翻找到一些有用的物资。系统冷冷道："够活一周。别浪费。"`,
                `【${sysName}】幸存者基地的防线似乎又加固了一些。系统："防御等级提升，但仍不足以抵御大规模尸潮。"`,
                `【${sysName}】系统探测到附近有一个未开发的安全区域。"前往？风险系数：中等。收益：可观。你选。"`,
                `【${sysName}】一群变异兽从远处掠过，所幸没有发现你的踪迹。系统："运气不会永远站在你这边。"`,
                `【${sysName}】夜晚的废墟格外安静，但系统检测到地下有异常辐射波动。"保持警觉。"`,
            ],
            villain: [
                `【${sysName}】有人在背后议论你，系统冷笑道："又是些蝼蚁，让他们先得意，秋后算账的时候自然会到。"`,
                `【${sysName}】你的势力范围又扩大了一些。系统毒舌道："就这？离真正的大反派还差得远呢。"`,
                `【${sysName}】又有人想要挑战你的地位。系统不屑地说："废物，连给你提鞋都不配。"`,
                `【${sysName}】你在暗中布下的棋子开始发挥作用。系统难得赞许："嗯，总算有点反派的样子了。"`,
                `【${sysName}】那个所谓的主角又在你面前装逼。系统冷冷道："让他蹦跶，反派从来都是笑到最后的那个。"`,
                `【${sysName}】你收到一份来自暗处的效忠信。系统勉强道："看来你的威名开始传开了。勉勉强强吧。"`,
            ],
            cthulhu: [
                `【${sysName}】你在深夜听到了来自虚空的低语，那声音既恐惧又令人着迷。系统冷冷道："不要回应。"`,
                `【${sysName}】你在古老的图书馆里发现了一本不可名状之书，系统警告："合上它。立刻。"`,
                `【${sysName}】你的梦境中出现了不可名状的存在。系统："理智检定通过。这次。"`,
                `【${sysName}】你感觉有什么东西在暗处注视着你。系统平静道："别回头。继续走。"`,
                `【${sysName}】海边传来诡异的歌声，渔民们避之不及。系统："那不是风声。离海远点。"`,
                `【${sysName}】你在旧宅地下室发现了奇怪的符文。系统："拍照记录，不要触碰。千万不要。"`,
            ],
        };

        const pool = narratives[sysId];
        if (pool) {
            return pickRandom(pool);
        }

        // 通用系统叙事
        const generic = [
            `【${sysName}】系统正在运行中，一切正常。你的人生轨迹正在被系统记录。`,
            `【${sysName}】系统为你提供了一些额外的辅助。"继续前进吧。"`,
            `【${sysName}】"继续前进吧，我会在背后支持你。"系统的声音在脑海中回荡。`,
            `【${sysName}】系统记录了你最近的成长轨迹，并进行了一次全面评估。`,
        ];
        return pickRandom(generic);
    }

    _generateRouteFollowupEvent(age, props) {
        if (!this._storyFlags || this._storyFlags.size === 0) return null;
        if (Math.random() > 0.32) return null;

        const routeNarratives = [];
        if (this._storyFlags.has('route:study') && age >= 15) {
            routeNarratives.push('你过去埋头苦读的积累开始兑现，遇到复杂问题时总能比别人更快抓住重点。');
        }
        if (this._storyFlags.has('route:social') && age >= 15) {
            routeNarratives.push('你以前经营下来的人脉在关键时刻起了作用，一句招呼就换来了新的机会。');
        }
        if (this._storyFlags.has('route:startup') && age >= 22) {
            routeNarratives.push('你早年赌上的创业路线开始反噬也开始回报，每一步都比普通人更刺激。');
        }
        if (this._storyFlags.has('route:family') && age >= 30) {
            routeNarratives.push('你选择家庭优先的决定正在悄悄改变你的人生底色，很多冲动都被温柔地化解了。');
        }
        if (this._storyFlags.has('cultivation:breakthrough')) {
            routeNarratives.push('破境留下的余波仍在体内翻涌，你比过去更接近真正的修行者了。');
        }
        if (this._storyFlags.has('tycoon:aggressive')) {
            routeNarratives.push('高风险布局让你的资产曲线像过山车，但也让你拥有了别人不敢想的上限。');
        }
        if (this._storyFlags.has('villain:scheme')) {
            routeNarratives.push('你曾压下怒火布下的局开始发酵，那些轻视你的人逐渐发现不对劲了。');
        }
        if (this._storyFlags.has('checkin:stack')) {
            routeNarratives.push('你积攒下来的运气开始连锁触发，一连串的小概率好事砸到了你头上。');
        }

        return routeNarratives.length ? pickRandom(routeNarratives) : null;
    }

    /**
     * 生成属性随机波动
     */
    _generatePropertyFluctuation(age) {
        // 波动概率随年龄略有变化
        const chance = age < 18 ? 0.15 : (age < 50 ? 0.2 : 0.25);
        if (Math.random() > chance) return null;

        const isPositive = Math.random() < (age < 40 ? 0.6 : 0.4);
        const pool = isPositive ? POSITIVE_CHANGES : NEGATIVE_CHANGES;
        const eligible = pool.filter(c => checkCondition(c.condition, this._properties));

        if (eligible.length === 0) return null;
        return pickRandom(eligible);
    }

    /**
     * 生成动态任务
     */
    _generateTask(age) {
        const eligible = TASK_POOL.filter(tp =>
            age >= tp.ageRange[0] && age <= tp.ageRange[1]
        );
        const systemSpecific = this._buildSystemTaskGroups(age);
        const pool = [...eligible, ...systemSpecific];
        if (pool.length === 0) return null;

        const group = pickRandom(pool);
        if (!group || !group.tasks || group.tasks.length === 0) return null;

        return deepClone(pickRandom(group.tasks));
    }

    _buildSystemTaskGroups(age) {
        const systemId = this._system?.id;
        if (!systemId) return [];

        const groups = [];
        if (systemId === 'cultivation' && age >= 14) {
            groups.push({
                ageRange: [14, 90],
                tasks: [
                    {
                        title: '灵气失衡',
                        description: '你体内灵气翻涌，必须决定是冒险冲关还是暂避锋芒。',
                        choices: [
                            { text: '强行冲关', effect: { STR: 1, INT: 1, SPR: -1 }, result: '你冒险冲关，虽然心神震荡，但境界有所松动。', item: '破境灵砂', itemDesc: '辅助下次修行的稀有灵砂', itemRarity: 'rare', flags: ['cultivation:breakthrough'] },
                            { text: '闭关稳固', effect: { STR: 1, SPR: 1 }, result: '你压住躁动闭关修炼，根基反而更稳。', relationship: { name: '授业长老', delta: 8, event: '长老认为你心性可造' }, flags: ['cultivation:stable'] },
                        ],
                    }
                ],
            });
        }

        if (systemId === 'tycoon' && age >= 18) {
            groups.push({
                ageRange: [18, 90],
                tasks: [
                    {
                        title: '资本风口',
                        description: '系统推送一条高热度商业机会，你准备如何下注？',
                        choices: [
                            { text: '高杠杆追风口', effect: { MNY: 3, SPR: -1 }, result: '你把筹码压向风口，波动剧烈但收益上限大开。', item: '控股协议', itemDesc: '改变资产规模的关键协议', itemRarity: 'epic', flags: ['tycoon:aggressive'] },
                            { text: '做稳现金流项目', effect: { MNY: 2, STR: 1 }, result: '你没赌极限收益，而是搭出一套更健康的商业现金流。', relationship: { name: '金牌客户', delta: 12, event: '你拿下了长期合作客户' }, flags: ['tycoon:steady'] },
                        ],
                    }
                ],
            });
        }

        if (systemId === 'villain' && age >= 15) {
            groups.push({
                ageRange: [15, 90],
                tasks: [
                    {
                        title: '打脸时刻',
                        description: '有人当众质疑你只是运气好，这口气你准备怎么出？',
                        choices: [
                            { text: '先忍住，暗中布局', effect: { INT: 2, SPR: 1 }, result: '你忍住火气，开始布局更大的回击。', relationship: { name: '宿敌韩岳', delta: -15, event: '你和韩岳的梁子彻底结下' }, flags: ['villain:scheme'] },
                            { text: '当场反击，直接踩回去', effect: { CHR: 1, STR: 1 }, result: '你毫不留情地反击，对方当场下不来台。', relationship: { name: '围观者', delta: 8, event: '越来越多人开始惧怕你的锋芒' }, flags: ['villain:dominant'] },
                        ],
                    }
                ],
            });
        }

        if (systemId === 'signin' && age >= 12) {
            groups.push({
                ageRange: [12, 90],
                tasks: [
                    {
                        title: '暴击签到',
                        description: '签到系统触发稀有暴击，你要现在领取，还是累积到未来？',
                        choices: [
                            { text: '立刻领取', effect: { MNY: 1, SPR: 1, STR: 1 }, result: '你把暴击奖励立刻变现，眼前状态明显变好。', item: '暴击签到礼包', itemDesc: '签到系统送来的好运包', itemRarity: 'rare', flags: ['checkin:cashout'] },
                            { text: '继续累计', effect: { INT: 1, SPR: 1 }, result: '你选择把好运压进未来，希望换来更大的爆发。', milestone: '签到路线开始累计大奖概率', flags: ['checkin:stack'] },
                        ],
                    }
                ],
            });
        }

        return groups;
    }

    /**
     * 死亡判定
     */
    /**
     * v3.0 Random encounter generation
     * Returns an encounter object with choices, or null
     */
    _generateRandomEncounter(age) {
        if (age < 5) return null;
        if (Math.random() > 0.15) return null;

        const encounters = [];

        if (age >= 5 && age <= 15) {
            encounters.push({
                title: '🎁 神秘的礼物',
                description: '你在路边发现了一个闪着微光的盒子，要打开吗？',
                choices: [
                    { text: '好奇打开', effect: { SPR: 1, INT: 1 }, result: '盒子里是一本有趣的书，你看得入了迷。' },
                    { text: '交给大人', effect: { SPR: 1, CHR: 1 }, result: '大人夸你是个好孩子，奖励了你一颗糖。' },
                ],
            });
        }

        if (age >= 16 && age <= 30) {
            encounters.push({
                title: '🌟 偶遇贵人',
                description: '一位气质不凡的陌生人突然对你说："年轻人，我看你骨骼惊奇..."',
                choices: [
                    { text: '洗耳恭听', effect: { INT: 2 }, result: '对方给了你一条改变思维的建议，你若有所悟。' },
                    { text: '礼貌婉拒', effect: { SPR: 1 }, result: '你客气地谢绝了，继续自己的路。' },
                ],
            });
            encounters.push({
                title: '💰 投资机遇',
                description: '一个看起来很靠谱的项目摆在你面前，需要一笔小投资。',
                choices: [
                    { text: '果断投入', effect: { MNY: 2, SPR: -1 }, result: '你下了注，回报丰厚！' },
                    { text: '谨慎观望', effect: { SPR: 1 }, result: '你选择保守，虽然错过了但也避开了风险。' },
                    { text: '深入调查', effect: { INT: 1, MNY: 1 }, result: '你仔细研究后做了精准投资，稳赚不赔。' },
                ],
            });
        }

        if (age >= 30 && age <= 60) {
            encounters.push({
                title: '🤝 合作邀请',
                description: '一位老朋友找到你，想一起做一个大项目。',
                choices: [
                    { text: '全力以赴', effect: { MNY: 2, INT: 1, STR: -1 }, result: '项目成功了！你们都获得了丰厚的回报。' },
                    { text: '量力而行', effect: { MNY: 1, SPR: 1 }, result: '你参与了部分工作，收益和压力都适中。' },
                    { text: '婉言谢绝', effect: { SPR: 1 }, result: '你选择了安稳，朋友表示理解。' },
                ],
            });
        }

        if (age >= 50) {
            encounters.push({
                title: '📖 人生感悟',
                description: '在一个安静的午后，你突然对人生有了新的感悟。',
                choices: [
                    { text: '写下这份感悟', effect: { INT: 1, SPR: 2 }, result: '你把这些思考记录了下来，内心感到前所未有的平静。' },
                    { text: '与家人分享', effect: { CHR: 1, SPR: 1 }, result: '家人认真听着你的故事，眼里满是温暖。' },
                ],
            });
        }

        if (encounters.length === 0) return null;
        return encounters[Math.floor(Math.random() * encounters.length)];
    }

    /**
     * v3.0 Get achievements based on current game state
     */
    getAchievements() {
        const props = this._properties;
        const age = this._age;
        return [
            { id: 'first_step', name: '初来乍到', unlocked: age >= 0, icon: '👶' },
            { id: 'school', name: '入学典礼', unlocked: age >= 6, icon: '🎒' },
            { id: 'adult', name: '成年礼', unlocked: age >= 18, icon: '🎓' },
            { id: 'midlife', name: '而立之年', unlocked: age >= 30, icon: '🏠' },
            { id: 'senior', name: '知天命', unlocked: age >= 50, icon: '📚' },
            { id: 'elder', name: '古稀之年', unlocked: age >= 70, icon: '🌅' },
            { id: 'centenarian', name: '期颐之年', unlocked: age >= 100, icon: '💯' },
            { id: 'strong_body', name: '体魄强健', unlocked: (props.STR || 0) >= 8, icon: '💪' },
            { id: 'genius', name: '聪慧过人', unlocked: (props.INT || 0) >= 8, icon: '🧠' },
            { id: 'wealthy', name: '腰缠万贯', unlocked: (props.MNY || 0) >= 8, icon: '💰' },
        ];
    }

    _checkDeath(age) {
        const props = this._properties;
        const custom = this._customStats;

        // 体质归零：因病去世
        if (props.STR <= 0) {
            return { isDead: true, reason: 'health' };
        }

        // 快乐归零：绝望而终
        if (props.SPR <= 0) {
            return { isDead: true, reason: 'despair' };
        }

        if (typeof custom.sanity === 'number' && custom.sanity <= 0) {
            return { isDead: true, reason: 'madness' };
        }

        if (typeof custom.survival === 'number' && custom.survival <= 0) {
            return { isDead: true, reason: 'apocalypse' };
        }

        const effectiveLifespan = typeof custom.lifespan === 'number'
            ? Math.max(this._naturalLifespan, custom.lifespan)
            : this._naturalLifespan;

        // 超过自然寿命上限
        if (age > effectiveLifespan) {
            return { isDead: true, reason: 'oldAge' };
        }

        // 超过 60 岁后，随年龄增长的随机死亡概率
        if (age > 60) {
            const yearsOver = age - 60;
            const deathChance = yearsOver * 0.008; // 每超一年增加 0.8% 概率
            if (Math.random() < deathChance) {
                return { isDead: true, reason: age > 90 ? 'oldAge' : 'random' };
            }
        }

        // v3.0 Enhanced death reasons based on life
        if (age > 80) {
            if (Math.random() < 0.02 && props.MNY >= 8) {
                return { isDead: true, reason: 'wealth' };
            }
            if (Math.random() < 0.02 && props.INT >= 8) {
                return { isDead: true, reason: 'glory' };
            }
            if (Math.random() < 0.03 && props.SPR >= 6) {
                return { isDead: true, reason: 'peace' };
            }
        }

        return { isDead: false, reason: null };
    }

    /**
     * 本地生成人生传记（AI 不可用时的兜底方案）
     */
    _generateLocalBiography(lifeData, rating) {
        const { age, properties, talents, deathReason, system, customStats = [] } = lifeData;
        const props = properties;
        const lines = [];

        // 开头
        lines.push(`这是一段${rating.title}。`);
        lines.push('');

        // 天赋描述
        if (talents && talents.length > 0) {
            lines.push(`出生时带有天赋「${talents.join('」「')}」，为这段人生增添了不少色彩。`);
        } else {
            lines.push('没有任何先天天赋的加持，一切全凭自己的努力。');
        }

        // 属性总结
        const highProps = Object.entries(PROPERTIES)
            .filter(([key]) => (props[key] || 0) >= 7)
            .map(([key, cfg]) => `${cfg.icon}${cfg.name}(${props[key]})`);

        const lowProps = Object.entries(PROPERTIES)
            .filter(([key]) => (props[key] || 0) <= 3)
            .map(([key, cfg]) => `${cfg.icon}${cfg.name}(${props[key]})`);

        if (highProps.length > 0) {
            lines.push(`在 ${highProps.join('、')} 方面表现出色。`);
        }
        if (lowProps.length > 0) {
            lines.push(`但 ${lowProps.join('、')} 一直是短板。`);
        }

        if (system?.name) {
            lines.push(`这一生始终与「${system.name}」相伴。`);
        }

        const notableCustomStats = customStats
            .filter((stat) => (stat.current ?? stat.initial ?? 0) > (stat.initial ?? 0))
            .slice(0, 3)
            .map((stat) => `${stat.icon || '✨'}${stat.name} ${stat.current ?? stat.initial ?? 0}`);

        if (notableCustomStats.length > 0) {
            lines.push(`系统成长轨迹：${notableCustomStats.join('、')}。`);
        }

        lines.push('');

        // 人生阶段描述
        if (age >= 18) {
            lines.push('度过了充满回忆的校园时光。');
        }
        if (age >= 30) {
            lines.push('在社会中摸爬滚打，积累了不少人生经验。');
        }
        if (age >= 50) {
            lines.push('步入中年后，开始更多地思考人生的意义。');
        }
        if (age >= 70) {
            lines.push('晚年的时光虽然平淡，却也温馨。');
        }

        lines.push('');

        // 关键事件回顾
        const importantEvents = this._lifeEvents
            .flatMap(y => y.events.filter(e => e.importance >= 3).map(e => ({ age: y.age, text: e.text })))
            .slice(0, 5);

        if (importantEvents.length > 0) {
            lines.push('人生中的重要时刻：');
            for (const ie of importantEvents) {
                lines.push(`  ${ie.age}岁 —— ${ie.text}`);
            }
            lines.push('');
        }

        // 死因
        if (deathReason) {
            lines.push(getDeathReasonText(deathReason));
        }

        // 结语
        lines.push('');
        lines.push(`享年 ${age} 岁。${rating.emoji} ${rating.description}`);

        return lines.join('\n');
    }
}

// ═══════════════════════════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════════════════════════

export const gameEngine = new GameEngine();
export { TALENT_POOL, PROPERTIES, GRADE_WEIGHTS, GRADE_COLORS, PHASE, LIFE_RATINGS };
