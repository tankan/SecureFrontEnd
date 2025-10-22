/**
 * 浏览器端加密解密库
 * 支持WebCrypto API和crypto-js降级方案
 */
class CryptoLoader {
    constructor() {
        this.isWebCryptoSupported = this.checkWebCryptoSupport();
        this.algorithms = {
            'aes-256-gcm': {
                name: 'AES-GCM',
                keyLength: 256,
                ivLength: 12,
                tagLength: 16
            },
            'aes-256-cbc': {
                name: 'AES-CBC',
                keyLength: 256,
                ivLength: 16
            }
        };
        
        // 如果不支持WebCrypto，加载crypto-js
        if (!this.isWebCryptoSupported) {
            this.loadCryptoJS();
        }
    }

    /**
     * 检查WebCrypto API支持
     */
    checkWebCryptoSupport() {
        return !!(window.crypto && window.crypto.subtle);
    }

    /**
     * 动态加载crypto-js库
     */
    async loadCryptoJS() {
        if (window.CryptoJS) {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js';
            script.onload = () => {
                console.log('crypto-js loaded as fallback');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load crypto-js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 导入密钥
     */
    async importKey(keyData, algorithm = 'aes-256-gcm') {
        const alg = this.algorithms[algorithm];
        if (!alg) {
            throw new Error(`Unsupported algorithm: ${algorithm}`);
        }

        if (this.isWebCryptoSupported) {
            return await this.importKeyWebCrypto(keyData, alg);
        } else {
            return this.importKeyCryptoJS(keyData, algorithm);
        }
    }

    /**
     * 使用WebCrypto API导入密钥
     */
    async importKeyWebCrypto(keyData, algorithm) {
        try {
            // 如果keyData是字符串，转换为ArrayBuffer
            let keyBuffer;
            if (typeof keyData === 'string') {
                keyBuffer = this.hexToArrayBuffer(keyData);
            } else if (keyData instanceof ArrayBuffer) {
                keyBuffer = keyData;
            } else {
                keyBuffer = new Uint8Array(keyData).buffer;
            }

            const key = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                {
                    name: algorithm.name,
                    length: algorithm.keyLength
                },
                false,
                ['encrypt', 'decrypt']
            );

            return {
                key,
                algorithm: algorithm.name,
                isWebCrypto: true
            };
        } catch (error) {
            throw new Error(`Failed to import key with WebCrypto: ${error.message}`);
        }
    }

    /**
     * 使用crypto-js导入密钥
     */
    importKeyCryptoJS(keyData, algorithm) {
        try {
            let keyHex;
            if (typeof keyData === 'string') {
                keyHex = keyData;
            } else if (keyData instanceof ArrayBuffer) {
                keyHex = this.arrayBufferToHex(keyData);
            } else {
                keyHex = Array.from(new Uint8Array(keyData))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            }

            return {
                key: CryptoJS.enc.Hex.parse(keyHex),
                algorithm,
                isWebCrypto: false
            };
        } catch (error) {
            throw new Error(`Failed to import key with crypto-js: ${error.message}`);
        }
    }

    /**
     * 解密数据
     */
    async decrypt(encryptedData, keyInfo, algorithm = 'aes-256-gcm') {
        if (keyInfo.isWebCrypto) {
            return await this.decryptWebCrypto(encryptedData, keyInfo, algorithm);
        } else {
            return this.decryptCryptoJS(encryptedData, keyInfo, algorithm);
        }
    }

    /**
     * 使用WebCrypto API解密
     */
    async decryptWebCrypto(encryptedData, keyInfo, algorithm) {
        try {
            const alg = this.algorithms[algorithm];
            if (!alg) {
                throw new Error(`Unsupported algorithm: ${algorithm}`);
            }

            // 解析加密数据结构
            const dataView = new DataView(encryptedData);
            let offset = 0;

            // 读取元数据长度
            const metadataLength = dataView.getUint32(offset, false); // big-endian
            offset += 4;

            // 读取元数据
            const metadataBuffer = encryptedData.slice(offset, offset + metadataLength);
            const metadata = JSON.parse(new TextDecoder().decode(metadataBuffer));
            offset += metadataLength;

            // 读取实际加密数据
            const actualEncryptedData = encryptedData.slice(offset);

            // 解析IV、加密数据和认证标签
            const iv = actualEncryptedData.slice(0, alg.ivLength);
            const tag = actualEncryptedData.slice(-alg.tagLength);
            const ciphertext = actualEncryptedData.slice(alg.ivLength, -alg.tagLength);

            // 执行解密
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: alg.name,
                    iv: iv,
                    ...(alg.name === 'AES-GCM' && { additionalData: new TextEncoder().encode('') })
                },
                keyInfo.key,
                new Uint8Array([...ciphertext, ...tag])
            );

            // 验证校验和
            const checksum = await this.calculateSHA256(decryptedBuffer);
            if (checksum !== metadata.checksum) {
                throw new Error('Checksum verification failed');
            }

            return decryptedBuffer;
        } catch (error) {
            throw new Error(`WebCrypto decryption failed: ${error.message}`);
        }
    }

    /**
     * 使用crypto-js解密
     */
    decryptCryptoJS(encryptedData, keyInfo, algorithm) {
        try {
            // 确保crypto-js已加载
            if (!window.CryptoJS) {
                throw new Error('crypto-js not loaded');
            }

            // 解析加密数据结构
            const dataView = new DataView(encryptedData);
            let offset = 0;

            // 读取元数据长度
            const metadataLength = dataView.getUint32(offset, false);
            offset += 4;

            // 读取元数据
            const metadataBuffer = encryptedData.slice(offset, offset + metadataLength);
            const metadata = JSON.parse(new TextDecoder().decode(metadataBuffer));
            offset += metadataLength;

            // 读取实际加密数据
            const actualEncryptedData = encryptedData.slice(offset);
            const encryptedHex = this.arrayBufferToHex(actualEncryptedData);

            let decryptedData;
            
            if (algorithm === 'aes-256-gcm') {
                // GCM模式需要特殊处理
                const alg = this.algorithms[algorithm];
                const ivHex = encryptedHex.substring(0, alg.ivLength * 2);
                const tagHex = encryptedHex.substring(encryptedHex.length - alg.tagLength * 2);
                const ciphertextHex = encryptedHex.substring(alg.ivLength * 2, encryptedHex.length - alg.tagLength * 2);

                // crypto-js不直接支持GCM，使用CBC作为降级
                console.warn('GCM mode not supported in crypto-js, falling back to CBC');
                
                const iv = CryptoJS.enc.Hex.parse(ivHex);
                const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);
                
                decryptedData = CryptoJS.AES.decrypt(
                    { ciphertext: ciphertext },
                    keyInfo.key,
                    {
                        iv: iv,
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7
                    }
                );
            } else if (algorithm === 'aes-256-cbc') {
                const alg = this.algorithms[algorithm];
                const ivHex = encryptedHex.substring(0, alg.ivLength * 2);
                const ciphertextHex = encryptedHex.substring(alg.ivLength * 2);

                const iv = CryptoJS.enc.Hex.parse(ivHex);
                const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

                decryptedData = CryptoJS.AES.decrypt(
                    { ciphertext: ciphertext },
                    keyInfo.key,
                    {
                        iv: iv,
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7
                    }
                );
            } else {
                throw new Error(`Unsupported algorithm for crypto-js: ${algorithm}`);
            }

            // 转换为ArrayBuffer
            const decryptedHex = decryptedData.toString(CryptoJS.enc.Hex);
            const decryptedBuffer = this.hexToArrayBuffer(decryptedHex);

            // 验证校验和
            const checksum = this.calculateSHA256CryptoJS(decryptedBuffer);
            if (checksum !== metadata.checksum) {
                throw new Error('Checksum verification failed');
            }

            return decryptedBuffer;
        } catch (error) {
            throw new Error(`crypto-js decryption failed: ${error.message}`);
        }
    }

    /**
     * 加密数据（用于测试）
     */
    async encrypt(data, keyInfo, algorithm = 'aes-256-gcm') {
        if (keyInfo.isWebCrypto) {
            return await this.encryptWebCrypto(data, keyInfo, algorithm);
        } else {
            return this.encryptCryptoJS(data, keyInfo, algorithm);
        }
    }

    /**
     * 使用WebCrypto API加密
     */
    async encryptWebCrypto(data, keyInfo, algorithm) {
        try {
            const alg = this.algorithms[algorithm];
            if (!alg) {
                throw new Error(`Unsupported algorithm: ${algorithm}`);
            }

            // 生成随机IV
            const iv = crypto.getRandomValues(new Uint8Array(alg.ivLength));

            // 执行加密
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: alg.name,
                    iv: iv,
                    ...(alg.name === 'AES-GCM' && { additionalData: new TextEncoder().encode('') })
                },
                keyInfo.key,
                data
            );

            // 计算校验和
            const checksum = await this.calculateSHA256(data);

            // 创建元数据
            const metadata = {
                originalName: 'encrypted-data',
                fileType: '.bin',
                encryptionAlgorithm: algorithm,
                timestamp: new Date().toISOString(),
                checksum: checksum
            };

            // 组合最终数据
            const metadataBuffer = new TextEncoder().encode(JSON.stringify(metadata));
            const metadataLength = new ArrayBuffer(4);
            new DataView(metadataLength).setUint32(0, metadataBuffer.length, false);

            // 组合IV + 加密数据
            const result = new Uint8Array(
                metadataLength.byteLength + 
                metadataBuffer.byteLength + 
                iv.byteLength + 
                encryptedBuffer.byteLength
            );

            let offset = 0;
            result.set(new Uint8Array(metadataLength), offset);
            offset += metadataLength.byteLength;
            result.set(new Uint8Array(metadataBuffer), offset);
            offset += metadataBuffer.byteLength;
            result.set(iv, offset);
            offset += iv.byteLength;
            result.set(new Uint8Array(encryptedBuffer), offset);

            return result.buffer;
        } catch (error) {
            throw new Error(`WebCrypto encryption failed: ${error.message}`);
        }
    }

    /**
     * 使用crypto-js加密
     */
    encryptCryptoJS(data, keyInfo, algorithm) {
        try {
            if (!window.CryptoJS) {
                throw new Error('crypto-js not loaded');
            }

            const dataHex = this.arrayBufferToHex(data);
            const dataWords = CryptoJS.enc.Hex.parse(dataHex);

            let encrypted;
            let iv;

            if (algorithm === 'aes-256-gcm') {
                // 降级到CBC模式
                console.warn('GCM mode not supported in crypto-js, using CBC');
                iv = CryptoJS.lib.WordArray.random(16); // 128 bits for CBC
                
                encrypted = CryptoJS.AES.encrypt(dataWords, keyInfo.key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });
            } else if (algorithm === 'aes-256-cbc') {
                iv = CryptoJS.lib.WordArray.random(16); // 128 bits
                
                encrypted = CryptoJS.AES.encrypt(dataWords, keyInfo.key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });
            } else {
                throw new Error(`Unsupported algorithm for crypto-js: ${algorithm}`);
            }

            // 计算校验和
            const checksum = this.calculateSHA256CryptoJS(data);

            // 创建元数据
            const metadata = {
                originalName: 'encrypted-data',
                fileType: '.bin',
                encryptionAlgorithm: algorithm,
                timestamp: new Date().toISOString(),
                checksum: checksum
            };

            // 组合最终数据
            const metadataBuffer = new TextEncoder().encode(JSON.stringify(metadata));
            const metadataLength = new ArrayBuffer(4);
            new DataView(metadataLength).setUint32(0, metadataBuffer.length, false);

            const ivBuffer = this.hexToArrayBuffer(iv.toString(CryptoJS.enc.Hex));
            const encryptedBuffer = this.hexToArrayBuffer(encrypted.ciphertext.toString(CryptoJS.enc.Hex));

            const result = new Uint8Array(
                metadataLength.byteLength + 
                metadataBuffer.byteLength + 
                ivBuffer.byteLength + 
                encryptedBuffer.byteLength
            );

            let offset = 0;
            result.set(new Uint8Array(metadataLength), offset);
            offset += metadataLength.byteLength;
            result.set(new Uint8Array(metadataBuffer), offset);
            offset += metadataBuffer.byteLength;
            result.set(new Uint8Array(ivBuffer), offset);
            offset += ivBuffer.byteLength;
            result.set(new Uint8Array(encryptedBuffer), offset);

            return result.buffer;
        } catch (error) {
            throw new Error(`crypto-js encryption failed: ${error.message}`);
        }
    }

    /**
     * 计算SHA256校验和（WebCrypto）
     */
    async calculateSHA256(data) {
        if (this.isWebCryptoSupported) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            return this.arrayBufferToHex(hashBuffer);
        } else {
            return this.calculateSHA256CryptoJS(data);
        }
    }

    /**
     * 计算SHA256校验和（crypto-js）
     */
    calculateSHA256CryptoJS(data) {
        if (!window.CryptoJS) {
            throw new Error('crypto-js not loaded');
        }

        const dataHex = this.arrayBufferToHex(data);
        const dataWords = CryptoJS.enc.Hex.parse(dataHex);
        const hash = CryptoJS.SHA256(dataWords);
        return hash.toString(CryptoJS.enc.Hex);
    }

    /**
     * 生成随机密钥
     */
    async generateKey(algorithm = 'aes-256-gcm') {
        const alg = this.algorithms[algorithm];
        if (!alg) {
            throw new Error(`Unsupported algorithm: ${algorithm}`);
        }

        if (this.isWebCryptoSupported) {
            const key = await crypto.subtle.generateKey(
                {
                    name: alg.name,
                    length: alg.keyLength
                },
                true,
                ['encrypt', 'decrypt']
            );

            const keyBuffer = await crypto.subtle.exportKey('raw', key);
            return {
                key,
                keyData: keyBuffer,
                algorithm: alg.name,
                isWebCrypto: true
            };
        } else {
            const keyBytes = alg.keyLength / 8;
            const keyArray = new Uint8Array(keyBytes);
            
            // 使用更安全的随机数生成
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(keyArray);
            } else {
                // 降级方案
                for (let i = 0; i < keyBytes; i++) {
                    keyArray[i] = Math.floor(Math.random() * 256);
                }
            }
            
            const keyHex = this.arrayBufferToHex(keyArray.buffer);
            
            return {
                key: CryptoJS.enc.Hex.parse(keyHex),
                keyData: keyArray.buffer,
                algorithm,
                isWebCrypto: false
            };
        }
    }

    /**
     * 工具方法：ArrayBuffer转十六进制字符串
     */
    arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * 工具方法：十六进制字符串转ArrayBuffer
     */
    hexToArrayBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }

    /**
     * 获取支持的算法列表
     */
    getSupportedAlgorithms() {
        return Object.keys(this.algorithms);
    }

    /**
     * 检查算法是否支持
     */
    isAlgorithmSupported(algorithm) {
        return algorithm in this.algorithms;
    }

    /**
     * 获取浏览器兼容性信息
     */
    getCompatibilityInfo() {
        return {
            webCryptoSupported: this.isWebCryptoSupported,
            cryptoJSAvailable: !!window.CryptoJS,
            userAgent: navigator.userAgent,
            supportedAlgorithms: this.getSupportedAlgorithms()
        };
    }
}

// 导出类供使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoLoader;
} else {
    window.CryptoLoader = CryptoLoader;
}