import { EncryptionCore } from '../src/core/encryption.js';
import { logger } from '../src/utils/logger.js';

/**
 * 加密模块功能测试
 */
class EncryptionTest {
    constructor() {
        this.encryption = new EncryptionCore({
            useWorkers: false // 测试时禁用Workers
        });
        this.testResults = [];
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('开始运行加密模块测试...\n');

        try {
            await this.testAESEncryption();
            await this.testRSAEncryption();
            await this.testHybridEncryption();
            await this.testQuantumSafeEncryption();
            await this.testECCEncryption();
            await this.testBatchOperations();
            
            this.printTestResults();
        } catch (error) {
            console.error('测试运行失败:', error.message);
        }
    }

    /**
     * 测试AES加密功能
     */
    async testAESEncryption() {
        console.log('测试AES加密功能...');
        
        try {
            const testData = 'Hello, AES Encryption!';
            
            // 测试AES加密
            const encrypted = await this.encryption.encryptAES(testData);
            this.addTestResult('AES加密', true, '成功生成加密数据');
            
            // 测试AES解密
            const decrypted = await this.encryption.decryptAES(encrypted);
            const isDecryptionCorrect = decrypted === testData;
            this.addTestResult('AES解密', isDecryptionCorrect, 
                isDecryptionCorrect ? '解密结果正确' : `解密结果不匹配: ${decrypted}`);
            
            // 测试批量AES加密
            const batchData = ['data1', 'data2', 'data3'];
            const batchEncrypted = await this.encryption.batchEncryptAES(batchData);
            this.addTestResult('批量AES加密', batchEncrypted.length === 3, 
                `批量加密${batchEncrypted.length}个项目`);
            
        } catch (error) {
            this.addTestResult('AES加密测试', false, error.message);
        }
        
        console.log('AES加密测试完成\n');
    }

    /**
     * 测试RSA加密功能
     */
    async testRSAEncryption() {
        console.log('测试RSA加密功能...');
        
        try {
            // 生成RSA密钥对
            const keyPair = this.encryption.generateRSAKeyPair();
            this.addTestResult('RSA密钥对生成', 
                keyPair.publicKey && keyPair.privateKey, '成功生成RSA密钥对');
            
            const testData = 'Hello, RSA!';
            
            // 测试RSA加密（小数据）
            const encrypted = await this.encryption.encryptRSA(testData, keyPair.publicKey);
            this.addTestResult('RSA加密', encrypted !== null, '成功进行RSA加密');
            
            // 测试RSA解密
            const decrypted = await this.encryption.decryptRSA(encrypted, keyPair.privateKey);
            const isDecryptionCorrect = decrypted.toString() === testData;
            this.addTestResult('RSA解密', isDecryptionCorrect, 
                isDecryptionCorrect ? '解密结果正确' : '解密结果不匹配');
            
        } catch (error) {
            this.addTestResult('RSA加密测试', false, error.message);
        }
        
        console.log('RSA加密测试完成\n');
    }

    /**
     * 测试混合加密功能
     */
    async testHybridEncryption() {
        console.log('测试混合加密功能...');
        
        try {
            const keyPair = this.encryption.generateRSAKeyPair();
            const testData = 'Hello, Hybrid Encryption! This is a longer message for testing.';
            
            // 测试混合加密
            const encrypted = await this.encryption.hybridEncrypt(testData, keyPair.publicKey);
            this.addTestResult('混合加密', 
                encrypted.encryptedData && encrypted.encryptedKey, '成功进行混合加密');
            
            // 测试混合解密
            const decrypted = await this.encryption.hybridDecrypt(encrypted, keyPair.privateKey);
            const isDecryptionCorrect = decrypted === testData;
            this.addTestResult('混合解密', isDecryptionCorrect, 
                isDecryptionCorrect ? '解密结果正确' : '解密结果不匹配');
            
        } catch (error) {
            this.addTestResult('混合加密测试', false, error.message);
        }
        
        console.log('混合加密测试完成\n');
    }

    /**
     * 测试量子安全加密功能
     */
    async testQuantumSafeEncryption() {
        console.log('测试量子安全加密功能...');
        
        try {
            // 生成量子安全密钥对
            const keyPair = this.encryption.generateQuantumSafeKeyPair();
            this.addTestResult('量子安全密钥对生成', 
                keyPair.kyber && keyPair.dilithium, '成功生成量子安全密钥对');
            
            const testData = 'Hello, Quantum Safe Encryption!';
            
            // 测试量子安全加密
            const encrypted = await this.encryption.encryptQuantumSafe(testData, keyPair.kyber.publicKey);
            this.addTestResult('量子安全加密', encrypted !== null, '成功进行量子安全加密');
            
            // 测试量子安全解密
            const decrypted = await this.encryption.decryptQuantumSafe(encrypted, keyPair.kyber.privateKey);
            const isDecryptionCorrect = decrypted === testData;
            this.addTestResult('量子安全解密', isDecryptionCorrect, 
                isDecryptionCorrect ? '解密结果正确' : '解密结果不匹配');
            
            // 测试Dilithium数字签名
            const signature = this.encryption.signQuantumSafe(testData, keyPair.dilithium.privateKey);
            this.addTestResult('Dilithium签名', signature !== null, '成功生成数字签名');
            
            // 测试签名验证
            const isSignatureValid = this.encryption.verifyQuantumSafeSignature(
                testData, signature, keyPair.dilithium.publicKey);
            this.addTestResult('Dilithium签名验证', isSignatureValid, 
                isSignatureValid ? '签名验证成功' : '签名验证失败');
            
        } catch (error) {
            this.addTestResult('量子安全加密测试', false, error.message);
        }
        
        console.log('量子安全加密测试完成\n');
    }

    /**
     * 测试ECC加密功能
     */
    async testECCEncryption() {
        console.log('测试ECC加密功能...');
        
        try {
            // 生成ECC密钥对
            const keyPair = this.encryption.generateECCKeyPair();
            this.addTestResult('ECC密钥对生成', 
                keyPair.publicKey && keyPair.privateKey, '成功生成ECC密钥对');
            
            const testData = 'Hello, ECC Encryption!';
            
            // 测试ECC加密
            const encrypted = await this.encryption.encryptECC(testData, keyPair.publicKey);
            this.addTestResult('ECC加密', encrypted !== null, '成功进行ECC加密');
            
            // 测试ECC解密
            const decrypted = await this.encryption.decryptECC(encrypted, keyPair.privateKey);
            const isDecryptionCorrect = decrypted === testData;
            this.addTestResult('ECC解密', isDecryptionCorrect, 
                isDecryptionCorrect ? '解密结果正确' : '解密结果不匹配');
            
            // 测试ECC数字签名
            const signature = this.encryption.signECC(testData, keyPair.privateKey);
            this.addTestResult('ECC签名', signature !== null, '成功生成ECC签名');
            
            // 测试ECC签名验证
            const isSignatureValid = this.encryption.verifyECC(testData, signature, keyPair.publicKey);
            this.addTestResult('ECC签名验证', isSignatureValid, 
                isSignatureValid ? 'ECC签名验证成功' : 'ECC签名验证失败');
            
        } catch (error) {
            this.addTestResult('ECC加密测试', false, error.message);
        }
        
        console.log('ECC加密测试完成\n');
    }

    /**
     * 测试批量操作功能
     */
    async testBatchOperations() {
        console.log('测试批量操作功能...');
        
        try {
            const testItems = ['item1', 'item2', 'item3', 'item4', 'item5'];
            
            // 测试批量加密
            const batchEncrypted = await this.encryption.batchEncrypt(testItems, 'aes');
            this.addTestResult('批量加密', batchEncrypted.length === testItems.length, 
                `批量加密${batchEncrypted.length}个项目`);
            
            // 测试批量解密
            const batchDecrypted = await this.encryption.batchDecrypt(batchEncrypted, 'aes');
            const isAllDecrypted = batchDecrypted.every((item, index) => item === testItems[index]);
            this.addTestResult('批量解密', isAllDecrypted, 
                isAllDecrypted ? '批量解密结果正确' : '批量解密结果不匹配');
            
        } catch (error) {
            this.addTestResult('批量操作测试', false, error.message);
        }
        
        console.log('批量操作测试完成\n');
    }

    /**
     * 添加测试结果
     */
    addTestResult(testName, success, message) {
        this.testResults.push({
            name: testName,
            success,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 打印测试结果
     */
    printTestResults() {
        console.log('='.repeat(60));
        console.log('测试结果汇总');
        console.log('='.repeat(60));
        
        let passedTests = 0;
        let totalTests = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅ 通过' : '❌ 失败';
            console.log(`${index + 1}. ${result.name}: ${status}`);
            console.log(`   ${result.message}`);
            
            if (result.success) {
                passedTests++;
            }
        });
        
        console.log('='.repeat(60));
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${totalTests - passedTests}`);
        console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));
        
        if (passedTests === totalTests) {
            console.log('🎉 所有测试通过！加密模块拆分成功！');
        } else {
            console.log('⚠️  部分测试失败，需要检查相关模块。');
        }
    }

    /**
     * 获取算法信息测试
     */
    testAlgorithmInfo() {
        console.log('测试算法信息获取...');
        
        try {
            const algorithmInfo = this.encryption.getAlgorithmInfo();
            console.log('支持的加密算法:');
            console.log(JSON.stringify(algorithmInfo, null, 2));
            
            this.addTestResult('算法信息获取', 
                algorithmInfo.aes && algorithmInfo.rsa && algorithmInfo.quantum, 
                '成功获取算法信息');
        } catch (error) {
            this.addTestResult('算法信息获取', false, error.message);
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.encryption) {
            this.encryption.destroy();
        }
    }
}

// 运行测试
async function runTests() {
    const test = new EncryptionTest();
    
    try {
        await test.runAllTests();
        test.testAlgorithmInfo();
    } catch (error) {
        console.error('测试执行失败:', error);
    } finally {
        test.cleanup();
    }
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { EncryptionTest, runTests };