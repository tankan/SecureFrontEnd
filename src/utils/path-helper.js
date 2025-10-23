/**
 * 跨平台路径处理工具
 * 确保在所有环境中使用Linux风格路径分隔符
 */

import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录（ES模块兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 强制使用Linux风格路径分隔符
 * @param {string} inputPath - 输入路径
 * @returns {string} - 标准化的Linux风格路径
 */
export function normalizePath(inputPath) {
  if (!inputPath) return '';
  
  // 将所有反斜杠替换为正斜杠
  return inputPath.replace(/\\/g, '/');
}

/**
 * 连接路径并标准化为Linux风格
 * @param {...string} paths - 要连接的路径片段
 * @returns {string} - 标准化的路径
 */
export function joinPath(...paths) {
  const joined = path.join(...paths);
  return normalizePath(joined);
}

/**
 * 解析相对路径为绝对路径（Linux风格）
 * @param {string} relativePath - 相对路径
 * @param {string} basePath - 基础路径（可选，默认为当前工作目录）
 * @returns {string} - 绝对路径
 */
export function resolvePath(relativePath, basePath = process.cwd()) {
  const resolved = path.resolve(basePath, relativePath);
  return normalizePath(resolved);
}

/**
 * 获取项目根目录路径
 * @returns {string} - 项目根目录的绝对路径
 */
export function getProjectRoot() {
  // 从当前文件位置向上查找package.json
  let currentDir = __dirname;
  
  while (currentDir !== path.dirname(currentDir)) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      // 检查package.json是否存在
      if (require('fs').existsSync(packageJsonPath)) {
        return normalizePath(currentDir);
      }
    } catch (error) {
      // 继续向上查找
    }
    currentDir = path.dirname(currentDir);
  }
  
  // 如果找不到package.json，返回当前工作目录
  return normalizePath(process.cwd());
}

/**
 * 获取相对于项目根目录的路径
 * @param {string} absolutePath - 绝对路径
 * @returns {string} - 相对于项目根目录的路径
 */
export function getRelativeToRoot(absolutePath) {
  const projectRoot = getProjectRoot();
  const relative = path.relative(projectRoot, absolutePath);
  return normalizePath(relative);
}

/**
 * 构建配置文件路径
 * @param {string} configFile - 配置文件名
 * @param {string} environment - 环境名称（可选）
 * @returns {string} - 配置文件的完整路径
 */
export function getConfigPath(configFile, environment = null) {
  const projectRoot = getProjectRoot();
  
  if (environment) {
    // 环境特定的配置文件
    const envConfigFile = configFile.replace(/(\.[^.]+)$/, `.${environment}$1`);
    return joinPath(projectRoot, 'config', envConfigFile);
  }
  
  return joinPath(projectRoot, 'config', configFile);
}

/**
 * 构建日志文件路径
 * @param {string} logFile - 日志文件名
 * @param {string} environment - 环境名称（可选）
 * @returns {string} - 日志文件的完整路径
 */
export function getLogPath(logFile, environment = 'development') {
  const projectRoot = getProjectRoot();
  return joinPath(projectRoot, 'logs', environment, logFile);
}

/**
 * 构建临时文件路径
 * @param {string} tempFile - 临时文件名
 * @returns {string} - 临时文件的完整路径
 */
export function getTempPath(tempFile) {
  const projectRoot = getProjectRoot();
  return joinPath(projectRoot, 'temp', tempFile);
}

/**
 * 构建上传文件路径
 * @param {string} uploadFile - 上传文件名
 * @returns {string} - 上传文件的完整路径
 */
export function getUploadPath(uploadFile) {
  const projectRoot = getProjectRoot();
  return joinPath(projectRoot, 'uploads', uploadFile);
}

/**
 * 检查路径是否为绝对路径
 * @param {string} inputPath - 输入路径
 * @returns {boolean} - 是否为绝对路径
 */
export function isAbsolutePath(inputPath) {
  return path.isAbsolute(inputPath);
}

/**
 * 获取文件扩展名
 * @param {string} filePath - 文件路径
 * @returns {string} - 文件扩展名
 */
export function getFileExtension(filePath) {
  return path.extname(filePath);
}

/**
 * 获取文件名（不含扩展名）
 * @param {string} filePath - 文件路径
 * @returns {string} - 文件名
 */
export function getFileName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * 获取目录名
 * @param {string} filePath - 文件路径
 * @returns {string} - 目录名
 */
export function getDirName(filePath) {
  return normalizePath(path.dirname(filePath));
}

/**
 * 创建安全的文件路径（防止路径遍历攻击）
 * @param {string} basePath - 基础路径
 * @param {string} userPath - 用户提供的路径
 * @returns {string} - 安全的文件路径
 */
export function createSafePath(basePath, userPath) {
  // 移除危险字符和路径遍历尝试
  const sanitized = userPath.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
  const resolved = path.resolve(basePath, sanitized);
  const normalized = normalizePath(resolved);
  
  // 确保结果路径在基础路径内
  if (!normalized.startsWith(normalizePath(basePath))) {
    throw new Error('Invalid path: Path traversal detected');
  }
  
  return normalized;
}

/**
 * 环境特定的路径处理
 */
export const PathHelper = {
  // 开发环境路径
  dev: {
    logs: (file) => getLogPath(file, 'development'),
    config: (file) => getConfigPath(file, 'dev'),
    temp: getTempPath,
    uploads: getUploadPath
  },
  
  // 测试环境路径
  staging: {
    logs: (file) => getLogPath(file, 'staging'),
    config: (file) => getConfigPath(file, 'staging'),
    temp: getTempPath,
    uploads: getUploadPath
  },
  
  // 生产环境路径
  production: {
    logs: (file) => getLogPath(file, 'production'),
    config: (file) => getConfigPath(file, 'production'),
    temp: getTempPath,
    uploads: getUploadPath
  }
};

/**
 * 平台检测和路径适配
 */
export const PlatformAdapter = {
  /**
   * 检测当前平台
   * @returns {string} - 平台名称
   */
  getPlatform() {
    return process.platform;
  },
  
  /**
   * 是否为Linux平台
   * @returns {boolean}
   */
  isLinux() {
    return process.platform === 'linux';
  },
  
  /**
   * 是否为macOS平台
   * @returns {boolean}
   */
  isMacOS() {
    return process.platform === 'darwin';
  },
  
  /**
   * 是否为Windows平台
   * @returns {boolean}
   */
  isWindows() {
    return process.platform === 'win32';
  },
  
  /**
   * 获取平台特定的可执行文件扩展名
   * @returns {string}
   */
  getExecutableExtension() {
    return this.isWindows() ? '.exe' : '';
  },
  
  /**
   * 获取平台特定的脚本扩展名
   * @returns {string}
   */
  getScriptExtension() {
    return this.isWindows() ? '.bat' : '.sh';
  },
  
  /**
   * 适配命令行命令
   * @param {string} command - 基础命令
   * @returns {string} - 平台适配后的命令
   */
  adaptCommand(command) {
    if (this.isWindows()) {
      // Windows特定的命令适配
      return command.replace(/\//g, '\\');
    }
    return command;
  }
};

export default {
  normalizePath,
  joinPath,
  resolvePath,
  getProjectRoot,
  getRelativeToRoot,
  getConfigPath,
  getLogPath,
  getTempPath,
  getUploadPath,
  isAbsolutePath,
  getFileExtension,
  getFileName,
  getDirName,
  createSafePath,
  PathHelper,
  PlatformAdapter
};