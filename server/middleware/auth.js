import { jwtVerify } from 'jose';

/**
 * JWT令牌认证中间件 - 使用jose库
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '缺少访问令牌'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    const secret = new TextEncoder().encode(jwtSecret);
    
    try {
      const { payload } = await jwtVerify(token, secret);
      req.user = payload;
      next();
    } catch (error) {
      let message = '无效的访问令牌';
      
      if (error.code === 'ERR_JWT_EXPIRED') {
        message = '访问令牌已过期';
      } else if (error.code === 'ERR_JWT_INVALID') {
        message = '访问令牌格式错误';
      }

      return res.status(403).json({
        error: 'Forbidden',
        message: message
      });
    }

  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: '令牌验证过程中发生错误'
    });
  }
}

/**
 * 角色权限检查中间件
 */
export function requireRole(roles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '用户未认证'
        });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '权限不足'
        });
      }

      next();

    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: '权限检查过程中发生错误'
      });
    }
  };
}

/**
 * 管理员权限检查中间件
 */
export function requireAdmin(req, res, next) {
  return requireRole(['admin'])(req, res, next);
}

/**
 * 用户或管理员权限检查中间件
 */
export function requireUserOrAdmin(req, res, next) {
  return requireRole(['user', 'admin'])(req, res, next);
}

/**
 * 资源所有者或管理员权限检查中间件
 */
export function requireOwnerOrAdmin(resourceUserIdField = 'userId') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '用户未认证'
        });
      }

      const currentUserId = req.user.userId;
      const userRole = req.user.role;

      // 管理员可以访问所有资源
      if (userRole === 'admin') {
        return next();
      }

      // 获取资源的用户ID
      let resourceUserId;
      
      if (req.params[resourceUserIdField]) {
        resourceUserId = parseInt(req.params[resourceUserIdField]);
      } else if (req.body[resourceUserIdField]) {
        resourceUserId = parseInt(req.body[resourceUserIdField]);
      } else {
        // 如果没有指定资源用户ID，尝试从数据库查询
        const resourceId = req.params.id || req.params.resourceId;
        if (resourceId) {
          const keyManagement = req.app.locals.services.keyManagement;
          // 这里需要根据具体的资源类型来查询
          // 暂时跳过，让后续逻辑处理
        }
      }

      // 检查是否为资源所有者
      if (resourceUserId && currentUserId === resourceUserId) {
        return next();
      }

      // 如果既不是管理员也不是资源所有者
      return res.status(403).json({
        error: 'Forbidden',
        message: '只能访问自己的资源'
      });

    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: '权限检查过程中发生错误'
      });
    }
  };
}

/**
 * API密钥认证中间件（用于服务间调用）
 */
export function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '缺少API密钥'
      });
    }

    if (!validApiKeys.includes(apiKey)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '无效的API密钥'
      });
    }

    // 设置API调用标识
    req.isApiCall = true;
    next();

  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'API密钥验证过程中发生错误'
    });
  }
}

/**
 * 可选认证中间件（允许匿名访问，但如果提供了令牌则验证） - 使用jose库
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 没有令牌，继续处理但不设置用户信息
      return next();
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    const secret = new TextEncoder().encode(jwtSecret);
    
    try {
      const { payload } = await jwtVerify(token, secret);
      req.user = payload;
    } catch (error) {
      // 令牌无效，但不阻止请求
      req.user = null;
    }
    
    next();

  } catch (error) {
    // 发生错误，但不阻止请求
    req.user = null;
    next();
  }
}

/**
 * 速率限制中间件（基于用户）
 */
export function userRateLimit(options = {}) {
  const requests = new Map();
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15分钟
  const maxRequests = options.maxRequests || 100;

  return (req, res, next) => {
    try {
      const userId = req.user ? req.user.userId : req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // 清理过期记录
      if (requests.has(userId)) {
        const userRequests = requests.get(userId);
        const validRequests = userRequests.filter(time => time > windowStart);
        requests.set(userId, validRequests);
      }

      // 检查当前用户的请求次数
      const userRequests = requests.get(userId) || [];
      
      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // 记录当前请求
      userRequests.push(now);
      requests.set(userId, userRequests);

      // 设置响应头
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - userRequests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });

      next();

    } catch (error) {
      next();
    }
  };
}

/**
 * IP白名单中间件
 */
export function ipWhitelist(allowedIPs = []) {
  return (req, res, next) => {
    try {
      if (allowedIPs.length === 0) {
        return next();
      }

      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      
      if (!allowedIPs.includes(clientIP)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'IP地址不在允许列表中'
        });
      }

      next();

    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'IP检查过程中发生错误'
      });
    }
  };
}

/**
 * 请求来源验证中间件
 */
export function validateOrigin(allowedOrigins = []) {
  return (req, res, next) => {
    try {
      if (allowedOrigins.length === 0) {
        return next();
      }

      const origin = req.headers.origin || req.headers.referer;
      
      if (!origin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '缺少请求来源信息'
        });
      }

      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin === '*') return true;
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          return new RegExp(pattern).test(origin);
        }
        return origin.startsWith(allowedOrigin);
      });

      if (!isAllowed) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '请求来源不被允许'
        });
      }

      next();

    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: '来源验证过程中发生错误'
      });
    }
  };
}

export default {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireUserOrAdmin,
  requireOwnerOrAdmin,
  authenticateApiKey,
  optionalAuth,
  userRateLimit,
  ipWhitelist,
  validateOrigin
};