FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

ARG PNPM_REGISTRY=https://registry.npmmirror.com
RUN pnpm config set registry ${PNPM_REGISTRY} \
 && pnpm config set fetch-retries 5 \
 && pnpm config set fetch-timeout 120000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile --prefer-offline

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN pnpm --filter @sidereus/shared build && pnpm --filter @sidereus/api build

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["pnpm", "start"]
