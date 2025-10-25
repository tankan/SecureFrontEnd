import crypto from 'crypto';
import { BaseEncryption } from './base-encryption.js';
import { logger } from '../../utils/logger.js';
import { PQCProvider } from './quantum-provider.js'

/**
 * 量子安全加密模块
 * 提供抗量子计算机攻击的加密算法
 */
export class QuantumEncryption extends BaseEncryption {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        super(options);
        this.kyberParams = options.kyberParams || {
            keySize: 1568, // Kyber-768 参数
            ciphertextSize: 1088,
            sharedSecretSize: 32
        };
        this.dilithiumParams = options.dilithiumParams || {
            publicKeySize: 1312, // Dilithium-2 参数
            privateKeySize: 2528,
            signatureSize: 2420
        };
        // 新增：PQC 后端提供者，仅用于真实实现
        this.pqcProvider = new PQCProvider({
            signatureAlgorithm: process.env.PQC_SIG_ALG || 'ML-DSA-65',
            kemAlgorithm: process.env.PQC_KEM_ALG || 'ML-KEM-768'
        });
    }

    /**
     * 生成Kyber密钥对（用于密钥封装）
     * @returns {Object} Kyber密钥对
     */
    generateKyberKeyPair() {
        try {
            // 模拟Kyber密钥生成（实际实现需要使用专门的量子安全库）
            const privateKey = crypto.randomBytes(this.kyberParams.keySize);
            const publicKey = this._deriveKyberPublicKey(privateKey);

            return {
                publicKey: publicKey.toString('hex'),
                privateKey: privateKey.toString('hex'),
                algorithm: 'kyber-768',
                keySize: this.kyberParams.keySize,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Kyber密钥对生成失败: ${error.message}`);
        }
    }

    /**
     * 生成Dilithium密钥对（用于数字签名）
     * @returns {Object} Dilithium密钥对
     */
    generateDilithiumKeyPair() {
        try {
            // 模拟Dilithium密钥生成（实际实现需要使用专门的量子安全库）
            const privateKey = crypto.randomBytes(this.dilithiumParams.privateKeySize);
            const publicKey = this._deriveDilithiumPublicKey(privateKey);

            return {
                publicKey: publicKey.toString('hex'),
                privateKey: privateKey.toString('hex'),
                algorithm: 'dilithium-2',
                publicKeySize: this.dilithiumParams.publicKeySize,
                privateKeySize: this.dilithiumParams.privateKeySize,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Dilithium密钥对生成失败: ${error.message}`);
        }
    }

    /**
     * 生成量子安全密钥对（Kyber + Dilithium）
     * @returns {Object} 完整的量子安全密钥对
     */
    generateQuantumSafeKeyPair() {
        try {
            const kyberKeys = this.generateKyberKeyPair();
            const dilithiumKeys = this.generateDilithiumKeyPair();

            return {
                kyber: kyberKeys,
                dilithium: dilithiumKeys,
                publicKey: kyberKeys.publicKey, // 默认返回Kyber公钥用于加密
                privateKey: kyberKeys.privateKey, // 默认返回Kyber私钥用于解密
                signPublicKey: dilithiumKeys.publicKey, // Dilithium公钥用于验证签名
                signPrivateKey: dilithiumKeys.privateKey, // Dilithium私钥用于签名
                algorithm: 'quantum-safe-hybrid',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`量子安全密钥对生成失败: ${error.message}`);
        }
    }

    /**
     * 量子安全混合加密
     * @param {Buffer|string} data - 要加密的数据
     * @param {string} kyberPublicKey - Kyber公钥（十六进制字符串）
     * @returns {Object} 加密结果
     */
    async quantumSafeEncrypt(data, kyberPublicKey) {
        try {
            const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
            const publicKeyBuffer = Buffer.from(kyberPublicKey, 'hex');

            // 1. 生成随机共享密钥
            const sharedSecret = crypto.randomBytes(this.kyberParams.sharedSecretSize);

            // 2. 使用Kyber封装共享密钥
            const encapsulatedKey = this._kyberEncapsulate(sharedSecret, publicKeyBuffer);

            // 3. 使用封装结果派生共享密钥并进行AES加密（模拟）
            const derivedSecret = encapsulatedKey.slice(0, this.kyberParams.sharedSecretSize);
            const iv = crypto.randomBytes(12);
            const gcmKey = derivedSecret.length === 32 ? derivedSecret : crypto.scryptSync(derivedSecret.toString('hex'), 'salt', 32);
            const cipher = crypto.createCipheriv('aes-256-gcm', gcmKey, iv);

            const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
            const authTag = cipher.getAuthTag();

            // 4. 组合结果
            const result = {
                encapsulatedKey: encapsulatedKey.toString('hex'),
                encryptedData: encrypted.toString('hex'),
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: 'kyber-aes-gcm',
                keySize: this.kyberParams.sharedSecretSize,
                timestamp: new Date().toISOString()
            };

            return result;
        } catch (error) {
            throw new Error(`量子安全加密失败: ${error.message}`);
        }
    }

    /**
     * 量子安全混合解密
     * @param {Object} encryptedData - 加密数据对象
     * @param {string} kyberPrivateKey - Kyber私钥（十六进制字符串）
     * @returns {string} 解密后的数据
     */
    async quantumSafeDecrypt(encryptedData, kyberPrivateKey) {
        try {
            const privateKeyBuffer = Buffer.from(kyberPrivateKey, 'hex');
            const encapsulatedKey = Buffer.from(encryptedData.encapsulatedKey, 'hex');
            const encrypted = Buffer.from(encryptedData.encryptedData, 'hex');
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const authTag = Buffer.from(encryptedData.authTag, 'hex');

            // 1. 使用Kyber解封装共享密钥
            const sharedSecret = this._kyberDecapsulate(encapsulatedKey, privateKeyBuffer);

            // 2. 使用共享密钥进行AES解密
            const gcmKey = sharedSecret.length === 32 ? sharedSecret : crypto.scryptSync(sharedSecret.toString('hex'), 'salt', 32);
            const decipher = crypto.createDecipheriv('aes-256-gcm', gcmKey, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`量子安全解密失败: ${error.message}`);
        }
    }

    /**
     * 构造签名Envelope：[signature][16-byte stamp][2-byte meta]
     * @param {Buffer} signatureBytes 真实签名字节
     * @returns {Buffer} envelope
     */
    buildSignatureEnvelope(signatureBytes) {
        const meta = this._signatureMeta();
        const stamp = crypto.createHash('sha3-256').
            update(Buffer.concat([signatureBytes, meta])).
            digest().slice(0, 16);
        return Buffer.concat([signatureBytes, stamp, meta]);
    }

    /**
     * 解析签名Envelope
     * @param {Buffer} envelope
     * @returns {{signature:Buffer, stamp:Buffer, meta:Buffer}|null}
     */
    parseSignatureEnvelope(envelope) {
        if (!Buffer.isBuffer(envelope) || envelope.length < (16 + 2)) return null;
        const meta = envelope.slice(envelope.length - 2);
        const stamp = envelope.slice(envelope.length - 18, envelope.length - 2);
        const signature = envelope.slice(0, envelope.length - 18);
        return { signature, stamp, meta };
    }

    /**
     * 校验Envelope完整性戳
     * @param {Buffer} envelope
     * @returns {boolean}
     */
    validateSignatureEnvelope(envelope) {
        const parts = this.parseSignatureEnvelope(envelope);
        if (!parts) return false;
        const { signature, meta, stamp } = parts;
        const expectedStamp = crypto.createHash('sha3-256').
            update(Buffer.concat([signature, meta])).
            digest().slice(0, 16);
        return this.constantTimeCompare(expectedStamp, stamp);
    }

    /**
     * Envelope元信息（版本、算法等）
     * @returns {Buffer}
     */
    _signatureMeta() {
        // version=0x01, algo=0x02 (dilithium-2)
        return Buffer.from([0x01, 0x02]);
    }

    /**
     * 批量量子安全加密
     * @param {Array} items - 要加密的数据数组
     * @param {string} kyberPublicKey - Kyber公钥
     * @returns {Array} 加密结果数组
     */
    async batchQuantumSafeEncrypt(items, kyberPublicKey) {
        const results = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const encrypted = await this.quantumSafeEncrypt(items[i], kyberPublicKey);

                results.push({
                    index: i,
                    success: true,
                    data: encrypted
                });
            } catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 批量量子安全解密
     * @param {Array} encryptedItems - 加密数据数组
     * @param {string} kyberPrivateKey - Kyber私钥
     * @returns {Array} 解密结果数组
     */
    async batchQuantumSafeDecrypt(encryptedItems, kyberPrivateKey) {
        const results = [];

        for (let i = 0; i < encryptedItems.length; i++) {
            try {
                const decrypted = await this.quantumSafeDecrypt(encryptedItems[i], kyberPrivateKey);

                results.push({
                    index: i,
                    success: true,
                    data: decrypted
                });
            } catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 获取量子安全算法信息
     * @returns {Object} 算法信息
     */
    getQuantumSafeAlgorithmInfo() {
        return {
            kyber: {
                name: 'Kyber-768',
                type: 'Key Encapsulation Mechanism (KEM)',
                keySize: this.kyberParams.keySize,
                ciphertextSize: this.kyberParams.ciphertextSize,
                sharedSecretSize: this.kyberParams.sharedSecretSize,
                securityLevel: 'NIST Level 3',
                quantumResistant: true
            },
            dilithium: {
                name: 'Dilithium-2',
                type: 'Digital Signature Algorithm',
                publicKeySize: this.dilithiumParams.publicKeySize,
                privateKeySize: this.dilithiumParams.privateKeySize,
                signatureSize: this.dilithiumParams.signatureSize,
                securityLevel: 'NIST Level 2',
                quantumResistant: true
            },
            hybrid: {
                name: 'Quantum-Safe Hybrid',
                description: 'Kyber KEM + AES-256-GCM + Dilithium signatures',
                quantumResistant: true,
                standardized: 'NIST Post-Quantum Cryptography'
            }
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 从Kyber私钥派生公钥（模拟实现）
     * @private
     */
    _deriveKyberPublicKey(privateKey) {
        /*
         * 这是一个简化的模拟实现
         * 实际的Kyber公钥派生需要使用专门的数学运算
         */
        const hash = crypto.createHash('sha3-512').update(privateKey).digest();

        return hash.slice(0, this.kyberParams.keySize);
    }

    /**
     * 从Dilithium私钥派生公钥（模拟实现）
     * @private
     */
    _deriveDilithiumPublicKey(privateKey) {
        /*
         * 这是一个简化的模拟实现
         * 实际的Dilithium公钥派生需要使用专门的数学运算
         */
        const hash = crypto.createHash('sha3-512').update(privateKey).digest();

        return hash.slice(0, this.dilithiumParams.publicKeySize);
    }

    /**
     * Kyber密钥封装（模拟实现）
     * @private
     */
    _kyberEncapsulate(sharedSecret, publicKey) {
        /*
         * 这是一个简化的模拟实现
         * 实际的Kyber封装需要使用专门的格密码学运算
         */
        const combined = Buffer.concat([sharedSecret, publicKey]);
        const hash = crypto.createHash('sha3-256').update(combined).digest();

        return Buffer.concat([hash, crypto.randomBytes(this.kyberParams.ciphertextSize - 32)]);
    }

    /**
     * Kyber密钥解封装（模拟实现）
     * @private
     */
    _kyberDecapsulate(encapsulatedKey, privateKey) {
        /*
         * 这是一个简化的模拟实现
         * 模拟环境下直接从密文前32字节取出共享密钥以保证一致性
         */
        return encapsulatedKey.slice(0, this.kyberParams.sharedSecretSize);
    }

    /**
     * Dilithium数字签名
     * @param {Buffer|string} message - 要签名的消息
     * @param {string} dilithiumPrivateKey - Dilithium私钥（十六进制字符串）
     * @returns {Object} 签名结果
     */
    dilithiumSign(message, dilithiumPrivateKey) {
        try {
            const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');
            const privateKeyBuffer = Buffer.from(dilithiumPrivateKey, 'hex');

            if (!this.pqcProvider || !this.pqcProvider.available) {
                throw new Error('PQCProvider 不可用：请安装并配置 @skairipaapps/liboqs-node 或 liboqs-node');
            }

            const signatureBytes = this.pqcProvider.signDilithium(messageBuffer, privateKeyBuffer);
            if (!signatureBytes) {
                throw new Error('签名失败：PQCProvider 未返回签名');
            }

            const envelope = this.buildSignatureEnvelope(signatureBytes);
            const messageHash = crypto.createHash('sha3-256').update(messageBuffer).digest();

            return {
                signature: envelope.toString('hex'),
                messageHash: messageHash.toString('hex'),
                algorithm: 'dilithium-2',
                signatureSize: envelope.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Dilithium签名失败: ${error.message}`);
        }
    }

    /**
     * Dilithium签名验证
     * @param {Buffer|string} message - 原始消息
     * @param {Object} signatureData - 签名数据对象
     * @param {string} dilithiumPublicKey - Dilithium公钥（十六进制字符串）
     * @returns {boolean} 验证结果
     */
    dilithiumVerify(message, signatureData, dilithiumPublicKey) {
        try {
            const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');
            const publicKeyBuffer = Buffer.from(dilithiumPublicKey, 'hex');
            const envelope = Buffer.from(signatureData.signature, 'hex');

            if (!this.pqcProvider || !this.pqcProvider.available) {
                throw new Error('PQCProvider 不可用：请安装并配置 @skairipaapps/liboqs-node 或 liboqs-node');
            }

            if (!this.validateSignatureEnvelope(envelope)) {
                return false;
            }
            const { signature } = this.parseSignatureEnvelope(envelope);

            const ok = this.pqcProvider.verifyDilithium(messageBuffer, signature, publicKeyBuffer);
            return !!ok;
        } catch (error) {
            logger.error(`Dilithium签名验证失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 验证Kyber密钥对
     * @param {Object} keyPair - Kyber密钥对
     * @returns {boolean} 验证结果
     */
    validateKyberKeyPair(keyPair) {
        try {
            if (!keyPair.publicKey || !keyPair.privateKey) {
                return false;
            }

            const publicKeyBuffer = Buffer.from(keyPair.publicKey, 'hex');
            const privateKeyBuffer = Buffer.from(keyPair.privateKey, 'hex');

            return (
                publicKeyBuffer.length === this.kyberParams.keySize &&
                privateKeyBuffer.length === this.kyberParams.keySize
            );
        } catch {
            return false;
        }
    }

    /**
     * 验证Dilithium密钥对
     * @param {Object} keyPair - Dilithium密钥对
     * @returns {boolean} 验证结果
     */
    validateDilithiumKeyPair(keyPair) {
        try {
            if (!keyPair.publicKey || !keyPair.privateKey) {
                return false;
            }

            const publicKeyBuffer = Buffer.from(keyPair.publicKey, 'hex');
            const privateKeyBuffer = Buffer.from(keyPair.privateKey, 'hex');

            return (
                publicKeyBuffer.length === this.dilithiumParams.publicKeySize &&
                privateKeyBuffer.length === this.dilithiumParams.privateKeySize
            );
        } catch {
            return false;
        }
    }
}

export default QuantumEncryption;
