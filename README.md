<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="燕大终端图标" />
</p>

<h1 align="center">ysu-client</h1>

<p align="center">
  <a href="README.en.md">English</a> | <a href="README.md">中文</a>
</p>

> **燕大终端** — 燕山大学教务系统的第三方 Android 客户端。

基于 Next.js 16 + React 19 + shadcn/ui 构建，以 [`ysu-api`](../ysu-api) 为后端，
提供 CAS 登录、教务查询与一键评教等功能。通过 Capacitor 打包为 Android WebView 壳应用，
支持原生 HTTP 桥接与 OTA 热更新。

> **第三方客户端，与燕山大学官方无任何关联。** 仅供个人学习交流，使用即默认了解并
> 接受相关风险，请勿用于侵犯他人权益或违反学校规定的场景。

## 功能

- **CAS 认证**：登录时自动处理图形验证码与 SMS / cpdaily MFA。会话跨重启持久化
  （CASTGC 存入 localStorage，Android 端启动时恢复到原生 cookie store）。
- **总览**：当前教学周、今日课程（按节次时间高亮当前 / 已过课程）、待考考试、绩点速览。
- **成绩**：按学期 / 课程名筛选，单门成绩可下钻至教学班 / 全课程两个维度的
  统计、等级分布与个人排名。
- **学分绩点**：必修 / 选修 / 学位课各项学分与初始 / 最高绩点。
- **课表**：理论课表 + 实验选课合并显示，按周次切换，处理重叠课程。桌面 / 移动端双布局。
- **考试**：按学期查询，区分未完成 / 已完成。
- **培养方案**：课程列表 + 学业完成情况 + 学业预警。
- **评教**：单选 / 多选 / 填空题；一键最高分自动填写；**批量评教**支持选择多条任务，
  自动填写 → 预检得分 → 二次确认 → 批量提交，可中途中断。
- **Android 应用**：基于 Capacitor 的 WebView 壳应用，通过原生 HTTP 桥接绕过
  WebView fetch 限制，会话持久化，支持 @capgo/capacitor-updater OTA 热更新。
- **体验**：i18n（中 / 英）、深 / 浅 / 跟随系统主题（按 `d` 切换）、桌面 + 移动端
  响应式布局、24h 本地缓存（基于 `localStorage`）、数据过期提示。

## 技术栈

| 层 | 选用 |
| --- | --- |
| 框架 | Next.js 16（App Router，Turbopack，静态导出） |
| 视图 | React 19 + TypeScript 5.9 |
| UI | shadcn/ui（radix-nova preset） + Tailwind CSS v4 |
| 状态 | Zustand（含 `persist` 中间件） |
| 主题 | next-themes |
| 提示 | sonner |
| 抽屉 / 弹层 | radix-ui、vaul |
| 图标 | lucide-react |
| 移动端 | Capacitor 8（Android） |
| OTA 更新 | @capgo/capacitor-updater |

## 安装

需要 Node.js >= 20。任选一种包管理器即可：

```bash
npm install
# 或
pnpm install
```

## 启动

```bash
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # 生产构建（静态导出到 dist/）
npm run start        # 启动生产构建
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint
npm run format       # Prettier 格式化
```

### 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:11920` | [`ysu-api`](../ysu-api) 后端基地址 |

### Android 构建

```bash
npm run build        # 静态导出到 dist/
npx cap sync         # 同步 web 资源 + 插件到 android/
npx cap open android # 在 Android Studio 中打开
```

在 Android Studio 中：**Build > Build Bundle(s) / APK(s) > Build APK(s)**。

OTA 更新通过 `npm run release` 推送，该脚本会构建项目、创建带版本标签的 GitHub Release
并上传产物。

## 与后端的契约

ysu-client 假设后端是 [`ysu-api`](../ysu-api)，所有交互细节都收敛在 `lib/api.ts`：

- 凭据通过 `X-CAS-Credential` Header 透传，浏览器侧持久化到 `localStorage`
  键 `ysu-auth`（zustand persist）。
- 24 小时数据缓存写在 `localStorage` 键 `ysu-cache:*`，详见 `lib/cache.ts`。
- 错误模型沿用 ysu-api：通过响应中的 `code`（如 `NEED_CAPTCHA`、`MFA_REQUIRED`）
  分支处理，`detail` 直接展示给用户。

## 目录速览

```
app/
├── layout.tsx              # 根布局：i18n + 主题 + Tooltip + Toaster
├── page.tsx                # 入口重定向（已登录 → /dashboard，否则 → /login）
├── login/                  # CAS 登录 + MFA
└── dashboard/
    ├── layout.tsx          # 鉴权守卫、侧边栏 / 顶栏 / 底栏
    ├── page.tsx            # 总览
    ├── grades/             # 成绩 + 统计弹窗
    ├── gpa/                # 学分绩点
    ├── schedule/           # 课表（desktop / mobile 双视图 + 周次切换）
    ├── exams/              # 考试安排
    ├── training-plan/      # 培养方案
    ├── evaluation/         # 评教（单选 / 多选 / 填空 + 批量自动评教）
    ├── student/            # 学生信息（弹窗）
    ├── me/                 # 「我的」（移动端入口）
    └── about/              # 关于页面
components/
├── ui/                     # shadcn/ui 原语
├── mfa-modal.tsx           # MFA 验证弹窗
├── mobile-bottom-nav.tsx   # 移动端底部导航
├── mobile-top-bar.tsx      # 移动端顶部栏（动态右侧 slot）
├── refresh-indicator.tsx   # 二次加载时的刷新动画
├── responsive-modal.tsx    # 桌面 Dialog / 移动 Drawer 自适应
├── sdk-provider.tsx        # SDK 初始化（带水合守卫）
├── stale-indicator.tsx     # 数据过期提示
└── theme-provider.tsx      # next-themes 包装，支持按 `d` 切换
hooks/
└── use-mobile.ts           # 媒体查询断点
lib/
├── api.ts                  # ysu-api fetch 客户端（withJWXT wrapper）
├── auth-store.ts           # 鉴权 zustand store（持久化到 localStorage）
├── auto-login.ts           # 自动登录逻辑
├── cache.ts                # 24h TTL 本地缓存
├── cas.ts                  # CAS SSO：登录、验证码、MFA、TGC 持久化
├── cookie.ts               # RFC 6265 cookie jar + CapacitorHttp 桥接
├── jwxt.ts                 # JWXT 会话管理 + 自动重授权
├── mfa-modal-store.ts      # MFA 弹窗状态
├── mobile-header-store.ts  # 各页面向移动端顶栏注入右侧操作
├── platform.ts             # 平台检测（web / native）
├── refresh-store.ts        # 全局刷新状态
├── sdk.ts                  # SDK 初始化 / 持久化 / 重置
├── settings-store.ts       # 用户设置
├── types.ts                # 与后端契约的 TypeScript 类型
├── updater.ts              # Capacitor OTA 更新逻辑
├── utils.ts                # 通用工具（cn 等）
├── version.ts              # 版本显示逻辑
└── i18n/                   # zh / en 字典 + Context + useTranslation
android/                    # Capacitor Android 项目（Gradle）
scripts/
└── release.sh              # 构建 + GitHub Release 自动化
```

## 架构说明

### HTTP 层（`lib/cookie.ts`）

自定义 `SimpleCookieJar`（RFC 6265），配合 `fetchWithJar` 实现标准 fetch + cookie
管理。Android 端通过 `capacitorHttpSend()` 委托给 `CapacitorHttp.request()`，绕过
WebView 对 `cer.ysu.edu.cn` 的 fetch 限制。JS jar 与原生 cookie store 之间通过
`CapacitorCookies.setCookie()` 双向同步。

### 认证（`lib/cas.ts`）

完整的 CAS SSO 流程，支持验证码和 MFA。CASTGC token 持久化到 localStorage，
启动时恢复到原生 cookie store，会话可跨 App 重启存活。

### 会话持久化（`lib/sdk.ts`）

`initSDK()` 在 Zustand 水合完成后从持久化存储恢复 CAS 和 JWXT cookie。JWXT 会话在
API 调用成功后自动持久化，避免不必要的重新授权。

## 安全注意事项

- **凭据保护**：`credential` 等价于活动 CAS 会话 cookie，泄漏后第三方即可冒用账户。
  本客户端将其落盘到 `localStorage`，请勿在共享设备上启用「记住密码」。
- **记住密码**：勾选后，明文用户名与密码会写入 `localStorage` 的
  `ysu-login-remember` 键以便自动回填。如有更高安全要求请勿勾选。
- **后端可信度**：`NEXT_PUBLIC_API_BASE` 指向的服务能拿到全部凭据。务必只接入
  自己掌控的 `ysu-api` 实例，且尽可能走 HTTPS。
- **CORS**：浏览器直连后端时，请在 `ysu-api` 通过 `YSU_API_CORS_ORIGINS`
  白名单当前域名。

## 兼容性

Android 应用运行在系统 WebView 中。如遇渲染异常，请检查 WebView 版本是否过低——
**最低要求 Chromium v111**。可通过 Play Store 更新 Android System WebView。

## 协议与免责

本项目源代码默认按 MIT 协议开放（如仓库未单独附 `LICENSE` 文件，以本节为准）。
仓库与作者**不对**因使用该客户端造成的任何账户、数据、纪律或法律后果负责。
