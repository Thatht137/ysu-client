# ysu-client

> [English](README.md) | [中文](README.zh-CN.md)

> **燕大终端** — 燕山大学网上系统的第三方 Web 客户端。

基于 Next.js 16 + React 19 + shadcn/ui 构建，以 [`ysu-api`](../ysu-api) 为后端，
提供 CAS 登录、教务查询与一键评教等功能。目前覆盖的范围是教务系统；命名留出余量，
后续接入其他校园系统（图书馆、一卡通等）时无需更名。

> ⚠️ **第三方客户端，与燕山大学官方无任何关联。** 仅供个人学习交流，使用即默认了解并
> 接受相关风险，请勿用于侵犯他人权益或违反学校规定的场景。

## 功能

- **认证**：CAS 登录，自动处理图形验证码与 SMS / cpdaily MFA；可选「记住密码」。
- **总览**：当前教学周、今日课程（按节次时间高亮当前 / 已过课程）、待考考试、绩点速览。
- **成绩**：按学期 / 课程名筛选，单门成绩可下钻至**教学班 / 全课程**两个维度的
  统计、等级分布与个人排名。
- **学分绩点**：必修 / 选修 / 学位课各项学分与初始 / 最高绩点。
- **课表**：理论课表 + 实验选课合并显示，按周次切换，处理重叠课程。
- **考试**：按学期查询，区分未完成 / 已完成。
- **培养方案**：课程列表 + 学业完成情况 + 学业预警。
- **评教**：单选 / 多选 / 填空题；一键最高分自动填写；**批量评教**支持选择多条任务，
  自动填写 → 预检得分 → 二次确认 → 批量提交，可中途中断。
- **体验**：i18n（中 / 英）、深 / 浅 / 跟随系统主题（按 `d` 切换）、桌面 + 移动端
  响应式布局、24h 本地缓存（基于 `localStorage`）以加速二次加载。

## 技术栈

| 类型 | 选用 |
| --- | --- |
| 框架 | Next.js 16（App Router，Turbopack） |
| 视图 | React 19 + TypeScript 5.9 |
| UI | shadcn/ui（nova preset） + Tailwind CSS v4 |
| 状态 | Zustand（含 `persist` 中间件） |
| 主题 | next-themes |
| 提示 | sonner |
| 抽屉 / 弹层 | radix-ui、vaul |
| 图标 | lucide-react |

## 安装

需要 Node.js ≥ 20。任选一种包管理器即可：

```bash
npm install
# 或
pnpm install
```

## 启动

```bash
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # 生产构建
npm run start        # 启动生产构建
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint
npm run format       # Prettier 格式化
```

### 环境变量

复制 `.env.example` 为 `.env.local`（本地开发）或 `.env`（生产部署）后按需修改：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:11920` | [`ysu-api`](../ysu-api) 后端基地址；带 `NEXT_PUBLIC_` 前缀的变量会被打包进客户端 bundle |

部署到其他主机时，请将该地址改为可被浏览器直接访问的 URL。

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
    └── me/                 # 「我的」（移动端入口）
components/
├── ui/                     # shadcn/ui 原语
├── mobile-bottom-nav.tsx   # 移动端底部导航
├── mobile-top-bar.tsx      # 移动端顶部栏（动态右侧 slot）
├── refresh-indicator.tsx   # 二次加载时的刷新动画
├── responsive-modal.tsx    # 桌面 Dialog / 移动 Drawer 自适应
└── theme-provider.tsx      # next-themes 包装，支持按 `d` 切换
hooks/
└── use-mobile.ts           # 媒体查询断点
lib/
├── api.ts                  # ysu-api fetch 客户端
├── auth-store.ts           # 鉴权 zustand store（持久化到 localStorage）
├── cache.ts                # 24h TTL 本地缓存
├── mobile-header-store.ts  # 各页面向移动端顶栏注入右侧操作
├── refresh-store.ts        # 全局刷新状态
├── types.ts                # 与后端契约的 TypeScript 类型
└── i18n/                   # zh / en 字典 + Context + useTranslation
```

## 安全注意事项

- **凭据保护**：`credential` 等价于活动 CAS 会话 cookie，泄漏后第三方即可冒用账户。
  本客户端将其落盘到 `localStorage`，请勿在共享设备上启用「记住密码」。
- **记住密码**：勾选后，明文用户名与密码会写入 `localStorage` 的
  `ysu-login-remember` 键以便自动回填。考虑到 CAS 流程必须先重新认证，这是当前
  能给的便利上限；如有更高安全要求请勿勾选。
- **后端可信度**：`NEXT_PUBLIC_API_BASE` 指向的服务能拿到全部凭据。务必只接入
  自己掌控的 `ysu-api` 实例，且尽可能走 HTTPS。
- **CORS**：浏览器直连后端时，请在 `ysu-api` 通过 `YSU_API_CORS_ORIGINS`
  白名单当前域名。

## 协议与免责

本项目源代码默认按 MIT 协议开放（如仓库未单独附 `LICENSE` 文件，以本节为准）。
仓库与作者**不对**因使用该客户端造成的任何账户、数据、纪律或法律后果负责。
