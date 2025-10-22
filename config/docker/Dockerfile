# 多阶段构建 - 构建阶段
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖（仅生产依赖）
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:22-alpine AS production

# 安装安全更新
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制应用文件
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/client ./client
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# 创建必要的目录
RUN mkdir -p /app/data /app/logs /app/encrypted && \
    chown -R nextjs:nodejs /app/data /app/logs /app/encrypted

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server/index.js"]

# 标签
LABEL maintainer="SecureFrontEnd Team <team@secure-frontend.com>"
LABEL version="1.0.0"
LABEL description="企业级安全前端资源加密存储解决方案，专为需要高度安全性的Web应用程序设计"
LABEL org.opencontainers.image.source="https://github.com/your-org/SecureFrontEnd"
LABEL org.opencontainers.image.documentation="https://docs.secure-frontend.com"
LABEL org.opencontainers.image.licenses="AGPL-3.0"