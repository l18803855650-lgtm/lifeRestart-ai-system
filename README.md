# lifeRestart AI System

最新版仓库只保留当前可交付主线：

- `public/`：唯一前端源码
- `android-offline/`：Android WebView 离线壳
- `dist/`：前端构建产物（自动生成，不入库）

旧的 Laya / `src/` / xlsx 数据转换 / Jekyll 包装层已移除，不再作为现行代码路径。

## 项目定位

这是一个 **AI 系统流人生模拟器**：

- BYOK（用户自行填写模型 API Key）
- 本地规则兜底，没 Key 也能玩
- 多伴生系统玩法
- 聊天终端、任务分支、自动/手动存档
- Android APK 可直接打包交付

## 当前目录结构

```text
.
├── public/                 # 现行 Web 前端源码
│   ├── index.html
│   ├── css/style.css
│   └── js/
├── android-offline/        # Android 离线壳工程
├── .github/workflows/      # GitHub Pages 发布
├── BUILD_INSTRUCTIONS.md   # 构建说明
├── package.json
└── vite.config.js
```

## 本地开发

```bash
pnpm install
pnpm dev
```

默认开发地址：<http://localhost:5173>

## 前端构建

```bash
pnpm build
```

输出目录：`dist/`

## Android APK 构建

```bash
pnpm build
cd android-offline
./gradlew assembleDebug
```

APK 输出：

```text
android-offline/app/build/outputs/apk/debug/app-debug.apk
```

## GitHub Pages 发布

推送 `main` 后，GitHub Actions 会自动：

1. `pnpm install --frozen-lockfile`
2. `pnpm build`
3. 发布 `dist/`

## 现行开发约定

- 只改 `public/` 里的前端源码
- 不再恢复旧 `src/` / `laya/` / `template/` 链路
- Android 壳只消费 `dist/`
- GitHub Pages 只发布 `dist/`

如果要继续加功能，直接在这条主线上做，不再分叉第二套前端。
