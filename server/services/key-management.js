import crypto from 'crypto';
import { EventEmitter } from 'events';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

/**
 * 密钥管理服务
 * 负责密钥的生成、存储、轮换和分发
 */
export class KeyManagementService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      masterKey: options.masterKey || this.generateMasterKey(),
      keyRotationInterval: options.keyRotationInterval || '7d', // 7天
      keyDerivationIterations: options.keyDerivationIterations || 100000,
      keySize: options.keySize || 32, // 256 bits
      algorithm: options.algorithm || 'aes-256-gcm',
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
      jwtExpiresIn: options.jwtExpiresIn || '24h',
      ...options
    };

    this.database = options.database;
    this.keyCache = new Map();
    this.rotationTimer = null;
    this.isInitialized = false;
  }

  /**
   * 初始化密钥管理服务
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('密钥管理服务已经初始化，跳过');
        return;
      }

      console.log('开始初始化密钥管理服务...');

      // 检查数据库实例
      if (!this.database) {
        throw new Error('数据库实例未提供');
      }

      if (!this.database.isInitialized) {
        throw new Error('数据库服务未初始化');
      }

      console.log('数据库实例检查通过');

      // 确保数据库表存在
      console.log('开始创建数据库表...');
      await this.createTables();
      console.log('数据库表创建完成');

      // 加载现有密钥到缓存
      console.log('开始加载密钥到缓存...');
      await this.loadKeysToCache();
      console.log('密钥缓存加载完成');

      // 启动密钥轮换定时器
      console.log('启动密钥轮换定时器...');
      this.startKeyRotation();

      this.isInitialized = true;
      this.emit('initialized');
      console.log('密钥管理服务初始化完成');
      
    } catch (error) {
      console.error('密钥管理服务初始化失败:', error);
      throw new Error(`密钥管理服务初始化失败: ${error.message}`);
    }
  }

  /**
   * 创建数据库表
   */
  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createKeysTable = `
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER,
        resource_id VARCHAR(255),
        key_data TEXT NOT NULL,
        algorithm VARCHAR(50) NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        rotated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    const createResourcesTable = `
      CREATE TABLE IF NOT EXISTS encrypted_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        encrypted_path VARCHAR(500) NOT NULL,
        cloud_provider VARCHAR(50),
        cloud_path VARCHAR(500),
        file_size INTEGER,
        encryption_algorithm VARCHAR(50) NOT NULL,
        checksum VARCHAR(255),
        metadata TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    const createAccessLogsTable = `
      CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resource_id VARCHAR(255),
        key_id VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    await this.database.execute(createUsersTable);
    await this.database.execute(createKeysTable);
    await this.database.execute(createResourcesTable);
    await this.database.execute(createAccessLogsTable);
  }

  /**
   * 生成主密钥
   */
  generateMasterKey() {
    return crypto.randomBytes(32);
  }

  /**
   * 生成新的加密密钥
   */
  async generateKey(options = {}) {
    try {
      const keyId = options.keyId || this.generateKeyId();
      const purpose = options.purpose || 'resource_encryption';
      const algorithm = options.algorithm || this.config.algorithm;
      const expiresAt = options.expiresAt || this.calculateExpiration();

      // 生成密钥数据
      const keyData = crypto.randomBytes(this.config.keySize);
      
      // 加密密钥数据用于存储
      const encryptedKeyData = this.encryptKeyData(keyData);

      // 存储到数据库
      const query = `
        INSERT INTO encryption_keys 
        (key_id, user_id, resource_id, key_data, algorithm, purpose, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.database.execute(query, [
        keyId,
        options.userId || null,
        options.resourceId || null,
        encryptedKeyData,
        algorithm,
        purpose,
        expiresAt
      ]);

      // 添加到缓存
      this.keyCache.set(keyId, {
        keyId,
        keyData,
        algorithm,
        purpose,
        expiresAt,
        createdAt: new Date()
      });

      this.emit('keyGenerated', { keyId, purpose, algorithm });

      return {
        keyId,
        keyData,
        algorithm,
        purpose,
        expiresAt
      };

    } catch (error) {
      throw new Error(`生成密钥失败: ${error.message}`);
    }
  }

  /**
   * 获取密钥
   */
  async getKey(keyId, options = {}) {
    try {
      // 首先检查缓存
      if (this.keyCache.has(keyId)) {
        const cachedKey = this.keyCache.get(keyId);
        
        // 检查密钥是否过期
        if (cachedKey.expiresAt && new Date() > new Date(cachedKey.expiresAt)) {
          this.keyCache.delete(keyId);
          throw new Error('密钥已过期');
        }

        // 记录访问日志
        await this.logAccess({
          keyId,
          action: 'key_access',
          success: true,
          ...options
        });

        return cachedKey;
      }

      // 从数据库加载
      const query = `
        SELECT * FROM encryption_keys 
        WHERE key_id = ? AND is_active = 1
      `;
      
      const result = await this.database.query(query, [keyId]);
      
      if (!result || result.length === 0) {
        throw new Error('密钥不存在');
      }

      const keyRecord = result[0];
      
      // 检查密钥是否过期
      if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)) {
        throw new Error('密钥已过期');
      }

      // 解密密钥数据
      const keyData = this.decryptKeyData(keyRecord.key_data);

      const keyInfo = {
        keyId: keyRecord.key_id,
        keyData,
        algorithm: keyRecord.algorithm,
        purpose: keyRecord.purpose,
        expiresAt: keyRecord.expires_at,
        createdAt: keyRecord.created_at
      };

      // 添加到缓存
      this.keyCache.set(keyId, keyInfo);

      // 记录访问日志
      await this.logAccess({
        keyId,
        action: 'key_access',
        success: true,
        ...options
      });

      return keyInfo;

    } catch (error) {
      // 记录失败的访问尝试
      await this.logAccess({
        keyId,
        action: 'key_access',
        success: false,
        errorMessage: error.message,
        ...options
      });

      throw new Error(`获取密钥失败: ${error.message}`);
    }
  }

  /**
   * 轮换密钥
   */
  async rotateKey(keyId, options = {}) {
    try {
      // 获取旧密钥信息
      const oldKey = await this.getKey(keyId);
      
      // 生成新密钥
      const newKey = await this.generateKey({
        purpose: oldKey.purpose,
        algorithm: oldKey.algorithm,
        userId: options.userId,
        resourceId: options.resourceId
      });

      // 标记旧密钥为非活跃状态
      const updateQuery = `
        UPDATE encryption_keys 
        SET is_active = 0, rotated_at = CURRENT_TIMESTAMP
        WHERE key_id = ?
      `;
      
      await this.database.execute(updateQuery, [keyId]);

      // 从缓存中移除旧密钥
      this.keyCache.delete(keyId);

      this.emit('keyRotated', { 
        oldKeyId: keyId, 
        newKeyId: newKey.keyId,
        purpose: oldKey.purpose 
      });

      return newKey;

    } catch (error) {
      throw new Error(`密钥轮换失败: ${error.message}`);
    }
  }

  /**
   * 批量轮换密钥
   */
  async rotateAllKeys(options = {}) {
    try {
      const query = `
        SELECT key_id, purpose FROM encryption_keys 
        WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;
      
      const activeKeys = await this.database.query(query);
      const rotationResults = [];

      for (const keyRecord of activeKeys) {
        try {
          const newKey = await this.rotateKey(keyRecord.key_id, options);
          rotationResults.push({
            oldKeyId: keyRecord.key_id,
            newKeyId: newKey.keyId,
            success: true
          });
        } catch (error) {
          rotationResults.push({
            oldKeyId: keyRecord.key_id,
            success: false,
            error: error.message
          });
        }
      }

      this.emit('bulkKeyRotation', { 
        totalKeys: activeKeys.length,
        successful: rotationResults.filter(r => r.success).length,
        failed: rotationResults.filter(r => !r.success).length,
        results: rotationResults
      });

      return rotationResults;

    } catch (error) {
      throw new Error(`批量密钥轮换失败: ${error.message}`);
    }
  }

  /**
   * 删除密钥
   */
  async deleteKey(keyId, options = {}) {
    try {
      const query = `
        UPDATE encryption_keys 
        SET is_active = 0 
        WHERE key_id = ?
      `;
      
      await this.database.execute(query, [keyId]);
      
      // 从缓存中移除
      this.keyCache.delete(keyId);

      // 记录访问日志
      await this.logAccess({
        keyId,
        action: 'key_deletion',
        success: true,
        ...options
      });

      this.emit('keyDeleted', { keyId });

    } catch (error) {
      throw new Error(`删除密钥失败: ${error.message}`);
    }
  }

  /**
   * 列出用户的密钥
   */
  async listUserKeys(userId, options = {}) {
    try {
      const query = `
        SELECT key_id, algorithm, purpose, expires_at, created_at, rotated_at
        FROM encryption_keys 
        WHERE user_id = ? AND is_active = 1
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      
      const keys = await this.database.query(query, [userId, limit, offset]);
      
      return keys.map(key => ({
        keyId: key.key_id,
        algorithm: key.algorithm,
        purpose: key.purpose,
        expiresAt: key.expires_at,
        createdAt: key.created_at,
        rotatedAt: key.rotated_at,
        isExpired: key.expires_at && new Date() > new Date(key.expires_at)
      }));

    } catch (error) {
      throw new Error(`列出用户密钥失败: ${error.message}`);
    }
  }

  /**
   * 用户认证
   */
  async authenticateUser(username, password) {
    try {
      const query = `
        SELECT id, username, email, password_hash, role, is_active
        FROM users 
        WHERE (username = ? OR email = ?) AND is_active = 1
      `;
      
      const result = await this.database.query(query, [username, username]);
      
      if (!result || result.length === 0) {
        throw new Error('用户不存在');
      }

      const user = result[0];
      
      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        throw new Error('密码错误');
      }

      // 生成JWT令牌 - 使用jose库
      const secret = new TextEncoder().encode(this.config.jwtSecret);
      const token = await new SignJWT({ 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(this.config.jwtExpiresIn)
        .sign(secret);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      };

    } catch (error) {
      throw new Error(`用户认证失败: ${error.message}`);
    }
  }

  /**
   * 注册用户
   */
  async registerUser(userData) {
    try {
      const { username, email, password, role = 'user' } = userData;
      
      // 检查用户是否已存在
      const existingUser = await this.database.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      
      if (existingUser && existingUser.length > 0) {
        throw new Error('用户名或邮箱已存在');
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 12);

      // 插入新用户
      const query = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await this.database.execute(query, [
        username, 
        email, 
        passwordHash, 
        role
      ]);

      return {
        id: result.lastInsertRowid,
        username,
        email,
        role
      };

    } catch (error) {
      throw new Error(`用户注册失败: ${error.message}`);
    }
  }

  /**
   * 验证JWT令牌 - 使用jose库
   */
  async verifyToken(token) {
    try {
      const secret = new TextEncoder().encode(this.config.jwtSecret);
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (error) {
      throw new Error('无效的访问令牌');
    }
  }

  /**
   * 记录访问日志
   */
  async logAccess(logData) {
    try {
      const query = `
        INSERT INTO access_logs 
        (user_id, resource_id, key_id, action, ip_address, user_agent, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.database.execute(query, [
        logData.userId || null,
        logData.resourceId || null,
        logData.keyId || null,
        logData.action,
        logData.ipAddress || null,
        logData.userAgent || null,
        logData.success ? 1 : 0,
        logData.errorMessage || null
      ]);

    } catch (error) {
      // 日志记录失败不应该影响主要功能
      console.error('记录访问日志失败:', error.message);
    }
  }

  /**
   * 加密密钥数据用于存储
   */
  encryptKeyData(keyData) {
    const cipher = crypto.createCipher('aes-256-gcm', this.config.masterKey);
    const iv = crypto.randomBytes(16);
    cipher.setAAD(Buffer.from('key-data'));
    
    let encrypted = cipher.update(keyData);
    cipher.final();
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([iv, encrypted, tag]).toString('base64');
  }

  /**
   * 解密存储的密钥数据
   */
  decryptKeyData(encryptedData) {
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.slice(0, 16);
    const tag = buffer.slice(-16);
    const encrypted = buffer.slice(16, -16);
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.config.masterKey);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('key-data'));
    
    let decrypted = decipher.update(encrypted);
    decipher.final();
    
    return decrypted;
  }

  /**
   * 生成密钥ID
   */
  generateKeyId() {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * 计算密钥过期时间
   */
  calculateExpiration() {
    const interval = this.config.keyRotationInterval;
    const now = new Date();
    
    if (interval.endsWith('d')) {
      const days = parseInt(interval);
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (interval.endsWith('h')) {
      const hours = parseInt(interval);
      return new Date(now.getTime() + hours * 60 * 60 * 1000);
    } else {
      // 默认7天
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * 加载密钥到缓存
   */
  async loadKeysToCache() {
    try {
      const query = `
        SELECT key_id, key_data, algorithm, purpose, expires_at, created_at
        FROM encryption_keys 
        WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;
      
      const keys = await this.database.query(query);
      
      for (const keyRecord of keys) {
        const keyData = this.decryptKeyData(keyRecord.key_data);
        
        this.keyCache.set(keyRecord.key_id, {
          keyId: keyRecord.key_id,
          keyData,
          algorithm: keyRecord.algorithm,
          purpose: keyRecord.purpose,
          expiresAt: keyRecord.expires_at,
          createdAt: keyRecord.created_at
        });
      }

    } catch (error) {
      console.error('加载密钥到缓存失败:', error.message);
    }
  }

  /**
   * 启动密钥轮换定时器
   */
  startKeyRotation() {
    const interval = this.parseInterval(this.config.keyRotationInterval);
    
    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateExpiredKeys();
      } catch (error) {
        console.error('自动密钥轮换失败:', error.message);
      }
    }, interval);
  }

  /**
   * 轮换过期密钥
   */
  async rotateExpiredKeys() {
    try {
      const query = `
        SELECT key_id FROM encryption_keys 
        WHERE is_active = 1 AND expires_at <= CURRENT_TIMESTAMP
      `;
      
      const expiredKeys = await this.database.query(query);
      
      for (const keyRecord of expiredKeys) {
        try {
          await this.rotateKey(keyRecord.key_id);
        } catch (error) {
          console.error(`轮换密钥 ${keyRecord.key_id} 失败:`, error.message);
        }
      }

    } catch (error) {
      console.error('轮换过期密钥失败:', error.message);
    }
  }

  /**
   * 解析时间间隔
   */
  parseInterval(interval) {
    if (interval.endsWith('d')) {
      return parseInt(interval) * 24 * 60 * 60 * 1000;
    } else if (interval.endsWith('h')) {
      return parseInt(interval) * 60 * 60 * 1000;
    } else if (interval.endsWith('m')) {
      return parseInt(interval) * 60 * 1000;
    } else {
      return 7 * 24 * 60 * 60 * 1000; // 默认7天
    }
  }

  /**
   * 停止服务
   */
  async stop() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    
    this.keyCache.clear();
    this.isInitialized = false;
    this.emit('stopped');
  }
}

export default KeyManagementService;