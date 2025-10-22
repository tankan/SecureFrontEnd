// 加密模块统一入口文件
export { BaseEncryption } from './base-encryption.js';
export { AESEncryption } from './aes-encryption.js';
export { RSAEncryption } from './rsa-encryption.js';
export { FileEncryption } from './file-encryption.js';
export { QuantumEncryption } from './quantum-encryption.js';

// 导出主加密类
export { EncryptionCore } from '../encryption.js';

// 默认导出主加密类
import { EncryptionCore } from '../encryption.js';
export default EncryptionCore;
