import crypto from 'crypto';
import { BaseEncryption } from './base-encryption.js';
import { AESEncryption } from './aes-encryption.js';
import { logger } from '../../utils/logger.js';

/**
 * RSA加密模块
 * 提供RSA加密解密和混合加密功能
 */
export class RSAEncryption extends BaseEncryption {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        super(options);
        this.rsaKeySize = options.rsaKeySize || 2048;
        this.aesEncryption = new AESEncryption(options);
    }

    /**
     * RSA密钥对生成
     * @param {number} modulusLength - 密钥长度，默认2048
     * @returns {Object} RSA密钥对
     */
    generateRSAKeyPair(modulusLength = null) {
        const keySize = modulusLength || this.rsaKeySize;

        return crypto.generateKeyPairSync('rsa', {
            modulusLength: keySize,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }

    /**
     * RSA加密（适用于小数据）
     * @param {string|Buffer} data - 要加密的数据
     * @param {string} publicKey - RSA公钥（PEM格式）
     * @returns {Buffer} 加密后的数据
     */
    encryptRSA(data, publicKey) {
        try {
            const dataBuffer = this.toBuffer(data);

            // 检查数据大小是否超过RSA加密限制
            const maxDataSize = Math.floor(this.rsaKeySize / 8) - 42; // OAEP padding overhead

            if (dataBuffer.length > maxDataSize) {
                throw new Error(
                    `数据大小 ${dataBuffer.length} 字节超过RSA加密限制 ${maxDataSize} 字节`
                );
            }

            return crypto.publicEncrypt(
                {
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                dataBuffer
            );
        } catch (error) {
            throw new Error(`RSA加密失败: ${error.message}`);
        }
    }

    /**
     * RSA解密
     * @param {Buffer} encryptedData - 加密的数据
     * @param {string} privateKey - RSA私钥（PEM格式）
     * @returns {Buffer} 解密后的数据
     */
    decryptRSA(encryptedData, privateKey) {
        try {
            return crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                encryptedData
            );
        } catch (error) {
            throw new Error(`RSA解密失败: ${error.message}`);
        }
    }

    /**
     * RSA数字签名
     * @param {string|Buffer} data - 要签名的数据
     * @param {string} privateKey - RSA私钥（PEM格式）
     * @param {string} algorithm - 签名算法，默认'RSA-SHA256'
     * @returns {Buffer} 数字签名
     */
    signRSA(data, privateKey, algorithm = 'RSA-SHA256') {
        try {
            const dataBuffer = this.toBuffer(data);
            const sign = crypto.createSign(algorithm);

            sign.update(dataBuffer);

            return sign.sign(privateKey);
        } catch (error) {
            throw new Error(`RSA签名失败: ${error.message}`);
        }
    }

    /**
     * RSA签名验证
     * @param {string|Buffer} data - 原始数据
     * @param {Buffer} signature - 数字签名
     * @param {string} publicKey - RSA公钥（PEM格式）
     * @param {string} algorithm - 签名算法，默认'RSA-SHA256'
     * @returns {boolean} 验证结果
     */
    verifyRSASignature(data, signature, publicKey, algorithm = 'RSA-SHA256') {
        try {
            const dataBuffer = this.toBuffer(data);
            const verify = crypto.createVerify(algorithm);

            verify.update(dataBuffer);

            return verify.verify(publicKey, signature);
        } catch (error) {
            logger.error(`RSA签名验证失败: ${error.message}`);

            return false;
        }
    }

    /**
     * 混合加密：RSA加密AES密钥，AES加密数据
     * @param {string|Buffer} data - 要加密的数据
     * @param {string} publicKey - RSA公钥（PEM格式）
     * @param {Object} options - 加密选项
     * @returns {Object} 混合加密结果
     */
    async hybridEncrypt(data, publicKey, options = {}) {
        try {
            // 生成随机AES密钥
            const aesKey = this.generateFileKey();

            // 使用AES加密数据
            const aesResult = await this.aesEncryption.encryptAES(data, aesKey);

            // 使用RSA加密AES密钥
            const encryptedKey = this.encryptRSA(aesKey, publicKey);

            // 创建混合加密结果
            const result = {
                encryptedData: aesResult.encryptedData,
                encryptedKey: this.toBase64(encryptedKey),
                iv: aesResult.iv,
                algorithm: 'hybrid-rsa-aes',
                rsaKeySize: this.rsaKeySize,
                aesAlgorithm: aesResult.algorithm,
                timestamp: new Date().toISOString()
            };

            // 如果AES使用了GCM模式，包含认证标签
            if (aesResult.authTag) {
                result.authTag = aesResult.authTag;
            }

            // 如果需要签名
            if (options.signWithPrivateKey) {
                const dataToSign = JSON.stringify({
                    encryptedData: result.encryptedData,
                    encryptedKey: result.encryptedKey,
                    iv: result.iv
                });

                result.signature = this.toBase64(
                    this.signRSA(dataToSign, options.signWithPrivateKey)
                );
            }

            return result;
        } catch (error) {
            throw new Error(`混合加密失败: ${error.message}`);
        }
    }

    /**
     * 混合解密
     * @param {Object} encryptedData - 混合加密的数据对象
     * @param {string} privateKey - RSA私钥（PEM格式）
     * @param {Object} options - 解密选项
     * @returns {string} 解密后的数据
     */
    async hybridDecrypt(encryptedData, privateKey, options = {}) {
        try {
            // 验证签名（如果存在）
            if (encryptedData.signature && options.verifyWithPublicKey) {
                const dataToVerify = JSON.stringify({
                    encryptedData: encryptedData.encryptedData,
                    encryptedKey: encryptedData.encryptedKey,
                    iv: encryptedData.iv
                });
                const signature = this.fromBase64(encryptedData.signature);

                if (
                    !this.verifyRSASignature(dataToVerify, signature, options.verifyWithPublicKey)
                ) {
                    throw new Error('数字签名验证失败，数据可能已被篡改');
                }
            }

            // 使用RSA解密AES密钥
            const encryptedKeyBuffer = this.fromBase64(encryptedData.encryptedKey);
            const aesKey = this.decryptRSA(encryptedKeyBuffer, privateKey);

            // 构造AES解密所需的数据格式
            const aesEncryptedData = {
                encryptedData: encryptedData.encryptedData,
                iv: encryptedData.iv,
                algorithm: encryptedData.aesAlgorithm || 'aes-256-gcm'
            };

            // 如果有认证标签，添加到解密数据中
            if (encryptedData.authTag) {
                aesEncryptedData.authTag = encryptedData.authTag;
            }

            // 使用AES解密数据
            const decryptedData = await this.aesEncryption.decryptAES(aesEncryptedData, aesKey);

            return decryptedData;
        } catch (error) {
            throw new Error(`混合解密失败: ${error.message}`);
        }
    }

    /**
     * 批量混合加密
     * @param {Array} dataArray - 要加密的数据数组
     * @param {string} publicKey - RSA公钥（PEM格式）
     * @param {Object} options - 加密选项
     * @returns {Array} 加密结果数组
     */
    async batchHybridEncrypt(dataArray, publicKey, options = {}) {
        const results = [];

        for (const data of dataArray) {
            try {
                const encrypted = await this.hybridEncrypt(data, publicKey, options);

                results.push({ success: true, data: encrypted });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * 批量混合解密
     * @param {Array} encryptedDataArray - 加密数据数组
     * @param {string} privateKey - RSA私钥（PEM格式）
     * @param {Object} options - 解密选项
     * @returns {Array} 解密结果数组
     */
    async batchHybridDecrypt(encryptedDataArray, privateKey, options = {}) {
        const results = [];

        for (const encryptedData of encryptedDataArray) {
            try {
                const decrypted = await this.hybridDecrypt(encryptedData, privateKey, options);

                results.push({ success: true, data: decrypted });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * 生成自签名证书
     * @param {Object} certInfo - 证书信息
     * @param {Object} keyPair - RSA密钥对
     * @returns {Object} 自签名证书
     */
    generateSelfSignedCertificate(certInfo, keyPair = null) {
        try {
            const keys = keyPair || this.generateRSAKeyPair();

            const certificate = {
                version: '1.0',
                serialNumber: crypto.randomBytes(16).toString('hex'),
                issuer: certInfo.issuer || 'SecureFrontEnd',
                subject: certInfo.subject || 'SecureFrontEnd',
                validFrom: new Date().toISOString(),
                validTo: new Date(
                    Date.now() + (certInfo.validityDays || 365) * 24 * 60 * 60 * 1000
                ).toISOString(),
                publicKey: keys.publicKey,
                algorithm: 'RSA-SHA256',
                keyUsage: certInfo.keyUsage || ['digitalSignature', 'keyEncipherment'],
                extensions: certInfo.extensions || {}
            };

            // 对证书进行签名
            const certData = JSON.stringify({
                version: certificate.version,
                serialNumber: certificate.serialNumber,
                issuer: certificate.issuer,
                subject: certificate.subject,
                validFrom: certificate.validFrom,
                validTo: certificate.validTo,
                publicKey: certificate.publicKey,
                algorithm: certificate.algorithm,
                keyUsage: certificate.keyUsage,
                extensions: certificate.extensions
            });

            certificate.signature = this.toBase64(this.signRSA(certData, keys.privateKey));

            return {
                certificate,
                privateKey: keys.privateKey
            };
        } catch (error) {
            throw new Error(`生成自签名证书失败: ${error.message}`);
        }
    }

    /**
     * 验证证书
     * @param {Object} certificate - 证书对象
     * @param {string} issuerPublicKey - 签发者公钥（可选，用于验证非自签名证书）
     * @returns {Object} 验证结果
     */
    verifyCertificate(certificate, issuerPublicKey = null) {
        try {
            // 检查证书有效期
            const now = new Date();
            const validFrom = new Date(certificate.validFrom);
            const validTo = new Date(certificate.validTo);

            if (now < validFrom || now > validTo) {
                return {
                    valid: false,
                    reason: '证书已过期或尚未生效'
                };
            }

            // 验证证书签名
            const certData = JSON.stringify({
                version: certificate.version,
                serialNumber: certificate.serialNumber,
                issuer: certificate.issuer,
                subject: certificate.subject,
                validFrom: certificate.validFrom,
                validTo: certificate.validTo,
                publicKey: certificate.publicKey,
                algorithm: certificate.algorithm,
                keyUsage: certificate.keyUsage,
                extensions: certificate.extensions
            });

            const signature = this.fromBase64(certificate.signature);
            const publicKeyToUse = issuerPublicKey || certificate.publicKey; // 自签名证书使用自己的公钥

            const signatureValid = this.verifyRSASignature(certData, signature, publicKeyToUse);

            return {
                valid: signatureValid,
                reason: signatureValid ? '证书验证成功' : '证书签名验证失败'
            };
        } catch (error) {
            return {
                valid: false,
                reason: `证书验证失败: ${error.message}`
            };
        }
    }

    /**
     * 设置AES加密实例
     * @param {AESEncryption} aesEncryption - AES加密实例
     */
    setAESEncryption(aesEncryption) {
        this.aesEncryption = aesEncryption;
    }
}

export default RSAEncryption;
