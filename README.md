# Sidereus - AI 智能招聘系统

Sidereus 是一个基于 pnpm monorepo 的全栈招聘系统，围绕“简历上传 -> AI 提取 -> JD 配置 -> 智能评分 -> 候选人管理”构建一条完整招聘工作流。项目当前包含前端控制台、后端 API、PostgreSQL 数据存储，以及前后端共享类型包。

## 项目架构说明

### 整体架构

```mermaid
flowchart LR
  U[浏览器] --> W[apps/web\nReact + Vite]
  W -->|REST| A[apps/api\nExpress + TypeScript]
  W -->|SSE| A
  A --> D[(PostgreSQL)]
  A --> F[uploads/\nPDF 文件]
  A --> M[DeepSeek API]
  S[packages/shared\n共享类型] --> W
  S --> A
```

- 前端 `apps/web` 负责招聘运营工作台，包括上传入口、候选人列表、详情面板、JD 管理和评分可视化。
- 后端 `apps/api` 负责文件上传、PDF 解析、AI 结构化提取、评分计算、状态流转和数据持久化。
- `packages/shared` 维护前后端共享的数据结构，减少接口字段漂移和联调成本。
- PostgreSQL 同时保存业务表和结构化简历 JSON，适合当前快速迭代阶段。
- 前后端通过 REST 处理常规 CRUD，通过 SSE 推送简历提取进度和分段结果。

### 目录结构

```txt
apps/
  api/        Express API、文件上传、PDF 解析、AI 提取、评分逻辑
  web/        React 前端控制台
packages/
  shared/     前后端共享类型定义
docs/
  superpowers/plans  过程文档与计划
  superpowers/specs  需求与设计说明
test-data/
  resumes/    测试简历样本
```

### 关键运行链路

1. 用户在前端上传 PDF 简历，文件经 `multer` 落盘到后端 `uploads` 目录。
2. 后端使用 `pdf-parse` 读取文本，并做基础清洗与文件名归一化。
3. 简历原文、清洗后文本和元数据写入 PostgreSQL；结构化字段初始为空。
4. 用户在候选人详情页触发 AI 提取时，后端按模块调用 DeepSeek，并通过 SSE 流式回传进度与分段结果。
5. 用户可在前端修正结构化 JSON，并保存回数据库。
6. 用户配置 JD 后，对候选人发起评分；评分结果写回数据库并在前端图表中展示。

## 技术选型及理由

| 技术 | 用途 | 选择理由 |
| --- | --- | --- |
| `pnpm workspace` | Monorepo 管理 | 统一依赖与脚本，便于维护多包项目和共享代码。 |
| `React 19 + TypeScript + Vite` | 前端应用 | 组件化适合复杂工作台；TypeScript 提升模型约束；Vite 冷启动快，适合高频迭代。 |
| `@tanstack/react-query` | 前端服务端状态 | 统一处理列表、详情、轮询刷新和异步缓存，减少手写请求状态逻辑。 |
| `zustand` | 前端轻量全局状态 | 适合主题、全局错误等跨组件状态，避免引入更重的状态管理方案。 |
| `Tailwind CSS + Recharts` | 界面与数据可视化 | Tailwind 适合快速搭建运营台界面；Recharts 足够支撑评分图表展示。 |
| `Express + TypeScript` | 后端 API | 学习成本低、控制力强，适合本项目 REST + SSE 混合场景。 |
| `multer + pdf-parse` | 文件上传与 PDF 解析 | 组合简单直接，能快速完成简历入库链路。 |
| `PostgreSQL` | 数据存储 | 结构化查询稳定，且 `JSONB` 适合保存结构化简历结果。 |
| `Zod` | 请求校验 | 在后端入口做参数约束，降低脏数据写入风险。 |
| `DeepSeek API` | AI 信息提取与评分 | 统一模型入口，适合实现结构化提取、评分和流式反馈。 |
| `REST + SSE` | 前后端通信 | REST 负责查询与写入；SSE 适合单向、可观察的提取过程推送。 |
| `Biome + Vitest + Playwright` | 工程质量 | 覆盖格式化、静态检查、单元测试与端到端测试。 |
| `Docker Compose` | 本地联调与部署 | 一套编排同时管理 Web、API、PostgreSQL，降低环境差异。 |

## 本地开发环境搭建指南

### 1. 环境要求

- Node.js `>= 20`
- pnpm `>= 10`
- Docker / Docker Compose
- 可用的 DeepSeek API Key

### 2. 获取代码并安装依赖

```bash
git clone <your-repo-url>
cd Sidereus
pnpm install
```

### 3. 配置环境变量

项目已提供环境变量样例：

```bash
cp .env.example .env
```

默认示例如下：

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sidereus
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=4000
WEB_ORIGIN=http://localhost:5173
VITE_API_BASE=http://localhost:4000
```

说明：

- `DATABASE_URL` 是后端连接 PostgreSQL 的地址。
- `DEEPSEEK_API_KEY` 是 AI 提取与评分必填项。
- `WEB_ORIGIN` 用于后端 CORS。
- `VITE_API_BASE` 主要用于本地 Vite 开发环境；生产容器默认走同源反向代理。

### 4. 启动数据库

如果本机没有 PostgreSQL，推荐直接使用 Compose 启动数据库服务：

```bash
docker compose up -d postgres
```

后端启动时会自动执行建表逻辑，因此当前版本不需要单独跑 migration。

### 5. 启动开发服务

```bash
pnpm dev
```

默认访问地址：

- 前端: `http://localhost:5173`
- 后端: `http://localhost:4000`
- 健康检查: `http://localhost:4000/api/health`

### 6. 常用开发命令

```bash
pnpm build
pnpm typecheck
pnpm biome:check
pnpm biome:format
pnpm --filter @sidereus/web test
pnpm --filter @sidereus/web test:e2e
```

## 部署方式说明

### 推荐方式：Docker Compose 单机部署

项目默认的部署方式是三服务 Compose：

- `web`: Nginx 提供前端静态资源，对 `/api` 和 `/uploads` 做反向代理。
- `api`: Node.js 运行 Express 服务，处理上传、解析、AI 提取和评分。
- `postgres`: PostgreSQL 持久化业务数据。

### 1. 准备部署环境

- 服务器安装 Docker 和 Docker Compose。
- 在项目根目录准备 `.env` 文件。
- 至少配置 `DEEPSEEK_API_KEY`；如果数据库不和 Compose 一起部署，还需要改写 `DATABASE_URL`。

### 2. 构建并启动

```bash
docker compose up -d --build
```

### 3. 访问方式

- 前端默认对外暴露 `80` 端口。
- API 默认对外暴露 `4000` 端口。
- 如果直接使用仓库内 `nginx.conf`，浏览器访问前端域名时，会由 Nginx 代理同源 `/api` 和 `/uploads` 请求到 API 容器。

### 4. 数据持久化

- PostgreSQL 数据存放在 Compose volume `sidereus_pg_data`。
- 上传的 PDF 文件存放在 Compose volume `sidereus_uploads`。

### 5. 常用运维命令

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f api
docker compose logs -f postgres
docker compose down
docker compose down -v
```

### 6. 部署注意事项

- 当前前端在生产环境默认优先使用同源地址，因此推荐保留 Nginx 反向代理，而不是让浏览器直接跨域访问 API。
- 如果你要拆分部署前后端，需要在前端构建时明确注入 `VITE_API_BASE`，或自行准备网关层做统一域名转发。
- 当前数据库表由 API 启动时自动创建，适合小团队和演示环境；若后续演进到多环境协作，建议补充正式 migration 流程。

## 开发过程中的关键技术决策与思考

- **Monorepo + shared types**：招聘流程字段迭代频繁，把类型收敛到 `packages/shared` 能显著降低前后端接口偏差。
- **SSE 替代轮询展示提取进度**：结构化提取是一个阶段性过程，用 SSE 可以让用户实时看到当前步骤和结果块，反馈明显优于“点击后等待”。
- **结构化结果直接落 PostgreSQL JSONB**：前期业务模型还在调整，先保证灵活存储和可回放，避免过早把简历结构拆成大量表。
- **API 启动时自动建表**：降低本地开发和首次部署门槛，代价是数据库演进治理能力较弱，因此更适合当前阶段而非长期复杂生产环境。
- **生产环境走同源反代**：相比让前端直连独立 API 域名，同源代理能减少 CORS、上传地址和 SSE 连接配置的复杂度。
- **PDF 解析加入清洗与文件名归一化**：简历来源复杂，先在入库阶段兜底编码和文本质量，能明显降低后续 AI 提取失败率。

## 关键接口概览

- `POST /api/candidates/upload`: 批量上传 PDF 简历
- `GET /api/candidates`: 查询候选人列表
- `GET /api/candidates/:id`: 查询候选人详情
- `PATCH /api/candidates/:id/status`: 更新候选人状态
- `GET /api/candidates/:id/extract/stream`: 以 SSE 方式执行结构化提取
- `PUT /api/candidates/:id/structured`: 保存人工修正后的结构化结果
- `POST /api/jobs`: 创建 JD
- `GET /api/jobs`: 查询 JD 列表
- `POST /api/candidates/:id/score`: 对指定 JD 发起评分
- `GET /api/candidates/:id/scores`: 查询候选人评分历史
