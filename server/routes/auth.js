import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { ValidationError, AuthenticationError } from '../middleware/error.js';
import { SignJWT } from 'jose';
import Joi from 'joi';

const router = express.Router();

/**
 * 验证模式
 */
const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

/**
 * POST /auth/login
 * 用户登录
 */
router.post('/login', asyncHandler(async (req, res) => {
  // 验证请求数据
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError('登录数据验证失败', error.details);
  }

  const { username, password } = value;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  try {
    // 用户认证
    const authResult = await keyManagement.authenticateUser(username, password);
    
    // 记录登录成功
    await keyManagement.logAccess({
      userId: authResult.user.id,
      action: 'login_success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('User login successful', {
      userId: authResult.user.id,
      username: authResult.user.username,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '登录成功',
      user: authResult.user,
      token: authResult.token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    // 记录登录失败
    await keyManagement.logAccess({
      action: 'login_failed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      errorMessage: error.message
    });

    logger.warn('User login failed', {
      username,
      ip: req.ip,
      error: error.message
    });

    throw new AuthenticationError(error.message);
  }
}));

/**
 * POST /auth/register
 * 用户注册
 */
router.post('/register', asyncHandler(async (req, res) => {
  // 验证请求数据
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError('注册数据验证失败', error.details);
  }

  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  try {
    // 注册用户
    const user = await keyManagement.registerUser(value);
    
    // 记录注册成功
    await keyManagement.logAccess({
      userId: user.id,
      action: 'register_success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('User registration successful', {
      userId: user.id,
      username: user.username,
      email: user.email,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    // 记录注册失败
    await keyManagement.logAccess({
      action: 'register_failed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      errorMessage: error.message
    });

    logger.warn('User registration failed', {
      username: value.username,
      email: value.email,
      ip: req.ip,
      error: error.message
    });

    throw new ValidationError(error.message);
  }
}));

/**
 * POST /auth/refresh
 * 刷新访问令牌
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  // 验证请求数据
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    throw new ValidationError('刷新令牌数据验证失败', error.details);
  }

  const { refreshToken } = value;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  try {
    // 验证刷新令牌
    const decoded = await keyManagement.verifyToken(refreshToken);
    
    // 生成新的访问令牌 - 使用jose库
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const newToken = await new SignJWT({ 
      userId: decoded.userId, 
      username: decoded.username, 
      role: decoded.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRES_IN || '24h')
      .sign(secret);

    // 记录令牌刷新
    await keyManagement.logAccess({
      userId: decoded.userId,
      action: 'token_refresh',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('Token refresh successful', {
      userId: decoded.userId,
      username: decoded.username,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '令牌刷新成功',
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    // 记录令牌刷新失败
    await keyManagement.logAccess({
      action: 'token_refresh_failed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      errorMessage: error.message
    });

    logger.warn('Token refresh failed', {
      ip: req.ip,
      error: error.message
    });

    throw new AuthenticationError('刷新令牌无效或已过期');
  }
}));

/**
 * POST /auth/logout
 * 用户登出
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  if (token) {
    try {
      const decoded = await keyManagement.verifyToken(token);
      
      // 记录登出
      await keyManagement.logAccess({
        userId: decoded.userId,
        action: 'logout',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true
      });

      logger.info('User logout', {
        userId: decoded.userId,
        username: decoded.username,
        ip: req.ip
      });

    } catch (error) {
      // 令牌无效，但仍然允许登出
      logger.warn('Logout with invalid token', {
        ip: req.ip,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: '登出成功'
  });
}));

/**
 * GET /auth/me
 * 获取当前用户信息
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('缺少访问令牌');
  }

  const keyManagement = req.app.locals.services.keyManagement;
  const database = req.app.locals.services.database;

  try {
    const decoded = await keyManagement.verifyToken(token);
    
    // 从数据库获取最新用户信息
    const user = await database.get(
      'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      throw new AuthenticationError('用户不存在或已被禁用');
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}));

/**
 * PUT /auth/password
 * 修改密码
 */
router.put('/password', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('缺少访问令牌');
  }

  const passwordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  });

  const { error, value } = passwordSchema.validate(req.body);
  if (error) {
    throw new ValidationError('密码数据验证失败', error.details);
  }

  const { currentPassword, newPassword } = value;
  const keyManagement = req.app.locals.services.keyManagement;
  const database = req.app.locals.services.database;
  const logger = req.app.locals.services.logger;

  try {
    const decoded = keyManagement.verifyToken(token);
    
    // 获取用户信息
    const user = await database.get(
      'SELECT id, username, password_hash FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      throw new AuthenticationError('用户不存在');
    }

    // 验证当前密码
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      throw new AuthenticationError('当前密码错误');
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await database.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, user.id]
    );

    // 记录密码修改
    await keyManagement.logAccess({
      userId: user.id,
      action: 'password_change',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('Password changed', {
      userId: user.id,
      username: user.username,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    logger.warn('Password change failed', {
      ip: req.ip,
      error: error.message
    });

    throw error;
  }
}));

/**
 * GET /auth/sessions
 * 获取用户会话列表
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('缺少访问令牌');
  }

  const keyManagement = req.app.locals.services.keyManagement;
  const database = req.app.locals.services.database;

  try {
    const decoded = keyManagement.verifyToken(token);
    
    // 获取用户最近的登录会话
    const sessions = await database.query(`
      SELECT 
        ip_address,
        user_agent,
        created_at,
        success
      FROM access_logs 
      WHERE user_id = ? AND action IN ('login_success', 'login_failed')
      ORDER BY created_at DESC 
      LIMIT 20
    `, [decoded.userId]);

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        timestamp: session.created_at,
        success: session.success === 1
      }))
    });

  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}));

export default router;