import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/error.js';
import { requireRole, requireOwnerOrAdmin } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

/**
 * 验证模式
 */
const generateKeySchema = Joi.object({
  purpose: Joi.string().valid('resource_encryption', 'data_encryption', 'communication').default('resource_encryption'),
  algorithm: Joi.string().valid('aes-256-gcm', 'aes-256-cbc').default('aes-256-gcm'),
  resourceId: Joi.string().optional(),
  expiresIn: Joi.string().pattern(/^\d+[hdm]$/).optional() // 如 "7d", "24h", "30m"
});

const rotateKeySchema = Joi.object({
  keyId: Joi.string().required(),
  newPurpose: Joi.string().valid('resource_encryption', 'data_encryption', 'communication').optional(),
  newAlgorithm: Joi.string().valid('aes-256-gcm', 'aes-256-cbc').optional()
});

/**
 * GET /keys
 * 获取用户的密钥列表
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  // 解析查询参数
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const purpose = req.query.purpose;
  const algorithm = req.query.algorithm;

  try {
    // 获取用户密钥列表
    const keys = await keyManagement.listUserKeys(userId, {
      limit,
      offset,
      purpose,
      algorithm
    });

    // 记录访问
    await keyManagement.logAccess({
      userId,
      action: 'list_keys',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('User keys listed', {
      userId,
      count: keys.length,
      page,
      limit
    });

    res.json({
      success: true,
      keys: keys,
      pagination: {
        page,
        limit,
        total: keys.length,
        hasMore: keys.length === limit
      }
    });

  } catch (error) {
    logger.error('Failed to list user keys', {
      userId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * POST /keys/generate
 * 生成新的加密密钥
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  // 验证请求数据
  const { error, value } = generateKeySchema.validate(req.body);
  if (error) {
    throw new ValidationError('密钥生成参数验证失败', error.details);
  }

  const { purpose, algorithm, resourceId, expiresIn } = value;

  try {
    // 计算过期时间
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = calculateExpirationTime(expiresIn);
    }

    // 生成密钥
    const keyInfo = await keyManagement.generateKey({
      userId,
      purpose,
      algorithm,
      resourceId,
      expiresAt
    });

    // 记录密钥生成
    await keyManagement.logAccess({
      userId,
      keyId: keyInfo.keyId,
      action: 'key_generation',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('Key generated', {
      userId,
      keyId: keyInfo.keyId,
      purpose,
      algorithm,
      resourceId
    });

    res.status(201).json({
      success: true,
      message: '密钥生成成功',
      key: {
        keyId: keyInfo.keyId,
        algorithm: keyInfo.algorithm,
        purpose: keyInfo.purpose,
        expiresAt: keyInfo.expiresAt,
        createdAt: keyInfo.createdAt
      }
    });

  } catch (error) {
    logger.error('Failed to generate key', {
      userId,
      purpose,
      algorithm,
      error: error.message
    });
    throw error;
  }
}));

/**
 * GET /keys/:keyId
 * 获取特定密钥信息（不包含实际密钥数据）
 */
router.get('/:keyId', requireOwnerOrAdmin(), asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const database = req.app.locals.services.database;
  const logger = req.app.locals.services.logger;

  try {
    // 获取密钥信息（不包含实际密钥数据）
    const keyRecord = await database.get(`
      SELECT 
        key_id, 
        user_id, 
        resource_id, 
        algorithm, 
        purpose, 
        is_active, 
        expires_at, 
        created_at, 
        rotated_at
      FROM encryption_keys 
      WHERE key_id = ? AND is_active = 1
    `, [keyId]);

    if (!keyRecord) {
      throw new NotFoundError('密钥不存在');
    }

    // 检查权限（非管理员只能访问自己的密钥）
    if (req.user.role !== 'admin' && keyRecord.user_id !== userId) {
      throw new AuthorizationError('无权访问此密钥');
    }

    // 记录访问
    await keyManagement.logAccess({
      userId,
      keyId,
      action: 'key_info_access',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    logger.info('Key info accessed', {
      userId,
      keyId,
      purpose: keyRecord.purpose
    });

    res.json({
      success: true,
      key: {
        keyId: keyRecord.key_id,
        userId: keyRecord.user_id,
        resourceId: keyRecord.resource_id,
        algorithm: keyRecord.algorithm,
        purpose: keyRecord.purpose,
        isActive: keyRecord.is_active === 1,
        expiresAt: keyRecord.expires_at,
        createdAt: keyRecord.created_at,
        rotatedAt: keyRecord.rotated_at,
        isExpired: keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)
      }
    });

  } catch (error) {
    logger.error('Failed to get key info', {
      userId,
      keyId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * GET /keys/:keyId/data
 * 获取密钥数据（需要特殊权限）
 */
router.get('/:keyId/data', requireOwnerOrAdmin(), asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  try {
    // 获取完整密钥信息
    const keyInfo = await keyManagement.getKey(keyId, {
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('Key data accessed', {
      userId,
      keyId,
      purpose: keyInfo.purpose
    });

    // 将密钥数据转换为可传输格式
    const keyDataHex = Buffer.from(keyInfo.keyData).toString('hex');

    res.json({
      success: true,
      keyData: {
        keyId: keyInfo.keyId,
        keyData: keyDataHex,
        algorithm: keyInfo.algorithm,
        purpose: keyInfo.purpose,
        expiresAt: keyInfo.expiresAt
      }
    });

  } catch (error) {
    logger.error('Failed to get key data', {
      userId,
      keyId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * POST /keys/rotate
 * 轮换密钥
 */
router.post('/rotate', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  // 验证请求数据
  const { error, value } = rotateKeySchema.validate(req.body);
  if (error) {
    throw new ValidationError('密钥轮换参数验证失败', error.details);
  }

  const { keyId, newPurpose, newAlgorithm } = value;

  try {
    // 检查密钥所有权
    const database = req.app.locals.services.database;
    const keyRecord = await database.get(
      'SELECT user_id FROM encryption_keys WHERE key_id = ? AND is_active = 1',
      [keyId]
    );

    if (!keyRecord) {
      throw new NotFoundError('密钥不存在');
    }

    if (req.user.role !== 'admin' && keyRecord.user_id !== userId) {
      throw new AuthorizationError('无权轮换此密钥');
    }

    // 执行密钥轮换
    const newKey = await keyManagement.rotateKey(keyId, {
      userId,
      newPurpose,
      newAlgorithm
    });

    logger.info('Key rotated', {
      userId,
      oldKeyId: keyId,
      newKeyId: newKey.keyId,
      purpose: newKey.purpose
    });

    res.json({
      success: true,
      message: '密钥轮换成功',
      oldKeyId: keyId,
      newKey: {
        keyId: newKey.keyId,
        algorithm: newKey.algorithm,
        purpose: newKey.purpose,
        expiresAt: newKey.expiresAt,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to rotate key', {
      userId,
      keyId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * DELETE /keys/:keyId
 * 删除密钥
 */
router.delete('/:keyId', requireOwnerOrAdmin(), asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const database = req.app.locals.services.database;
  const logger = req.app.locals.services.logger;

  try {
    // 检查密钥所有权
    const keyRecord = await database.get(
      'SELECT user_id, purpose FROM encryption_keys WHERE key_id = ? AND is_active = 1',
      [keyId]
    );

    if (!keyRecord) {
      throw new NotFoundError('密钥不存在');
    }

    if (req.user.role !== 'admin' && keyRecord.user_id !== userId) {
      throw new AuthorizationError('无权删除此密钥');
    }

    // 删除密钥
    await keyManagement.deleteKey(keyId, {
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('Key deleted', {
      userId,
      keyId,
      purpose: keyRecord.purpose
    });

    res.json({
      success: true,
      message: '密钥删除成功'
    });

  } catch (error) {
    logger.error('Failed to delete key', {
      userId,
      keyId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * GET /keys/:keyId/usage
 * 获取密钥使用统计
 */
router.get('/:keyId/usage', requireOwnerOrAdmin(), asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const userId = req.user.userId;
  const database = req.app.locals.services.database;
  const logger = req.app.locals.services.logger;

  try {
    // 检查密钥所有权
    const keyRecord = await database.get(
      'SELECT user_id FROM encryption_keys WHERE key_id = ? AND is_active = 1',
      [keyId]
    );

    if (!keyRecord) {
      throw new NotFoundError('密钥不存在');
    }

    if (req.user.role !== 'admin' && keyRecord.user_id !== userId) {
      throw new AuthorizationError('无权查看此密钥使用情况');
    }

    // 获取使用统计
    const usageStats = await database.query(`
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_used,
        success
      FROM access_logs 
      WHERE key_id = ?
      GROUP BY action, success
      ORDER BY count DESC
    `, [keyId]);

    // 获取最近的访问记录
    const recentAccess = await database.query(`
      SELECT 
        action,
        ip_address,
        user_agent,
        success,
        created_at
      FROM access_logs 
      WHERE key_id = ?
      ORDER BY created_at DESC 
      LIMIT 10
    `, [keyId]);

    logger.info('Key usage stats accessed', {
      userId,
      keyId
    });

    res.json({
      success: true,
      usage: {
        statistics: usageStats.map(stat => ({
          action: stat.action,
          count: stat.count,
          lastUsed: stat.last_used,
          success: stat.success === 1
        })),
        recentAccess: recentAccess.map(access => ({
          action: access.action,
          ipAddress: access.ip_address,
          userAgent: access.user_agent,
          success: access.success === 1,
          timestamp: access.created_at
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to get key usage stats', {
      userId,
      keyId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * POST /keys/batch-rotate
 * 批量轮换密钥
 */
router.post('/batch-rotate', requireRole(['admin']), asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const keyManagement = req.app.locals.services.keyManagement;
  const logger = req.app.locals.services.logger;

  const batchRotateSchema = Joi.object({
    keyIds: Joi.array().items(Joi.string()).min(1).max(50).optional(),
    purpose: Joi.string().valid('resource_encryption', 'data_encryption', 'communication').optional(),
    olderThan: Joi.string().pattern(/^\d+[hdm]$/).optional(), // 如 "7d", "24h"
    rotateAll: Joi.boolean().default(false)
  });

  const { error, value } = batchRotateSchema.validate(req.body);
  if (error) {
    throw new ValidationError('批量轮换参数验证失败', error.details);
  }

  const { keyIds, purpose, olderThan, rotateAll } = value;

  try {
    let results;

    if (rotateAll) {
      // 轮换所有密钥
      results = await keyManagement.rotateAllKeys({ userId });
    } else if (keyIds) {
      // 轮换指定密钥
      results = [];
      for (const keyId of keyIds) {
        try {
          const newKey = await keyManagement.rotateKey(keyId, { userId });
          results.push({
            oldKeyId: keyId,
            newKeyId: newKey.keyId,
            success: true
          });
        } catch (error) {
          results.push({
            oldKeyId: keyId,
            success: false,
            error: error.message
          });
        }
      }
    } else {
      // 根据条件轮换密钥
      const database = req.app.locals.services.database;
      let query = 'SELECT key_id FROM encryption_keys WHERE is_active = 1';
      const params = [];

      if (purpose) {
        query += ' AND purpose = ?';
        params.push(purpose);
      }

      if (olderThan) {
        const cutoffTime = calculateCutoffTime(olderThan);
        query += ' AND created_at < ?';
        params.push(cutoffTime);
      }

      const keysToRotate = await database.query(query, params);
      
      results = [];
      for (const keyRecord of keysToRotate) {
        try {
          const newKey = await keyManagement.rotateKey(keyRecord.key_id, { userId });
          results.push({
            oldKeyId: keyRecord.key_id,
            newKeyId: newKey.keyId,
            success: true
          });
        } catch (error) {
          results.push({
            oldKeyId: keyRecord.key_id,
            success: false,
            error: error.message
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Batch key rotation completed', {
      userId,
      totalKeys: results.length,
      successful: successCount,
      failed: failureCount
    });

    res.json({
      success: true,
      message: '批量密钥轮换完成',
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    logger.error('Failed to perform batch key rotation', {
      userId,
      error: error.message
    });
    throw error;
  }
}));

/**
 * 工具函数：计算过期时间
 */
function calculateExpirationTime(expiresIn) {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([hdm])$/);
  
  if (!match) {
    throw new Error('Invalid expiration format');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000);
    default:
      throw new Error('Invalid time unit');
  }
}

/**
 * 工具函数：计算截止时间
 */
function calculateCutoffTime(olderThan) {
  const now = new Date();
  const match = olderThan.match(/^(\d+)([hdm])$/);
  
  if (!match) {
    throw new Error('Invalid time format');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return new Date(now.getTime() - value * 60 * 60 * 1000).toISOString();
    case 'd':
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000).toISOString();
    case 'm':
      return new Date(now.getTime() - value * 60 * 1000).toISOString();
    default:
      throw new Error('Invalid time unit');
  }
}

export default router;