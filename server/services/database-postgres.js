import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';

/**
 * PostgreSQL数据库服务
 * 提供PostgreSQL数据库的连接和操作功能
 */
export class DatabaseService {
  constructor(options = {}) {
    // 确保密码是字符串类型
    const password = options.password || process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '';
    
    this.config = {
      host: options.host || process.env.DB_HOST || 'postgres',
      port: parseInt(options.port || process.env.DB_PORT || 5432),
      database: options.database || process.env.DB_NAME || 'secure_frontend',
      user: options.user || process.env.DB_USER || 'postgres',
      password: password ? password.toString() : '',
      max: options.max || 20,
      idleTimeoutMillis: options.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: options.connectionTimeoutMillis || 2000,
      ssl: false,
      ...options
    };

    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('数据库已经初始化，跳过');
        return;
      }

      console.log('开始初始化PostgreSQL数据库服务...');
      console.log(`数据库连接: ${this.config.host}:${this.config.port}/${this.config.database}`);
      console.log(`数据库配置:`, {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: typeof this.config.password,
        passwordLength: this.config.password ? this.config.password.length : 0,
        passwordValue: this.config.password,
        envDBPassword: process.env.DB_PASSWORD,
        envPostgresPassword: process.env.POSTGRES_PASSWORD
      });

      // 创建连接池
      this.pool = new Pool(this.config);

      // 测试连接
      const client = await this.pool.connect();
      console.log('PostgreSQL数据库连接已建立');
      
      // 释放测试连接
      client.release();

      // 初始化数据库表
      await this.initializeTables();
      console.log('数据库表初始化完成');

      this.isInitialized = true;
      console.log(`PostgreSQL数据库服务初始化完成`);

    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw new Error(`数据库初始化失败: ${error.message}`);
    }
  }

  /**
   * 初始化数据库表
   */
  async initializeTables() {
    try {
      // 创建密钥管理表
      await this.execute(`
        CREATE TABLE IF NOT EXISTS keys (
          id SERIAL PRIMARY KEY,
          key_id VARCHAR(255) UNIQUE NOT NULL,
          encrypted_key TEXT NOT NULL,
          algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // 创建索引
      await this.execute(`
        CREATE INDEX IF NOT EXISTS idx_keys_key_id ON keys(key_id);
        CREATE INDEX IF NOT EXISTS idx_keys_active ON keys(is_active);
        CREATE INDEX IF NOT EXISTS idx_keys_expires_at ON keys(expires_at);
      `);

      // 创建用户会话表
      await this.execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL
        )
      `);

      // 创建索引
      await this.execute(`
        CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
      `);

      console.log('数据库表结构创建完成');

    } catch (error) {
      throw new Error(`数据库表初始化失败: ${error.message}`);
    }
  }

  /**
   * 执行SQL查询（返回结果）
   */
  async query(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('数据库未初始化');
      }

      const result = await this.pool.query(sql, params);
      return result.rows;

    } catch (error) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }

  /**
   * 执行SQL语句（不返回结果，用于INSERT、UPDATE、DELETE）
   */
  async execute(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('数据库未初始化');
      }

      const result = await this.pool.query(sql, params);
      return result.rowCount;

    } catch (error) {
      throw new Error(`SQL执行失败: ${error.message}`);
    }
  }

  /**
   * 获取单条记录
   */
  async get(sql, params = []) {
    try {
      const results = await this.query(sql, params);
      return results.length > 0 ? results[0] : null;

    } catch (error) {
      throw new Error(`获取记录失败: ${error.message}`);
    }
  }

  /**
   * 插入记录并返回ID
   */
  async insert(table, data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      
      const sql = `
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING id
      `;

      const result = await this.query(sql, values);
      return result[0]?.id;

    } catch (error) {
      throw new Error(`插入记录失败: ${error.message}`);
    }
  }

  /**
   * 更新记录
   */
  async update(table, data, where, whereParams = []) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      const whereClause = where;
      
      const sql = `
        UPDATE ${table}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE ${whereClause}
      `;

      const allParams = [...values, ...whereParams];
      return await this.execute(sql, allParams);

    } catch (error) {
      throw new Error(`更新记录失败: ${error.message}`);
    }
  }

  /**
   * 删除记录
   */
  async delete(table, where, whereParams = []) {
    try {
      const sql = `DELETE FROM ${table} WHERE ${where}`;
      return await this.execute(sql, whereParams);

    } catch (error) {
      throw new Error(`删除记录失败: ${error.message}`);
    }
  }

  /**
   * 开始事务
   */
  async beginTransaction() {
    try {
      const client = await this.pool.connect();
      await client.query('BEGIN');
      return client;

    } catch (error) {
      throw new Error(`开始事务失败: ${error.message}`);
    }
  }

  /**
   * 提交事务
   */
  async commitTransaction(client) {
    try {
      await client.query('COMMIT');
      client.release();

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw new Error(`提交事务失败: ${error.message}`);
    }
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(client) {
    try {
      await client.query('ROLLBACK');
      client.release();

    } catch (error) {
      client.release();
      throw new Error(`回滚事务失败: ${error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.length > 0 && result[0].health === 1;

    } catch (error) {
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats() {
    try {
      const stats = await this.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY schemaname, tablename
      `);

      const connections = await this.query(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      return {
        tables: stats,
        activeConnections: connections[0]?.active_connections || 0,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      };

    } catch (error) {
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 备份数据库
   */
  async backup(backupPath) {
    try {
      // 注意：这需要在容器中安装pg_dump
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const command = `pg_dump -h ${this.config.host} -p ${this.config.port} -U ${this.config.user} -d ${this.config.database} > ${backupPath}`;
      
      await execAsync(command, {
        env: { ...process.env, PGPASSWORD: this.config.password }
      });

      console.log(`数据库备份完成: ${backupPath}`);

    } catch (error) {
      throw new Error(`数据库备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复数据库
   */
  async restore(backupPath) {
    try {
      // 检查备份文件是否存在
      await fs.access(backupPath);

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const command = `psql -h ${this.config.host} -p ${this.config.port} -U ${this.config.user} -d ${this.config.database} < ${backupPath}`;
      
      await execAsync(command, {
        env: { ...process.env, PGPASSWORD: this.config.password }
      });

      console.log(`数据库恢复完成: ${backupPath}`);

    } catch (error) {
      throw new Error(`数据库恢复失败: ${error.message}`);
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isInitialized = false;
        console.log('PostgreSQL数据库连接已关闭');
      }

    } catch (error) {
      console.error('关闭数据库连接失败:', error);
      throw new Error(`关闭数据库连接失败: ${error.message}`);
    }
  }
}

export default DatabaseService;