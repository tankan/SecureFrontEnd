/**
 * 错误处理中间件
 * 统一处理应用程序中的错误
 */

/**
 * 自定义错误类
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * 认证错误类
 */
export class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误类
 */
export class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 资源未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * 冲突错误类
 */
export class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * 速率限制错误类
 */
export class RateLimitError extends AppError {
  constructor(message = '请求过于频繁', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

/**
 * 主要错误处理中间件
 */
export function errorHandler(logger) {
  return (err, req, res, next) => {
    try {
      // 记录错误
      logError(err, req, logger);

      // 如果响应已经发送，交给默认错误处理器
      if (res.headersSent) {
        return next(err);
      }

      // 处理不同类型的错误
      const errorResponse = buildErrorResponse(err, req);
      
      res.status(errorResponse.statusCode).json(errorResponse.body);

    } catch (handlerError) {
      // 错误处理器本身出错
      logger?.error('Error handler failed', {
        originalError: err.message,
        handlerError: handlerError.message,
        stack: handlerError.stack
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: '服务器内部错误',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * 记录错误
 */
function logError(err, req, logger) {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    code: err.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  };

  if (err.statusCode && err.statusCode < 500) {
    // 客户端错误（4xx）
    logger?.warn('Client error', errorInfo);
  } else {
    // 服务器错误（5xx）
    logger?.error('Server error', errorInfo);
  }
}

/**
 * 构建错误响应
 */
function buildErrorResponse(err, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 默认错误信息
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = '服务器内部错误';
  let details = null;

  // 处理已知错误类型
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code || getErrorCodeFromStatus(statusCode);
    message = err.message;
    
    if (err instanceof ValidationError) {
      details = { errors: err.errors };
    } else if (err instanceof RateLimitError) {
      details = { retryAfter: err.retryAfter };
    }
  } else if (err.name === 'ValidationError') {
    // Mongoose/Joi 验证错误
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = '数据验证失败';
    details = parseValidationErrors(err);
  } else if (err.name === 'CastError') {
    // MongoDB CastError
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = '无效的ID格式';
  } else if (err.code === 11000) {
    // MongoDB 重复键错误
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    message = '数据已存在';
    details = parseDuplicateKeyError(err);
  } else if (err.code === 'ERR_JWT_INVALID') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = '无效的访问令牌';
  } else if (err.code === 'ERR_JWT_EXPIRED') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = '访问令牌已过期';
  } else if (err.name === 'MulterError') {
    // 文件上传错误
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    message = getMulterErrorMessage(err);
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    errorCode = 'FILE_NOT_FOUND';
    message = '文件未找到';
  } else if (err.code === 'EACCES') {
    statusCode = 403;
    errorCode = 'FILE_ACCESS_DENIED';
    message = '文件访问被拒绝';
  }

  // 构建响应体
  const responseBody = {
    error: errorCode,
    message: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // 添加详细信息
  if (details) {
    responseBody.details = details;
  }

  // 开发环境下添加堆栈信息
  if (isDevelopment && err.stack) {
    responseBody.stack = err.stack;
  }

  // 添加请求ID（如果存在）
  if (req.id) {
    responseBody.requestId = req.id;
  }

  return {
    statusCode,
    body: responseBody
  };
}

/**
 * 根据状态码获取错误代码
 */
function getErrorCodeFromStatus(statusCode) {
  const statusCodeMap = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  };

  return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * 解析验证错误
 */
function parseValidationErrors(err) {
  const errors = [];

  if (err.errors) {
    Object.keys(err.errors).forEach(key => {
      const error = err.errors[key];
      errors.push({
        field: key,
        message: error.message,
        value: error.value,
        kind: error.kind
      });
    });
  }

  return { errors };
}

/**
 * 解析重复键错误
 */
function parseDuplicateKeyError(err) {
  const keyValue = err.keyValue || {};
  const duplicateFields = Object.keys(keyValue);
  
  return {
    duplicateFields,
    values: keyValue
  };
}

/**
 * 获取Multer错误消息
 */
function getMulterErrorMessage(err) {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return '文件大小超出限制';
    case 'LIMIT_FILE_COUNT':
      return '文件数量超出限制';
    case 'LIMIT_FIELD_KEY':
      return '字段名过长';
    case 'LIMIT_FIELD_VALUE':
      return '字段值过长';
    case 'LIMIT_FIELD_COUNT':
      return '字段数量过多';
    case 'LIMIT_UNEXPECTED_FILE':
      return '意外的文件字段';
    default:
      return '文件上传错误';
  }
}

/**
 * 404错误处理中间件
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`路由 ${req.originalUrl} 未找到`);
  next(error);
}

/**
 * 异步错误捕获包装器
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 验证中间件包装器
 */
export function validateRequest(schema, property = 'body') {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        throw new ValidationError('请求数据验证失败', errors);
      }

      req[property] = value;
      next();

    } catch (err) {
      next(err);
    }
  };
}

/**
 * 全局未捕获异常处理
 */
export function setupGlobalErrorHandlers(logger) {
  process.on('uncaughtException', (error) => {
    logger?.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger?.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise
    });
    
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequest,
  setupGlobalErrorHandlers
};