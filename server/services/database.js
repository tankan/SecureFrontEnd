import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { dirname } from 'path';
import fs from 'fs/promises';

/**
 * 数据库服务
 * 提供SQLite数据库的连接和操作功能
 */
export class DatabaseService {
  constructor(options = {}) {
    this.config = {
      url: options.url || 'sqlite:./data/keys.db',
      enableWAL: options.enableWAL ?? true,
      busyTimeout: options.busyTimeout || 30000,
      ...options
    };

    this.db = null;
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

      console.log('开始初始化数据库服务...');

      // 解析数据库URL
      const dbPath = this.config.url.replace('sqlite:', '');
      console.log(`数据库路径: ${dbPath}`);
      
      // 确保数据库目录存在
      const dbDir = dirname(dbPath);
      await fs.mkdir(dbDir, { recursive: true });
      console.log(`数据库目录已创建: ${dbDir}`);

      // 打开数据库连接
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      console.log('数据库连接已打开');

      // 配置数据库
      await this.configureDatabase();
      console.log('数据库配置完成');

      this.isInitialized = true;
      console.log(`数据库连接已建立: ${dbPath}`);

    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw new Error(`数据库初始化失败: ${error.message}`);
    }
  }

  /**
   * 配置数据库设置
   */
  async configureDatabase() {
    try {
      // 启用外键约束
      await this.db.exec('PRAGMA foreign_keys = ON');

      // 设置忙等待超时
      await this.db.exec(`PRAGMA busy_timeout = ${this.config.busyTimeout}`);

      // 启用WAL模式（Write-Ahead Logging）以提高并发性能
      if (this.config.enableWAL) {
        await this.db.exec('PRAGMA journal_mode = WAL');
      }

      // 设置同步模式
      await this.db.exec('PRAGMA synchronous = NORMAL');

      // 设置缓存大小（以页为单位，每页通常4KB）
      await this.db.exec('PRAGMA cache_size = -64000'); // 64MB缓存

      // 设置临时存储位置
      await this.db.exec('PRAGMA temp_store = MEMORY');

      // 启用查询优化器
      await this.db.exec('PRAGMA optimize');

    } catch (error) {
      throw new Error(`数据库配置失败: ${error.message}`);
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

      const result = await this.db.all(sql, params);
      return result;

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

      const result = await this.db.run(sql, params);
      return result;

    } catch (error) {
      throw new Error(`语句执行失败: ${error.message}`);
    }
  }

  /**
   * 获取单行结果
   */
  async get(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('数据库未初始化');
      }

      const result = await this.db.get(sql, params);
      return result;

    } catch (error) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }

  /**
   * 执行事务
   */
  async transaction(callback) {
    try {
      if (!this.isInitialized) {
        throw new Error('数据库未初始化');
      }

      await this.db.exec('BEGIN TRANSACTION');
      
      try {
        const result = await callback(this);
        await this.db.exec('COMMIT');
        return result;
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }

    } catch (error) {
      throw new Error(`事务执行失败: ${error.message}`);
    }
  }

  /**
   * 批量插入数据
   */
  async batchInsert(tableName, columns, data) {
    try {
      if (!this.isInitialized) {
        throw new Error('数据库未初始化');
      }

      if (!data || data.length === 0) {
        return { changes: 0, lastInsertRowid: null };
      }

      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      const stmt = await this.db.prepare(sql);
      
      let totalChanges = 0;
      let lastInsertRowid = null;

      await this.transaction(async () => {
        for (const row of data) {
          const result = await stmt.run(row);
          totalChanges += result.changes;
          lastInsertRowid = result.lastInsertRowid;
        }
      });

      await stmt.finalize();

      return { changes: totalChanges, lastInsertRowid };

    } catch (error) {
      throw new Error(`批量插入失败: ${error.message}`);
    }
  }

  /**
   * 创建索引
   */
  async createIndex(indexName, tableName, columns, options = {}) {
    try {
      const unique = options.unique ? 'UNIQUE' : '';
      const ifNotExists = options.ifNotExists !== false ? 'IF NOT EXISTS' : '';
      const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
      
      const sql = `CREATE ${unique} INDEX ${ifNotExists} ${indexName} ON ${tableName} (${columnList})`;
      
      await this.execute(sql);

    } catch (error) {
      throw new Error(`创建索引失败: ${error.message}`);
    }
  }

  /**
   * 获取表信息
   */
  async getTableInfo(tableName) {
    try {
      const result = await this.query(`PRAGMA table_info(${tableName})`);
      return result;

    } catch (error) {
      throw new Error(`获取表信息失败: ${error.message}`);
    }
  }

  /**
   * 检查表是否存在
   */
  async tableExists(tableName) {
    try {
      const result = await this.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      );
      return !!result;

    } catch (error) {
      throw new Error(`检查表存在性失败: ${error.message}`);
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats() {
    try {
      const stats = {};

      // 获取数据库大小
      const sizeResult = await this.get("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
      stats.databaseSize = sizeResult ? sizeResult.size : 0;

      // 获取表数量
      const tableResult = await this.query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
      stats.tableCount = tableResult[0] ? tableResult[0].count : 0;

      // 获取索引数量
      const indexResult = await this.query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'");
      stats.indexCount = indexResult[0] ? indexResult[0].count : 0;

      // 获取各表的记录数
      const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table'");
      stats.tableCounts = {};
      
      for (const table of tables) {
        try {
          const countResult = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`);
          stats.tableCounts[table.name] = countResult ? countResult.count : 0;
        } catch (error) {
          stats.tableCounts[table.name] = 'error';
        }
      }

      return stats;

    } catch (error) {
      throw new Error(`获取数据库统计信息失败: ${error.message}`);
    }
  }

  /**
   * 优化数据库
   */
  async optimize() {
    try {
      // 分析查询计划
      await this.db.exec('ANALYZE');
      
      // 优化数据库
      await this.db.exec('PRAGMA optimize');
      
      // 清理未使用的空间
      await this.db.exec('VACUUM');

    } catch (error) {
      throw new Error(`数据库优化失败: ${error.message}`);
    }
  }

  /**
   * 备份数据库
   */
  async backup(backupPath) {
    try {
      if (!this.isInitialized) {
        throw new Error('数据库未初始化');
      }

      // 确保备份目录存在
      const backupDir = dirname(backupPath);
      await fs.mkdir(backupDir, { recursive: true });

      // 执行备份
      await this.db.backup(backupPath);

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

      // 关闭当前连接
      if (this.db) {
        await this.db.close();
      }

      // 从备份恢复
      const backupDb = await open({
        filename: backupPath,
        driver: sqlite3.Database
      });

      await backupDb.backup(this.config.url.replace('sqlite:', ''));
      await backupDb.close();

      // 重新初始化
      await this.initialize();

    } catch (error) {
      throw new Error(`数据库恢复失败: ${error.message}`);
    }
  }

  /**
   * 执行数据库迁移
   */
  async migrate(migrations) {
    try {
      // 创建迁移表
      await this.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version VARCHAR(255) UNIQUE NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 获取已执行的迁移
      const executedMigrations = await this.query('SELECT version FROM migrations');
      const executedVersions = new Set(executedMigrations.map(m => m.version));

      // 执行未执行的迁移
      for (const migration of migrations) {
        if (!executedVersions.has(migration.version)) {
          await this.transaction(async () => {
            // 执行迁移SQL
            if (typeof migration.up === 'string') {
              await this.db.exec(migration.up);
            } else if (typeof migration.up === 'function') {
              await migration.up(this);
            }

            // 记录迁移
            await this.execute(
              'INSERT INTO migrations (version) VALUES (?)',
              [migration.version]
            );
          });

          console.log(`迁移 ${migration.version} 执行完成`);
        }
      }

    } catch (error) {
      throw new Error(`数据库迁移失败: ${error.message}`);
    }
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.isInitialized && this.db !== null;
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      
      this.isInitialized = false;
      console.log('数据库连接已关闭');

    } catch (error) {
      throw new Error(`关闭数据库连接失败: ${error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return { status: 'disconnected', message: '数据库未连接' };
      }

      // 执行简单查询测试连接
      await this.get('SELECT 1 as test');

      return { 
        status: 'healthy', 
        message: '数据库连接正常',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return { 
        status: 'error', 
        message: `数据库连接异常: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default DatabaseService;