import { v4 as uuidv4 } from 'uuid';

/**
 * 请求日志中间件
 * 记录HTTP请求的详细信息
 */
export function requestLogger(logger) {
  return (req, res, next) => {
    // 生成请求ID
    req.id = uuidv4();
    
    // 记录请求开始时间
    const startTime = Date.now();
    
    // 获取请求信息
    const requestInfo = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      referer: req.get('Referer'),
      timestamp: new Date().toISOString()
    };

    // 记录请求开始
    logger?.info('Request started', requestInfo);

    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      const responseInfo = {
        requestId: req.id,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length'),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };

      // 根据状态码选择日志级别
      if (res.statusCode >= 500) {
        logger?.error('Request completed with server error', {
          ...requestInfo,
          ...responseInfo
        });
      } else if (res.statusCode >= 400) {
        logger?.warn('Request completed with client error', {
          ...requestInfo,
          ...responseInfo
        });
      } else {
        logger?.info('Request completed successfully', {
          ...requestInfo,
          ...responseInfo
        });
      }
    });

    // 监听响应关闭（客户端断开连接）
    res.on('close', () => {
      if (!res.finished) {
        const duration = Date.now() - startTime;
        
        logger?.warn('Request closed by client', {
          ...requestInfo,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      }
    });

    next();
  };
}

/**
 * 获取客户端真实IP地址
 */
function getClientIP(req) {
  return req.ip ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         'unknown';
}

/**
 * 安全日志中间件
 * 记录安全相关的事件
 */
export function securityLogger(logger) {
  return (req, res, next) => {
    // 检测可疑的请求模式
    const suspiciousPatterns = [
      /\.\./,  // 路径遍历
      /<script/i,  // XSS尝试
      /union.*select/i,  // SQL注入尝试
      /javascript:/i,  // JavaScript协议
      /vbscript:/i,  // VBScript协议
      /onload=/i,  // 事件处理器
      /onerror=/i  // 错误处理器
    ];

    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';

    // 检查URL中的可疑模式
    const suspiciousUrl = suspiciousPatterns.some(pattern => pattern.test(url));
    
    // 检查User-Agent中的可疑模式
    const suspiciousUserAgent = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    if (suspiciousUrl || suspiciousUserAgent) {
      logger?.warn('Suspicious request detected', {
        requestId: req.id,
        method: req.method,
        url: url,
        ip: getClientIP(req),
        userAgent: userAgent,
        referer: referer,
        suspiciousUrl,
        suspiciousUserAgent,
        timestamp: new Date().toISOString()
      });
    }

    // 检测暴力破解尝试
    if (req.path.includes('/auth/login') && req.method === 'POST') {
      const ip = getClientIP(req);
      
      // 这里可以实现更复杂的暴力破解检测逻辑
      logger?.info('Login attempt', {
        requestId: req.id,
        ip: ip,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * 性能监控中间件
 */
export function performanceLogger(logger) {
  const activeRequests = new Map();

  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    // 记录活跃请求
    activeRequests.set(req.id, {
      method: req.method,
      url: req.originalUrl,
      startTime: Date.now()
    });

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      };

      const performanceInfo = {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: memoryDelta,
        activeRequestsCount: activeRequests.size,
        timestamp: new Date().toISOString()
      };

      // 移除已完成的请求
      activeRequests.delete(req.id);

      // 根据性能指标选择日志级别
      if (duration > 5000) { // 超过5秒
        logger?.warn('Slow request detected', performanceInfo);
      } else if (duration > 1000) { // 超过1秒
        logger?.info('Request performance', performanceInfo);
      } else {
        logger?.debug('Request performance', performanceInfo);
      }
    });

    next();
  };
}

/**
 * 错误日志中间件
 */
export function errorLogger(logger) {
  return (err, req, res, next) => {
    const errorInfo = {
      requestId: req.id,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        statusCode: err.statusCode
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: getClientIP(req),
        userAgent: req.get('User-Agent'),
        body: sanitizeRequestBody(req.body),
        params: req.params,
        query: req.query
      },
      timestamp: new Date().toISOString()
    };

    // 根据错误类型选择日志级别
    if (err.statusCode && err.statusCode < 500) {
      logger?.warn('Client error occurred', errorInfo);
    } else {
      logger?.error('Server error occurred', errorInfo);
    }

    next(err);
  };
}

/**
 * 清理请求体中的敏感信息
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * 访问日志格式化器
 */
export function formatAccessLog(req, res, duration) {
  const ip = getClientIP(req);
  const method = req.method;
  const url = req.originalUrl;
  const statusCode = res.statusCode;
  const contentLength = res.get('Content-Length') || '-';
  const userAgent = req.get('User-Agent') || '-';
  const referer = req.get('Referer') || '-';
  const timestamp = new Date().toISOString();

  // Apache Common Log Format with extensions
  return `${ip} - - [${timestamp}] "${method} ${url} HTTP/1.1" ${statusCode} ${contentLength} "${referer}" "${userAgent}" ${duration}ms`;
}

/**
 * 结构化日志中间件
 */
export function structuredLogger(logger, options = {}) {
  const {
    includeBody = false,
    includeQuery = true,
    includeHeaders = false,
    sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
  } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    
    const logData = {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent')
    };

    // 包含查询参数
    if (includeQuery && Object.keys(req.query).length > 0) {
      logData.query = req.query;
    }

    // 包含请求体
    if (includeBody && req.body) {
      logData.body = sanitizeRequestBody(req.body);
    }

    // 包含请求头
    if (includeHeaders) {
      const headers = { ...req.headers };
      sensitiveHeaders.forEach(header => {
        if (headers[header]) {
          headers[header] = '[REDACTED]';
        }
      });
      logData.headers = headers;
    }

    logger?.info('Request received', logData);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      const responseData = {
        ...logData,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length')
      };

      logger?.info('Request completed', responseData);
    });

    next();
  };
}

export default {
  requestLogger,
  securityLogger,
  performanceLogger,
  errorLogger,
  formatAccessLog,
  structuredLogger
};