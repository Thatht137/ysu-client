# YSU 教务系统前端

燕山大学统一身份认证与教务系统的 shadcn/ui 前端客户端。

## 技术栈

- Next.js 16 + React 19 + TypeScript
- shadcn/ui (nova preset)
- Tailwind CSS v4
- Zustand（状态管理）
- Lucide React（图标）

## 功能

- CAS 登录（支持验证码 + MFA）
- 学生基本信息
- 成绩查询（按学期/课程名筛选）
- 学分绩点统计
- 课表查询（周次筛选 + 重叠课程处理）
- 考试安排
- 培养方案
- 学业完成 / 学业预警
- 学生评教（单选/多选/填空 + 自动打满分 + 预检）

## 开发

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # 生产构建
npm run typecheck    # TypeScript 检查
```

## 配置

API 基地址默认指向 `http://localhost:11920`，可通过环境变量 `NEXT_PUBLIC_API_BASE` 修改。
