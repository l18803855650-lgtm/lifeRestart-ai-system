# AI 系统流人生模拟器

## 项目概述

基于现有 lifeRestart 项目开发的增强版安卓游戏，集成了 AI 驱动的系统流玩法，实现了"本地规则 + AI"混合引擎，确保在无网络或 API Key 的情况下仍可正常游玩。

## 核心特性

### 1. BYOK（自带 API Key）零成本模式
- 用户自行填写大模型 API Key
- 默认支持 OpenAI-compatible chat/completions 接口
- 可配置 base URL / model
- API Key 仅保存在用户设备本地

### 2. 混合引擎架构
- **本地规则兜底**：确保无 Key、接口失败、超时等情况可继续游戏
- **AI 增强**：有 Key 时调用模型生成专属年度事件
- **智能降级**：AI 失败时自动切换到本地规则

### 3. 系统流玩法
- **修仙系统**：呼吸吐纳、境界突破、一步步卷成修仙爽文
- **神豪系统**：花钱返利、越消费越富、典型神豪文路线
- **反派系统**：打脸、截胡、收小弟的反派流
- **签到系统**：靠签到滚雪球、越活越肥的稳健爽文流

### 4. 第四面墙互动
- 提供聊天终端，玩家可直接与"系统"对话
- 系统按人设回复，支持受控地修改底层状态
- 支持多种快捷操作：系统播报、下一步建议、锐评这局、总结复盘

### 5. 动态数值面板
- 不同系统可定义额外属性（灵力/悟性/SAN 等）
- UI 根据 schema 动态渲染
- 支持自定义属性分类和样式

### 6. 记忆管理系统
- 记录关键事件/道具/NPC 关系
- 每 10 年生成记忆摘要
- 提供 AI 上下文支持，节省 token

### 7. 系统分享码生态
- 可序列化/导入导出的系统配置
- 支持本地复制粘贴分享
- 预留后续在线分享功能接口

## 技术架构

### 分层结构
```
src/
├── engine/           # 游戏引擎层
│   └── localRuleEngine.js  # 本地规则兜底引擎
├── domain/           # 领域模型层
│   ├── systemShareSchema.js    # 系统分享码 schema
│   ├── dynamicStatsManager.js  # 动态数值管理
│   └── memoryManager.js        # 记忆管理系统
├── ai/              # AI 集成层
│   ├── systemAssistant.js       # 系统助手主逻辑
│   ├── systemPrompt.js         # 系统提示词
│   ├── nativeMiniMax.js        # MiniMax 直连桥
│   └── formatTrajectoryLines.js # 轨迹格式化
└── ui/              # UI 层
    └── themes/
```

### 关键设计模式
- **混合模式**：AI 优先 + 本地兜底
- **策略模式**：不同系统类型有不同的玩法策略
- **观察者模式**：UI 响应状态变化
- **缓存策略**：本地结果缓存，减少 AI 调用

## 构建和部署

### 环境要求
- Node.js 16+
- Android SDK 35
- Gradle 8.5+

### 构建前端
```bash
npm install
npm run build
```

### 构建 Android APK
```bash
cd android-offline
./gradlew assembleDebug
```

### APK 输出路径
```
android-offline/app/build/outputs/apk/debug/app-debug.apk
```

### 发布版构建
```bash
./gradlew assembleRelease
```

## 使用指南

### 1. 初始设置
1. 安装 APK 到 Android 设备
2. 首次运行进入游戏
3. 点击右下角"系统AI"按钮

### 2. API 配置
1. 在系统AI界面点击"设置"
2. 填入你的 API Key（OpenAI-compatible）
3. 可选：自定义 Base URL 和 Model
4. 保存设置

### 3. 开始游戏
1. 经典十连抽天赋
2. 分配四大基础属性（颜值/智力/体质/家境）
3. 选择伴生系统（修仙/神豪/反派/签到）
4. 开始人生推演

### 4. 系统互动
- **自动播报**：年度推进时系统自动播报重要事件
- **主动对话**：点击"系统AI"按钮，输入文字与系统对话
- **快捷操作**：使用系统播报、下一步建议、锐评等快捷按钮

### 5. 年度推演
- 点击"下一年"进行年度推进
- 系统根据属性、物品、关系、系统人设生成专属事件
- 遇到系统任务时需要做出选择
- 选择结果影响属性/存活/道具/关系

### 6. 结算分享
- 死亡或寿终正寝后生成人物传记
- 查看最终战报页
- 支持分享系统配置和记忆

## 配置说明

### API Key 配置
支持以下 OpenAI-compatible 接口：
- OpenAI 官方 API
- MiniMax API
- Azure OpenAI
- 其他兼容 OpenAI 格式的接口

### Base URL 配置
```javascript
// OpenAI
https://api.openai.com/v1

// MiniMax
https://api.minimaxi.com/v1

// 本地服务
http://localhost:8080/v1
```

### Model 配置
- OpenAI: `gpt-4`, `gpt-3.5-turbo`
- MiniMax: `MiniMax-M2.7-highspeed`, `MiniMax-Pro`
- 其他：根据具体服务商选择

## 扩展开发

### 1. 添加新系统
在 `src/data/systems.js` 中定义新系统：
```javascript
{
  id: "new-system",
  name: "新系统",
  description: "系统描述",
  theme: "主题",
  grade: 2,
  weights: { base: 1, CHR: 0.5, INT: 0.5, STR: 0.5, MNY: 0.5 },
  abilities: { /* 能力定义 */ },
  milestones: [ /* 里程碑定义 */ ]
}
```

### 2. 扩展动态属性
注册系统的额外属性 schema：
```javascript
import { dynamicStatsManager } from './src/domain/dynamicStatsManager.js';

dynamicStatsManager.registerSystemSchema('my-system', {
  stats: ['custom_stat_1', 'custom_stat_2'],
  definitions: {
    custom_stat_1: {
      label: '自定义属性1',
      type: 'number',
      defaultValue: 10,
      min: 0,
      max: 100,
      icon: '🎯',
      color: '#ff6b6b',
      description: '属性描述',
      category: '自定义'
    }
  }
});
```

### 3. 集成新 AI Provider
实现 AI provider 接口：
```javascript
{
  name: 'new-provider',
  call: async (messages, config) => { /* API 调用 */ },
  formatResponse: (response) => { /* 格式化 */ }
}
```

## 故障排除

### 1. APK 无法安装
- 检查 Android 版本（最低要求：Android 8.0+）
- 清除旧版本数据后重新安装

### 2. AI 无响应
- 检查 API Key 是否正确
- 验证 Base URL 是否可访问
- 查看网络连接状态
- 尝试使用本地规则兜底

### 3. 游戏卡顿
- 清理 WebView 缓存
- 重启应用
- 检查设备存储空间

### 4. 系统对话无内容
- 确认已开始一局人生
- 检查是否绑定了系统
- 尝试使用本地规则模式

## 性能优化

### 内存管理
- WebView 资源自动回收
- 记忆数据定期清理
- 本地规则结果缓存

### 网络优化
- 请求超时设置（30秒）
- 响应大小限制
- 错误自动重试机制

### 电池优化
- 静态资源预加载
- 减少不必要的网络请求
- 后台任务限制

## 安全性

### 数据安全
- API Key 本地存储加密
- 不收集用户数据
- 网络传输 HTTPS 加密

### 隐私保护
- 无第三方统计
- 无广告跟踪
- 无设备标识符

## 版本历史

### v2.0.0-system-ai (2026-04-13)
- ✅ 实现 BYOK 零成本模式
- ✅ 添加混合引擎（本地规则 + AI）
- ✅ 增强系统流玩法
- ✅ 实现第四面墙互动聊天终端
- ✅ 添加动态数值面板
- ✅ 完善记忆管理系统
- ✅ 设计系统分享码 schema
- ✅ 优化 Android WebView 稳定性
- ✅ 完善错误处理和降级机制

### v1.1.0-online-creator
- 初代 WebView 封装版本

## 贡献指南

### 代码规范
- 遵循现有代码风格
- 添加适当注释
- 保持向后兼容性

### 提交流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

### 问题反馈
- 使用 GitHub Issues 报告 Bug
- 提供详细的复现步骤
- 包含设备和系统版本信息

## 许可证

基于原 lifeRestart 项目许可证保持一致。

## 致谢

感谢原 lifeRestart 项目的所有贡献者。
感谢 AI 技术为本项目带来的创新可能。

---

**享受你的系统流人生之旅！** 🚀