#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 导入路由模块
import authRoutes from './routes/auth.js';
import keyRoutes from './routes/keys.js';
import resourceRoutes from './routes/resources.js';
import adminRoutes from './routes/admin.js';

// 导入中间件
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';

// 导入服务
import { KeyManagementService } from './services/key-management.js';
import { DatabaseService } from './services/database.js';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 安全前端资源加密存储解决方案 - 后端服务
 * 提供密钥管理、用户鉴权和资源访问控制
 */
class SecureResourceServer {
  constructor(options = {}) {
    this.config = {
      port: options.port || process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      ...options
    };

    this.app = express();
    this.logger = this.setupLogger();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    // 移除构造函数中的异步调用，只在start方法中初始化服务
  }

  /**
   * 设置日志记录器
   */
  setupLogger() {
    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'secure-resource-server' },
      transports: [
        new winston.transports.File({ 
          filename: process.env.LOG_FILE || './logs/server.log' 
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    return logger;
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 安全中间件 - Helmet 8.x 新语法
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS配置
    this.app.use(cors({
      origin: this.config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // 速率限制
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      limit: this.config.rateLimitMaxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: 'draft-7',
      legacyHeaders: false
    });
    this.app.use(limiter);

    // 请求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志
    this.app.use(requestLogger(this.logger));

    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: this.config.nodeEnv
      });
    });
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // API版本前缀
    const apiPrefix = '/api/v1';

    // 公开路由（不需要认证）
    this.app.use(`${apiPrefix}/auth`, authRoutes);

    // 受保护的路由（需要认证）
    this.app.use(`${apiPrefix}/keys`, authenticateToken, keyRoutes);
    this.app.use(`${apiPrefix}/resources`, authenticateToken, resourceRoutes);
    this.app.use(`${apiPrefix}/admin`, authenticateToken, adminRoutes);

    // 静态文件服务（用于提供解密入口页面）
    this.app.use('/secure', express.static(join(__dirname, '../client/secure')));

    // 根路径重定向
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Secure Frontend Resource Server',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health'
      });
    });

    // API文档
    this.app.get('/api/docs', (req, res) => {
      res.json({
        title: 'Secure Frontend Resource Server API',
        version: '1.0.0',
        endpoints: {
          auth: {
            'POST /api/v1/auth/login': 'User login',
            'POST /api/v1/auth/register': 'User registration',
            'POST /api/v1/auth/refresh': 'Refresh access token',
            'POST /api/v1/auth/logout': 'User logout'
          },
          keys: {
            'GET /api/v1/keys': 'List user keys',
            'POST /api/v1/keys/generate': 'Generate new key',
            'GET /api/v1/keys/:id': 'Get specific key',
            'DELETE /api/v1/keys/:id': 'Delete key',
            'POST /api/v1/keys/rotate': 'Rotate keys'
          },
          resources: {
            'GET /api/v1/resources': 'List encrypted resources',
            'GET /api/v1/resources/:id/key': 'Get resource decryption key',
            'POST /api/v1/resources/upload': 'Upload encrypted resource',
            'DELETE /api/v1/resources/:id': 'Delete resource'
          },
          admin: {
            'GET /api/v1/admin/users': 'List all users',
            'GET /api/v1/admin/keys': 'List all keys',
            'POST /api/v1/admin/keys/rotate-all': 'Rotate all keys',
            'GET /api/v1/admin/stats': 'Get system statistics'
          }
        }
      });
    });

    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    this.app.use(errorHandler(this.logger));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  /**
   * 初始化服务
   */
  async initializeServices() {
    try {
      // 初始化数据库服务
      this.databaseService = new DatabaseService({
        url: process.env.DATABASE_URL || 'sqlite:./data/keys.db'
      });
      await this.databaseService.initialize();

      // 初始化密钥管理服务
      this.keyManagementService = new KeyManagementService({
        database: this.databaseService,
        masterKey: process.env.MASTER_KEY,
        keyRotationInterval: process.env.KEY_ROTATION_INTERVAL || '7d'
      });
      await this.keyManagementService.initialize();

      // 将服务实例添加到app上下文
      this.app.locals.services = {
        database: this.databaseService,
        keyManagement: this.keyManagementService,
        logger: this.logger
      };

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services', { error: error.message });
      throw error;
    }
  }

  /**
   * 启动服务器
   */
  async start() {
    try {
      await this.initializeServices();

      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`Server started on port ${this.config.port}`, {
          environment: this.config.nodeEnv,
          port: this.config.port,
          corsOrigin: this.config.corsOrigin
        });

        console.log(`
🚀 Secure Frontend Resource Server is running!

📍 Server: http://localhost:${this.config.port}
📚 API Docs: http://localhost:${this.config.port}/api/docs
💚 Health Check: http://localhost:${this.config.port}/health
🔒 Secure Entry: http://localhost:${this.config.port}/secure

Environment: ${this.config.nodeEnv}
        `);
      });

      return this.server;
    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      throw error;
    }
  }

  /**
   * 优雅关闭服务器
   */
  async shutdown() {
    try {
      this.logger.info('Starting graceful shutdown...');

      // 关闭HTTP服务器
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        this.logger.info('HTTP server closed');
      }

      // 关闭数据库连接
      if (this.databaseService) {
        await this.databaseService.close();
        this.logger.info('Database connections closed');
      }

      // 停止密钥轮换任务
      if (this.keyManagementService) {
        await this.keyManagementService.stop();
        this.logger.info('Key management service stopped');
      }

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const server = new SecureResourceServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (import.meta.url.endsWith('/server/index.js') || process.argv[1]?.endsWith('server/index.js')) {
  main();
}

export { SecureResourceServer };