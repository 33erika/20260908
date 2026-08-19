# AGENTS.md - 法务工作台 (WorkBuddy)

## 项目概览

法务工作台是面向法务团队内部的协作工具，提供法务导航、待办任务管理、法务事项跟踪、数据汇总等功能。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (邮箱登录)

## 目录结构

```
├── src/
│   ├── app/                    # 页面路由
│   │   ├── api/                # API 路由
│   │   │   ├── auth/me/        # 当前用户信息
│   │   │   ├── nav/            # 导航管理
│   │   │   ├── tasks/          # 任务 CRUD
│   │   │   ├── cases/          # 法务事项 CRUD
│   │   │   ├── case-types/     # 事项类型配置
│   │   │   ├── dashboard/      # 数据汇总
│   │   │   ├── search/         # 全局搜索
│   │   │   ├── recycle/        # 回收站
│   │   │   ├── operation-logs/ # 操作记录
│   │   │   ├── documents/      # 文档关联
│   │   │   ├── case-deadlines/ # 法律期限管理
│   │   │   ├── case-progress/  # 案件进展时间线
│   │   │   ├── reminder-rules/ # 提醒规则配置
│   │   │   ├── smart-input/    # 智能录入（parse/match/import）
│   │   │   └── profiles/       # 用户管理
│   │   ├── login/              # 登录页
│   │   ├── links/              # 法务导航页
│   │   ├── todos/              # 待办与提醒页
│   │   ├── cases/              # 法务事项页
│   │   ├── smart-input/        # 智能录入页
│   │   ├── dashboard/          # 数据汇总页
│   │   ├── search/             # 搜索页
│   │   ├── recycle/            # 回收站页
│   │   └── settings/           # 系统设置页
│   ├── components/             # 共享组件
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── app-shell.tsx       # 应用外壳
│   │   └── sidebar.tsx         # 侧边栏导航
│   ├── lib/                    # 工具库
│   │   ├── utils.ts            # 通用工具
│   │   ├── auth-context.tsx    # 认证上下文
│   │   ├── api-auth.ts         # API 认证辅助
│   │   └── supabase-*.ts       # Supabase 客户端
│   ├── hooks/                  # 自定义 Hooks
│   │   └── use-api.ts          # API 请求 Hook
│   ├── storage/database/       # 数据库层
│   │   ├── shared/schema.ts    # Drizzle Schema
│   │   └── supabase-client.ts  # Supabase 客户端
│   └── middleware.ts           # 认证中间件
```

## 核心数据模型

- **profiles**: 用户档案
- **nav_categories / nav_links**: 法务导航
- **case_types / case_type_fields / case_stages**: 事项类型配置（含自定义字段和阶段）
- **cases**: 法务事项
- **case_field_values**: 自定义字段值
- **tasks**: 任务（每日提醒/定期任务/临时任务）
- **case_documents**: 文档关联（钉钉文档链接）
- **case_deadlines**: 法律期限（答辩期、举证期、上诉期等）
- **case_progress**: 案件进展时间线
- **reminder_rules**: 提醒规则配置
- **operation_logs**: 操作记录
- **recycle_bin**: 回收站

## 开发命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动开发服务
pnpm build          # 构建生产版本
pnpm start          # 启动生产服务
```

## 认证说明

- 使用 Supabase Auth 邮箱登录
- 前端通过 `x-session` header 传递 access_token
- 后端通过 `verifyAuth()` 验证 token
- 中间件保护需登录的路由

## 注意事项

- 所有删除操作为软删除（设置 deleted_at），数据进入回收站
- 事项与任务是一对多关系
- 自定义字段通过 case_type_fields + case_field_values 实现
- 搜索使用 PostgreSQL ILIKE 模糊匹配
