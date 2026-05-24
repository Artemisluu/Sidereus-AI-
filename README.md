# Sidereus - AI 智能招聘系统

Sidereus 是一个基于 `pnpm monorepo` 的全栈招聘系统，覆盖简历上传解析、AI 结构化提取、岗位匹配评分、候选人管理等核心招聘流程。

## 项目架构说明

### 整体架构

- 架构模式：前后端分离 + RESTful API + SSE 实时流。
- 前端（`apps/web`）：负责上传交互、候选人列表/详情、评分展示与状态管理。
- 后端（`apps/api`）：负责文件上传、PDF 文本提取、AI 调用、结构化入库与评分逻辑。
- 数据层（PostgreSQL）：存储候选人、JD、评分历史及结构化 JSON。
- 共享层（`packages/shared`）：沉淀前后端共享类型，降低接口漂移风险。

### 目录结构

```txt
apps/
  api/      # Express 后端服务
  web/      # React 前端应用
packages/
  shared/   # 前后端共享类型
test-data/  # 测试 PDF 与生成脚本
```

## 技术选型及理由

- 前端：`React + TypeScript + Vite`
  - React 组件化适合复杂业务界面拆分；
  - TypeScript 提升模型结构、接口字段的可维护性；
  - Vite 冷启动快，适合高频迭代。

- 后端：`Express + TypeScript`
  - Express 轻量直接，适配本项目 REST + SSE 场景；
  - TypeScript 与前端共享类型，减少联调成本。

- 数据库：`PostgreSQL`
  - 对结构化字段与 `JSONB` 支持成熟；
  - 便于后续做筛选、排序和统计扩展。

- AI 能力：`DeepSeek API`
  - 统一模型接口，便于实现分段提取与评分；
  - 能与 SSE 结合，提供可感知的流式体验。

- 通信方式：`RESTful + SSE`
  - REST 适合 CRUD；
  - SSE 天然适配单向进度流（提取过程、状态反馈）。

## 本地开发环境搭建指南

### 1) 环境要求

- Node.js `>= 20`
- pnpm `>= 9`
- PostgreSQL `>= 15`（本地安装或 Docker）

### 2) 获取代码与安装依赖

```bash
git clone <your-repo-url>
cd Sidereus
pnpm install
```

### 3) 配置环境变量

```bash
cp .env.example .env
```

至少配置：

- `DATABASE_URL=postgresql://...`
- `DEEPSEEK_API_KEY=你的真实密钥`
- 可选：`WEB_ORIGIN`、`DEEPSEEK_BASE_URL`

### 4) 启动 PostgreSQL（若使用 Docker）

```bash
docker compose up -d postgres
```

### 5) 启动开发服务

```bash
pnpm dev
```

- 前端默认：`http://localhost:5173`
- 后端默认：`http://localhost:4000`

### 6) 常用开发命令

```bash
# 构建
pnpm build

# 指定包构建
pnpm --filter @sidereus/web build
pnpm --filter @sidereus/api build
```

## 部署方式说明

推荐使用 Docker Compose 一键部署。

### 1) 准备部署环境

- 服务器安装 Docker / Docker Compose；
- 项目根目录准备 `.env`；
- 至少包含 `DEEPSEEK_API_KEY` 与正确的 `DATABASE_URL`。

### 2) 一键构建并启动

```bash
docker compose up -d --build
```

### 3) 访问

- 前端：`http://118.178.99.145`

### 4) 运维命令

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f api
docker compose logs -f postgres
docker compose down
docker compose down -v
```

## 开发过程中的关键技术决策与思考

- **采用 Monorepo + shared types**：在需求频繁调整时，前后端字段可同步演进，减少“接口对不上”问题。
- **提取流程改为 SSE 分段返回**：比一次性返回更可观测，用户可实时看到提取阶段与进度。
- **PDF 解析增加回退策略**：针对部分 PDF 的 `bad XRef entry` 问题，采用多版本解析回退提高代码健壮性。
- **上传文件名做编码归一化**：修复中文文件名乱码，保证候选人列表展示可读。
- **关键动作增加显式反馈**：如评分 loading、保存成功 toast、提取进度与完成态，降低用户不确定感。

## 模块完成情况

### 模块一：简历上传与解析 ✅

- 拖拽上传 + 点击上传，仅支持 PDF。
- 支持批量上传（前端限制至少 5 份）。
- 后端 `pdf-parse` 解析多页 PDF 文本。

### 模块二：AI 智能信息提取 ✅

- DeepSeek 提取：基本信息、教育、工作、技能、项目。
- SSE 流式返回分段提取结果，前端渐进渲染。
- 支持前端 JSON 手动修正并保存。

### 模块三：岗位匹配与智能评分 ✅

- JD 编辑器：岗位描述、必备技能、加分技能。
- AI 评分返回：综合分 + 子评分 + 评语。
- 可视化：雷达图 + 柱状图 + 环形分数展示。

### 模块四：候选人管理面板 ✅

- 支持表格/卡片视图切换、筛选、搜索、排序、分页。
- 详情页展示结构化信息、评分、原始 PDF。
- 状态流转：待筛选 → 初筛通过 → 面试中 → 已录用/已淘汰。

## 关键接口

- `POST /api/candidates/upload` 批量上传 PDF
- `GET /api/candidates` 候选人列表
- `GET /api/candidates/:id` 候选人详情
- `PATCH /api/candidates/:id/status` 更新状态
- `GET /api/candidates/:id/extract/stream` SSE 提取
- `PUT /api/candidates/:id/structured` 保存手动修正
- `POST /api/jobs` 创建 JD
- `GET /api/jobs` 列出 JD
- `POST /api/candidates/:id/score` 对指定 JD 评分
- `GET /api/candidates/:id/scores` 候选人评分历史
