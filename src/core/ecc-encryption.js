import crypto from 'crypto';
import pkg from 'elliptic';
const { ec: EC } = pkg;

import secp256k1 from 'secp256k1';

/**
 * 椭圆曲线加密(ECC)核心模块
 * 支持ECDH密钥交换、ECDSA数字签名和ECIES加密
 */
export class ECCEncryption {
    constructor(options = {}) {
        this.curve = options.curve || 'secp256k1';
        this.ec = new EC(this.curve);
        this.hashAlgorithm = options.hashAlgorithm || 'sha256';
        this.symmetricAlgorithm = options.symmetricAlgorithm || 'aes-256-gcm';
    }

    /**
     * 生成ECC密钥对
     * @returns {Object} 包含公钥和私钥的对象
     */
    generateKeyPair() {
        try {
            const keyPair = this.ec.genKeyPair();

            return {
                privateKey: keyPair.getPrivate('hex'),
                publicKey: keyPair.getPublic('hex'),
                keyPair
            };
        } catch (error) {
            throw new Error(`ECC密钥对生成失败: ${error.message}`);
        }
    }

    /**
     * 从私钥恢复密钥对
     * @param {string} privateKeyHex 十六进制私钥
     * @returns {Object} 密钥对对象
     */
    keyPairFromPrivate(privateKeyHex) {
        try {
            const keyPair = this.ec.keyFromPrivate(privateKeyHex, 'hex');

            return {
                privateKey: privateKeyHex,
                publicKey: keyPair.getPublic('hex'),
                keyPair
            };
        } catch (error) {
            throw new Error(`从私钥恢复密钥对失败: ${error.message}`);
        }
    }

    /**
     * ECDH密钥交换
     * @param {string} privateKeyHex 本方私钥
     * @param {string} publicKeyHex 对方公钥
     * @returns {Buffer} 共享密钥
     */
    deriveSharedSecret(privateKeyHex, publicKeyHex) {
        try {
            const privateKey = this.ec.keyFromPrivate(privateKeyHex, 'hex');
            const publicKey = this.ec.keyFromPublic(publicKeyHex, 'hex');

            const sharedPoint = privateKey.derive(publicKey.getPublic());
            const sharedSecret = sharedPoint.toString(16);

            // 使用SHA256哈希共享密钥以获得固定长度
            return crypto.createHash(this.hashAlgorithm)
                .update(Buffer.from(sharedSecret, 'hex'))
                .digest();
        } catch (error) {
            throw new Error(`ECDH密钥交换失败: ${error.message}`);
        }
    }

    /**
     * ECDSA数字签名
     * @param {Buffer|string} message 要签名的消息
     * @param {string} privateKeyHex 私钥
     * @returns {Object} 签名对象
     */
    sign(message, privateKeyHex) {
        try {
            const keyPair = this.ec.keyFromPrivate(privateKeyHex, 'hex');
            const messageHash = crypto.createHash(this.hashAlgorithm)
                .update(message)
                .digest();

            const signature = keyPair.sign(messageHash);

            return {
                r: signature.r.toString(16),
                s: signature.s.toString(16),
                recoveryParam: signature.recoveryParam
            };
        } catch (error) {
            throw new Error(`ECDSA签名失败: ${error.message}`);
        }
    }

    /**
     * ECDSA签名验证
     * @param {Buffer|string} message 原始消息
     * @param {Object} signature 签名对象
     * @param {string} publicKeyHex 公钥
     * @returns {boolean} 验证结果
     */
    verify(message, signature, publicKeyHex) {
        try {
            const keyPair = this.ec.keyFromPublic(publicKeyHex, 'hex');
            const messageHash = crypto.createHash(this.hashAlgorithm)
                .update(message)
                .digest();

            return keyPair.verify(messageHash, signature);
        } catch (error) {
            throw new Error(`ECDSA签名验证失败: ${error.message}`);
        }
    }

    /**
     * ECIES加密 (椭圆曲线集成加密方案)
     * @param {Buffer|string} data 要加密的数据
     * @param {string} publicKeyHex 接收方公钥
     * @returns {Object} 加密结果
     */
    async encrypt(data, publicKeyHex) {
        try {
            // 1. 生成临时密钥对
            const ephemeralKeyPair = this.generateKeyPair();

            // 2. 执行ECDH密钥交换
            const sharedSecret = this.deriveSharedSecret(
                ephemeralKeyPair.privateKey,
                publicKeyHex
            );

            // 3. 派生加密密钥和MAC密钥
            const kdf = this.kdf(sharedSecret, 64); // 32字节加密密钥 + 32字节MAC密钥
            const encryptionKey = kdf.slice(0, 32);
            const macKey = kdf.slice(32, 64);

            // 4. AES-256-CBC加密（使用正确的API）
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

            let encrypted = cipher.update(data);

            encrypted = Buffer.concat([encrypted, cipher.final()]);

            // 使用HMAC作为认证标签
            const authTag = crypto.createHmac('sha256', macKey)
                .update(encrypted)
                .digest();

            // 5. 计算MAC
            const mac = crypto.createHmac('sha256', macKey)
                .update(Buffer.concat([
                    Buffer.from(ephemeralKeyPair.publicKey, 'hex'),
                    iv,
                    encrypted,
                    authTag
                ]))
                .digest();

            return {
                ephemeralPublicKey: ephemeralKeyPair.publicKey,
                iv: iv.toString('hex'),
                encrypted: encrypted.toString('hex'),
                authTag: authTag.toString('hex'),
                mac: mac.toString('hex')
            };
        } catch (error) {
            throw new Error(`ECIES加密失败: ${error.message}`);
        }
    }

    /**
     * ECIES解密
     * @param {Object} encryptedData 加密数据对象
     * @param {string} privateKeyHex 接收方私钥
     * @returns {Buffer} 解密后的数据
     */
    async decrypt(encryptedData, privateKeyHex) {
        try {
            const { ephemeralPublicKey, iv, encrypted, authTag, mac } = encryptedData;

            // 1. 执行ECDH密钥交换
            const sharedSecret = this.deriveSharedSecret(
                privateKeyHex,
                ephemeralPublicKey
            );

            // 2. 派生加密密钥和MAC密钥
            const kdf = this.kdf(sharedSecret, 64);
            const encryptionKey = kdf.slice(0, 32);
            const macKey = kdf.slice(32, 64);

            // 3. 验证MAC
            const expectedMac = crypto.createHmac('sha256', macKey)
                .update(Buffer.concat([
                    Buffer.from(ephemeralPublicKey, 'hex'),
                    Buffer.from(iv, 'hex'),
                    Buffer.from(encrypted, 'hex'),
                    Buffer.from(authTag, 'hex')
                ]))
                .digest();

            if (!crypto.timingSafeEqual(expectedMac, Buffer.from(mac, 'hex'))) {
                throw new Error('MAC验证失败');
            }

            // 4. AES-256-CBC解密（使用正确的API）
            const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(iv, 'hex'));

            let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));

            decrypted = Buffer.concat([decrypted, decipher.final()]);

            // 验证HMAC认证标签
            const expectedAuthTag = crypto.createHmac('sha256', macKey)
                .update(Buffer.from(encrypted, 'hex'))
                .digest();

            if (!crypto.timingSafeEqual(expectedAuthTag, Buffer.from(authTag, 'hex'))) {
                throw new Error('认证标签验证失败');
            }

            return decrypted;
        } catch (error) {
            throw new Error(`ECIES解密失败: ${error.message}`);
        }
    }

    /**
     * 密钥派生函数 (KDF)
     * @param {Buffer} sharedSecret 共享密钥
     * @param {number} keyLength 输出密钥长度
     * @returns {Buffer} 派生的密钥
     */
    kdf(sharedSecret, keyLength) {
        const output = Buffer.alloc(keyLength);
        let counter = 1;
        let offset = 0;

        while (offset < keyLength) {
            const hash = crypto.createHash('sha256');

            hash.update(sharedSecret);
            hash.update(Buffer.from([counter]));

            const digest = hash.digest();
            const copyLength = Math.min(digest.length, keyLength - offset);

            digest.copy(output, offset, 0, copyLength);
            offset += copyLength;
            counter++;
        }

        return output;
    }

    /**
     * 使用secp256k1进行高性能签名
     * @param {Buffer} messageHash 消息哈希
     * @param {Buffer} privateKey 私钥
     * @returns {Object} 签名结果
     */
    signSecp256k1(messageHash, privateKey) {
        try {
            const signature = secp256k1.ecdsaSign(messageHash, privateKey);

            return {
                signature: signature.signature,
                recovery: signature.recovery
            };
        } catch (error) {
            throw new Error(`secp256k1签名失败: ${error.message}`);
        }
    }

    /**
     * 使用secp256k1进行高性能验证
     * @param {Buffer} messageHash 消息哈希
     * @param {Buffer} signature 签名
     * @param {Buffer} publicKey 公钥
     * @returns {boolean} 验证结果
     */
    verifySecp256k1(messageHash, signature, publicKey) {
        try {
            return secp256k1.ecdsaVerify(signature, messageHash, publicKey);
        } catch (error) {
            throw new Error(`secp256k1验证失败: ${error.message}`);
        }
    }

    /**
     * 压缩公钥
     * @param {string} publicKeyHex 未压缩的公钥
     * @returns {string} 压缩后的公钥
     */
    compressPublicKey(publicKeyHex) {
        try {
            const keyPair = this.ec.keyFromPublic(publicKeyHex, 'hex');

            return keyPair.getPublic(true, 'hex');
        } catch (error) {
            throw new Error(`公钥压缩失败: ${error.message}`);
        }
    }

    /**
     * 解压缩公钥
     * @param {string} compressedPublicKeyHex 压缩的公钥
     * @returns {string} 解压缩后的公钥
     */
    decompressPublicKey(compressedPublicKeyHex) {
        try {
            const keyPair = this.ec.keyFromPublic(compressedPublicKeyHex, 'hex');

            return keyPair.getPublic(false, 'hex');
        } catch (error) {
            throw new Error(`公钥解压缩失败: ${error.message}`);
        }
    }

    /**
     * 验证公钥格式
     * @param {string} publicKeyHex 公钥
     * @returns {boolean} 是否有效
     */
    isValidPublicKey(publicKeyHex) {
        try {
            this.ec.keyFromPublic(publicKeyHex, 'hex');

            return true;
        } catch {
            return false;
        }
    }

    /**
     * 验证私钥格式
     * @param {string} privateKeyHex 私钥
     * @returns {boolean} 是否有效
     */
    isValidPrivateKey(privateKeyHex) {
        try {
            this.ec.keyFromPrivate(privateKeyHex, 'hex');

            return true;
        } catch {
            return false;
        }
    }
}

export default ECCEncryption;
