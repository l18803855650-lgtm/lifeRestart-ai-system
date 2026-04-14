# 构建说明

## 当前有效构建链路

最新版只保留这一条：

```text
public/ -> vite build -> dist/ -> android-offline / GitHub Pages
```

不再使用：

- `src/`
- `laya/`
- `data/**/*.xlsx -> xlsx2json`
- `template/` Jekyll 包装页

## 环境要求

- Node.js 22+（建议）
- pnpm 10+
- Android SDK 35
- Java 17

## 1. 安装依赖

```bash
pnpm install
```

## 2. 构建前端

```bash
pnpm build
```

输出目录：`dist/`

## 3. 构建 Android APK

```bash
cd android-offline
./gradlew assembleDebug
```

Debug APK 输出：

```text
app/build/outputs/apk/debug/app-debug.apk
```

## 4. 本地预览

```bash
pnpm start
```

## 5. 典型开发流程

```bash
pnpm install
pnpm dev
pnpm build
cd android-offline && ./gradlew assembleDebug
```

## GitHub Pages

工作流位于：`.github/workflows/deploy.yml`

推送 `main` 后自动：

```bash
pnpm install --frozen-lockfile
pnpm build
```

并将 `dist/` 发布到 Pages。

## 交付前最少验收

- `pnpm build` 通过
- `cd android-offline && ./gradlew assembleDebug` 通过
- 首页“开始新人生”可进入下一步
- APK 能正常安装启动
