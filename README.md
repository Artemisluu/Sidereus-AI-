# Sidereus - AI 智能招聘系统

基于 `pnpm monorepo` 的全栈项目：

- 前端：React + TypeScript + Vite
- 后端：Express + TypeScript
- 数据库：PostgreSQL
- AI：DeepSeek API
- 接口风格：RESTful + SSE

## 目录结构

```txt
apps/
  api/     # Express 后端
  web/     # React 前端
packages/
  shared/  # 前后端共享类型
```

## 本地启动

1. 启动 PostgreSQL（可选 docker）：

```bash
docker compose up -d
```

2. 配置环境变量：

```bash
cp .env.example .env
```

> 需要填写 `DEEPSEEK_API_KEY`。

3. 安装依赖并启动：

```bash
pnpm install
pnpm dev
```

- 前端默认：`http://localhost:5173`
- 后端默认：`http://localhost:4000`

## 服务器一键部署（Docker Compose）

### 1) 准备环境

- 安装 Docker 与 Docker Compose
- 在项目根目录准备 `.env`（可由 `.env.example` 复制）
- 至少配置：
  - `DEEPSEEK_API_KEY=你的真实密钥`

### 2) 一键启动

```bash
docker compose up -d --build
```

### 3) 访问地址

- 前端：`http://服务器IP/`（80 端口）
- 后端健康检查：`http://服务器IP:4000/api/health`

### 4) 常用运维命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f web
docker compose logs -f api
docker compose logs -f postgres

# 停止服务
docker compose down

# 停止并删除数据卷（谨慎）
docker compose down -v
```

## 模块完成情况

### 模块一：简历上传与解析 ✅

- 拖拽上传 + 点击上传，仅支持 PDF。
- 支持批量上传（前端限制至少 5 份）。
- 后端 `pdf-parse` 解析多页 PDF 文本。
- 文本清洗与结构化预处理。
- 加分项：上传前显示 PDF 首页缩略图。

### 模块二：AI 智能信息提取 ✅

- DeepSeek 提取：基本信息、教育、工作、技能、项目。
- SSE 流式返回分段提取结果，前端渐进渲染。
- 加分项：支持前端 JSON 手动修正并保存。

### 模块三：岗位匹配与智能评分 ✅

- JD 编辑器：岗位描述、必备技能、加分技能。
- AI 评分返回：综合分 + 子评分 + 评语。
- 可视化：雷达图 + 柱状图 + 环形分数展示。

### 模块四：候选人管理面板 ✅

- 列表页支持表格/卡片视图切换。
- 支持按状态/技能筛选，关键字搜索，排序，分页。
- 详情页展示完整结构化信息、评分、原始 PDF。
- 状态流转（待筛选 → 初筛通过 → 面试中 → 已录用/已淘汰）。
- 加分项：支持 2-3 人并排对比卡片。

### 模块五：前端工程质量 ✅

- 组件化拆分，复用 API 层与状态管理。
- 响应式布局（桌面优先）。
- 全局错误提示 + Loading/Skeleton。
- 加分项：暗色/亮色主题切换、快捷键 `Ctrl+K`、过渡动画。

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
