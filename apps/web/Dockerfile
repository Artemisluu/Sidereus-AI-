FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

ARG PNPM_REGISTRY=https://registry.npmmirror.com
RUN pnpm config set registry ${PNPM_REGISTRY} \
 && pnpm config set fetch-retries 5 \
 && pnpm config set fetch-timeout 120000

ARG VITE_API_BASE=/
ENV VITE_API_BASE=${VITE_API_BASE}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile --prefer-offline

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

RUN pnpm --filter @sidereus/shared build && pnpm --filter @sidereus/web build

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
