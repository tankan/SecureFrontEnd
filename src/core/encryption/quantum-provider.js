import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';

/**
 * PQC Provider接口
 * 目标：开发/测试环境使用 liboqs-node，生产可替换为FIPS/NIST认证实现。
 */
export class PQCProvider {
  constructor(options = {}) {
    this.options = options;
    this.backend = null;
    this.available = false;

    // 算法配置（支持环境变量覆盖）
    this.signatureAlgorithm = process.env.PQC_SIG_ALG || options.signatureAlgorithm || 'ML-DSA-65';
    this.kemAlgorithm = process.env.PQC_KEM_ALG || options.kemAlgorithm || 'ML-KEM-768';

    // 在ESM环境中安全使用require
    const require = createRequire(import.meta.url);

    // 动态加载后端（优先使用 @skairipaapps/liboqs-node，其次 liboqs-node）
    try {
      const oqs = require('@skairipaapps/liboqs-node');
      this.backend = oqs;
      this.available = true;
      logger.info('PQCProvider: 已加载 @skairipaapps/liboqs-node 后端');
    } catch (e1) {
      try {
        const oqs = require('liboqs-node');
        this.backend = oqs;
        this.available = true;
        logger.info('PQCProvider: 已加载 liboqs-node 后端');
      } catch (e2) {
        logger.warn('PQCProvider: 未找到 liboqs-node 后端（请安装 @skairipaapps/liboqs-node 或 liboqs-node）');
      }
    }
  }

  isAvailable() {
    return !!this.available && !!this.backend;
  }

  getAlgorithmsInfo() {
    if (!this.isAvailable()) return null;
    const { Sigs, Kems } = this.backend;
    const sigs = Sigs?.getEnabledAlgorithms?.() || [];
    const kems = Kems?.getEnabledAlgorithms?.() || [];
    return { sigs, kems, selected: { signature: this.signatureAlgorithm, kem: this.kemAlgorithm } };
  }

  // ML-DSA(Dilithium) 密钥对生成
  generateDilithiumKeyPair() {
    if (!this.isAvailable()) return null;
    const { Signature } = this.backend;
    const sig = new Signature(this.signatureAlgorithm);
    const publicKey = sig.generateKeypair();
    const privateKey = sig.exportSecretKey();
    return { publicKey, privateKey };
  }

  // ML-DSA(Dilithium) 签名（使用传入私钥）
  signDilithium(messageBuffer, privateKey) {
    if (!this.isAvailable()) return null;
    const { Signature } = this.backend;
    const sig = new Signature(this.signatureAlgorithm, privateKey);
    const signature = sig.sign(messageBuffer);
    return signature;
  }

  // ML-DSA(Dilithium) 验证（使用传入公钥）
  verifyDilithium(messageBuffer, signature, publicKey) {
    if (!this.isAvailable()) return null;
    const { Signature } = this.backend;
    const sig = new Signature(this.signatureAlgorithm);
    const ok = sig.verify(messageBuffer, signature, publicKey);
    return ok;
  }

  // ML-KEM(Kyber) 密钥对生成
  generateKyberKeyPair() {
    if (!this.isAvailable()) return null;
    const { KeyEncapsulation } = this.backend;
    const kem = new KeyEncapsulation(this.kemAlgorithm);
    const publicKey = kem.generateKeypair();
    const privateKey = kem.exportSecretKey ? kem.exportSecretKey() : kem.exportSecretKey?.();
    return { publicKey, privateKey };
  }

  // ML-KEM(Kyber) 封装共享密钥
  encapsulateKyber(publicKey) {
    if (!this.isAvailable()) return null;
    const { KeyEncapsulation } = this.backend;
    const kem = new KeyEncapsulation(this.kemAlgorithm);
    const { ciphertext, sharedSecret } = kem.encapsulateSecret(publicKey);
    return { ciphertext, sharedSecret };
  }

  // ML-KEM(Kyber) 解封装共享密钥
  decapsulateKyber(ciphertext, privateKey) {
    if (!this.isAvailable()) return null;
    const { KeyEncapsulation } = this.backend;
    const kem = new KeyEncapsulation(this.kemAlgorithm, privateKey);
    const sharedSecret = kem.decapsulateSecret(ciphertext);
    return { sharedSecret };
  }
}