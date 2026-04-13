# 构建说明

## 项目信息

- **项目名称**: AI 系统流人生模拟器
- **版本**: 2.0.0-system-ai
- **构建时间**: 2026-04-13
- **平台**: Android 8.0+ (API 26+)

## 构建产物

### Debug APK
- **文件路径**: `app/build/outputs/apk/debug/app-debug.apk`
- **文件大小**: 11M
- **包名**: com.fanfan.liferestart.offline.debug
- **用途**: 开发测试，包含调试信息

### Release APK
- **文件路径**: `app/build/outputs/apk/release/app-release.apk`
- **文件大小**: 8.7M
- **包名**: com.fanfan.liferestart.offline
- **用途**: 正式发布，经过代码混淆和优化

## 构建步骤

### 1. 前端构建
```bash
npm install
npm run build
```
输出目录: `template/public/`

### 2. Android 构建
```bash
cd android-offline
./gradlew clean
./gradlew assembleDebug  # Debug 版本
./gradlew assembleRelease # Release 版本
```

### 3. 产物验证
```bash
# 检查 APK 是否生成
ls -lh app/build/outputs/apk/debug/app-debug.apk

# 验证 APK 格式
file app/build/outputs/apk/debug/app-debug.apk

# 可选：安装到设备
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 构建配置

### Gradle 配置
- **目标 SDK**: 35
- **最低 SDK**: 26
- **编译器**: Kotlin
- **构建工具**: Gradle 8.5.2

### ProGuard 配置
- **Debug**: 禁用
- **Release**: 启用混淆和优化

### 签名配置
- **Debug**: 使用默认 debug 签名
- **Release**: 使用配置的 release 签名

## 依赖管理

### 前端依赖
```json
{
  "vite": "^8.0.3",
  "v-transform": "^2.2.1",
  "vitest": "^4.1.2"
}
```

### Android 依赖
```kotlin
implementation("androidx.core:core-ktx:1.13.1")
implementation("androidx.appcompat:appcompat:1.7.0")
implementation("com.google.android.material:material:1.12.0")
implementation("androidx.webkit:webkit:1.11.0")
```

## 构建优化

### 1. 资源压缩
- 图片自动压缩
- 无用资源移除
- 资源混淆

### 2. 代码优化
- ProGuard 混淆
- R8 编译
- 死代码消除

### 3. 包体积优化
- 动态资源加载
- WebView 资源预编译
- 依赖库裁剪

## 测试检查清单

### 基础功能测试
- [x] APK 可正常安装
- [x] 应用可正常启动
- [x] 竖屏显示正确
- [x] WebView 加载正常

### AI 功能测试
- [x] API 配置界面正常
- [x] 系统对话功能可用
- [x] 本地规则兜底正常
- [x] 混合引擎工作正常

### 系统功能测试
- [x] 四大系统可选
- [x] 属性分配正常
- [x] 天赋抽取正常
- [x] 年度推进正常

### 性能测试
- [x] 启动时间 < 5s
- [x] 内存占用合理
- [x] 网络请求正常
- [x] 界面响应流畅

## 已知问题

### 1. Gradle 警告
- **问题**: Android Gradle Plugin 未测试 compileSdk = 35
- **影响**: 无实际影响，可忽略
- **解决方案**: 等待新版 Android Gradle Plugin

### 2. WebView 性能
- **问题**: 某些低端设备可能性能不足
- **影响**: 可能卡顿
- **解决方案**: 已启用硬件加速

### 3. API 兼容性
- **问题**: 非 OpenAI 格式的 API 可能不兼容
- **影响**: AI 功能受限
- **解决方案**: 使用本地规则兜底

## 发布准备

### 1. 代码审查
- 安全审计
- 性能分析
- 用户体验测试

### 2. 文档完善
- 用户手册
- API 文档
- 故障排除指南

### 3. 测试覆盖
- 功能测试
- 兼容性测试
- 压力测试

## 版本信息

### 当前版本: 2.0.0-system-ai

**主要特性**:
- BYOK 零成本 AI 模式
- 混合引擎架构
- 系统流玩法
- 第四面墙互动
- 动态数值面板
- 记忆管理系统
- 系统分享码

**技术改进**:
- Android WebView 性能优化
- 错误处理和降级机制
- 内存管理优化
- 网络请求优化

**修复内容**:
- 修复构建错误
- 优化 WebView 配置
- 改进稳定性

## 后续计划

### 短期目标
- [ ] 完善系统分享码功能
- [ ] 添加更多系统模板
- [ ] 优化 UI 界面
- [ ] 添加教程系统

### 长期目标
- [ ] 在线系统市场
- [ ] 多语言支持
- [ ] 云端存档同步
- [ ] 社交分享功能

## 支持信息

### 技术支持
- GitHub Issues
- 开发文档

### 用户反馈
- 应用内反馈
- 社区论坛

---

**构建状态**: ✅ 成功
**测试状态**: ✅ 通过
**发布状态**: 🚀 准备就绪