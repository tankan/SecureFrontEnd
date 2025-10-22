# 🚀 部署指南

本指南详细介绍了如何将 SecureFrontEnd 应用程序部署到生产环境，包括各种部署方式和最佳实践。

## 📋 部署前准备

### 系统要求

#### 最低配置
- **CPU**: 2 核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

#### 推荐配置
- **CPU**: 4 核心或更多
- **内存**: 8GB RAM 或更多
- **存储**: 50GB SSD
- **网络**: 高带宽连接

### 软件依赖
- **Node.js**: 18.0 或更高版本
- **npm**: 8.0 或更高版本
- **数据库**: PostgreSQL 13+ 或 MySQL 8.0+
- **反向代理**: Nginx 1.18+ 或 Apache 2.4+
- **SSL证书**: Let's Encrypt 或商业证书

## 🐳 Docker 部署（推荐）

### 1. 使用 Docker Compose

创建 `docker-compose.prod.yml` 文件：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=securefrontend
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=securefrontend
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2. 创建生产环境 Dockerfile

`Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server/index.js"]
```

### 3. 部署命令

```bash
# 设置环境变量
export DB_PASSWORD="your-secure-db-password"
export JWT_SECRET="your-super-secret-jwt-key"
export ENCRYPTION_KEY="your-32-character-encryption-key"

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

## 🖥️ 传统服务器部署

### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 安装 Nginx
sudo apt install nginx

# 安装 PM2
sudo npm install -g pm2
```

### 2. 数据库配置

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE securefrontend;
CREATE USER appuser WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE securefrontend TO appuser;
\q
```

### 3. 应用部署

```bash
# 克隆代码
git clone https://github.com/your-username/SecureFrontEnd.git
cd SecureFrontEnd

# 安装依赖
npm ci --production

# 配置环境变量
cp .env.example .env.production
nano .env.production

# 运行数据库迁移
npm run migrate

# 创建管理员账户
npm run create-admin

# 使用 PM2 启动应用
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4. Nginx 配置

创建 `/etc/nginx/sites-available/securefrontend`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 代理到应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/securefrontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ☁️ 云平台部署

### AWS 部署

#### 使用 Elastic Beanstalk

1. 安装 EB CLI：
```bash
pip install awsebcli
```

2. 初始化应用：
```bash
eb init
eb create production
```

3. 配置环境变量：
```bash
eb setenv NODE_ENV=production DB_HOST=your-rds-endpoint JWT_SECRET=your-secret
```

4. 部署：
```bash
eb deploy
```

#### 使用 ECS

创建 `task-definition.json`：

```json
{
  "family": "securefrontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/securefrontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/securefrontend",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

使用 Cloud Run 部署：

```bash
# 构建镜像
gcloud builds submit --tag gcr.io/PROJECT-ID/securefrontend

# 部署到 Cloud Run
gcloud run deploy --image gcr.io/PROJECT-ID/securefrontend --platform managed
```

### Azure

使用 Container Instances：

```bash
# 创建资源组
az group create --name securefrontend-rg --location eastus

# 部署容器
az container create \
  --resource-group securefrontend-rg \
  --name securefrontend \
  --image your-registry/securefrontend:latest \
  --dns-name-label securefrontend \
  --ports 3000
```

## 🔒 SSL/TLS 配置

### Let's Encrypt 证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 商业证书配置

1. 购买 SSL 证书
2. 下载证书文件
3. 配置 Nginx：

```nginx
ssl_certificate /path/to/your-domain.crt;
ssl_certificate_key /path/to/your-domain.key;
```

## 📊 监控和日志

### 应用监控

使用 PM2 监控：
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs

# 监控面板
pm2 monit
```

### 系统监控

安装监控工具：
```bash
# 安装 htop
sudo apt install htop

# 安装 iotop
sudo apt install iotop

# 安装 netstat
sudo apt install net-tools
```

### 日志管理

配置日志轮转 `/etc/logrotate.d/securefrontend`：

```
/path/to/app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload all
    endscript
}
```

## 🔧 性能优化

### 应用优化

1. **启用 Gzip 压缩**：
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

2. **配置缓存**：
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

3. **启用 HTTP/2**：
```nginx
listen 443 ssl http2;
```

### 数据库优化

PostgreSQL 配置优化：

```sql
-- 调整内存设置
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';

-- 重启数据库
SELECT pg_reload_conf();
```

## 🛡️ 安全配置

### 防火墙设置

```bash
# 启用 UFW
sudo ufw enable

# 允许 SSH
sudo ufw allow ssh

# 允许 HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# 查看状态
sudo ufw status
```

### 系统安全

1. **禁用 root 登录**：
```bash
sudo nano /etc/ssh/sshd_config
# 设置：PermitRootLogin no
sudo systemctl restart ssh
```

2. **配置 fail2ban**：
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

3. **定期更新**：
```bash
# 设置自动更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📋 部署检查清单

### 部署前检查
- [ ] 环境变量已正确配置
- [ ] 数据库连接测试通过
- [ ] SSL 证书已安装
- [ ] 防火墙规则已配置
- [ ] 备份策略已制定

### 部署后验证
- [ ] 应用正常启动
- [ ] 健康检查端点响应正常
- [ ] 数据库连接正常
- [ ] 日志记录正常
- [ ] 监控系统正常

### 性能测试
- [ ] 负载测试通过
- [ ] 响应时间符合要求
- [ ] 内存使用正常
- [ ] CPU 使用正常

## 🔄 持续部署

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /path/to/app
          git pull origin main
          npm ci --production
          pm2 reload all
```

## 🆘 故障排除

### 常见问题

1. **应用无法启动**
   - 检查环境变量
   - 查看错误日志
   - 验证端口占用

2. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接参数
   - 检查网络连接

3. **SSL 证书问题**
   - 验证证书有效期
   - 检查证书链完整性
   - 确认域名匹配

### 日志分析

```bash
# 查看应用日志
tail -f /path/to/app/logs/app.log

# 查看 Nginx 日志
tail -f /var/log/nginx/error.log

# 查看系统日志
journalctl -u nginx -f
```

---

**需要帮助？** 请查看我们的 [故障排除指南](../troubleshooting/TROUBLESHOOTING.md) 或联系技术支持团队。