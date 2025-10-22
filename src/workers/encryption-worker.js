/**
 * 加密解密Web Worker
 * 用于在后台线程中执行CPU密集型的加密解密操作
 */

// 在Worker环境中，需要使用importScripts或动态导入
let EncryptionCore;

// 动态导入加密核心模块
async function initializeEncryption() {
    try {
        const module = await import('../core/encryption.js');

        EncryptionCore = module.default;

        return new EncryptionCore();
    } catch (error) {
        console.error('Worker初始化失败:', error);
        throw error;
    }
}

let encryption = null;

// 监听主线程消息
self.onmessage = async function (e) {
    const { id, type, data } = e.data;

    try {
    // 延迟初始化加密实例
        if (!encryption) {
            encryption = await initializeEncryption();
        }

        let result;

        switch (type) {
            case 'encrypt-aes':
                result = await encryption.encryptAES(data.plaintext, data.key, data.iv);
                break;

            case 'decrypt-aes':
                result = await encryption.decryptAES(data.encryptedData, data.key);
                break;

            case 'encrypt-quantum-safe':
                result = await encryption.encryptQuantumSafe(data.plaintext, data.kyberPublicKey);
                break;

            case 'decrypt-quantum-safe':
                result = await encryption.decryptQuantumSafe(data.encryptedData, data.kyberPrivateKey);
                break;

            case 'generate-keys':
                switch (data.algorithm) {
                    case 'kyber':
                        result = encryption.generateKyberKeyPair();
                        break;
                    case 'dilithium':
                        result = encryption.generateDilithiumKeyPair();
                        break;
                    default:
                        throw new Error(`不支持的密钥算法: ${data.algorithm}`);
                }
                break;

            case 'batch-encrypt':
                // 批量加密操作
                result = [];
                for (const item of data.items) {
                    const encrypted = await encryption.encryptAES(item.data, data.key);

                    result.push({
                        id: item.id,
                        encrypted
                    });
                }
                break;

            case 'batch-decrypt':
                // 批量解密操作
                result = [];
                for (const item of data.items) {
                    const decrypted = await encryption.decryptAES(item.encrypted, data.key);

                    result.push({
                        id: item.id,
                        decrypted
                    });
                }
                break;

            default:
                throw new Error(`不支持的操作类型: ${type}`);
        }

        // 发送成功结果
        self.postMessage({
            id,
            success: true,
            result
        });
    } catch (error) {
    // 发送错误结果
        self.postMessage({
            id,
            success: false,
            error: error.message
        });
    }
};

// 错误处理
self.onerror = function (error) {
    console.error('Worker错误:', error);
    self.postMessage({
        success: false,
        error: error.message
    });
};

// 未捕获的Promise拒绝处理
self.onunhandledrejection = function (event) {
    console.error('Worker未处理的Promise拒绝:', event.reason);
    self.postMessage({
        success: false,
        error: event.reason.message || '未知错误'
    });
};
