/**
 * Web Worker管理器
 * 管理多个加密解密Worker实例，实现负载均衡和并行处理
 */

export default class WorkerManager {
    constructor(workerCount = navigator.hardwareConcurrency || 4) {
        this.workers = [];
        this.workerCount = workerCount;
        this.currentWorkerIndex = 0;
        this.pendingTasks = new Map();
        this.taskIdCounter = 0;

        this.initializeWorkers();
    }

    /**
     * 初始化Worker池
     */
    initializeWorkers() {
        for (let i = 0; i < this.workerCount; i++) {
            const worker = new Worker(new URL('../workers/encryption-worker.js', import.meta.url), {
                type: 'module'
            });

            worker.onmessage = e => {
                this.handleWorkerMessage(e);
            };

            worker.onerror = error => {
                console.error(`Worker ${i} 错误:`, error);
            };

            this.workers.push({
                worker,
                busy: false,
                taskCount: 0
            });
        }
    }

    /**
     * 处理Worker消息
     */
    handleWorkerMessage(e) {
        const { id, success, result, error } = e.data;

        if (this.pendingTasks.has(id)) {
            const { resolve, reject } = this.pendingTasks.get(id);

            this.pendingTasks.delete(id);

            if (success) {
                resolve(result);
            } else {
                reject(new Error(error));
            }
        }
    }

    /**
     * 获取最空闲的Worker
     */
    getLeastBusyWorker() {
        let leastBusyWorker = this.workers[0];

        for (const worker of this.workers) {
            if (worker.taskCount < leastBusyWorker.taskCount) {
                leastBusyWorker = worker;
            }
        }

        return leastBusyWorker;
    }

    /**
     * 执行任务
     */
    executeTask(type, data) {
        return new Promise((resolve, reject) => {
            const taskId = ++this.taskIdCounter;
            const workerInfo = this.getLeastBusyWorker();

            // 记录待处理任务
            this.pendingTasks.set(taskId, { resolve, reject });

            // 增加Worker任务计数
            workerInfo.taskCount++;

            // 发送任务到Worker
            workerInfo.worker.postMessage({
                id: taskId,
                type,
                data
            });

            // 设置超时处理
            setTimeout(() => {
                if (this.pendingTasks.has(taskId)) {
                    this.pendingTasks.delete(taskId);
                    workerInfo.taskCount--;
                    reject(new Error('任务执行超时'));
                }
            }, 30000); // 30秒超时
        });
    }

    /**
     * AES加密
     */
    async encryptAES(plaintext, key, iv) {
        return this.executeTask('encrypt-aes', { plaintext, key, iv });
    }

    /**
     * AES解密
     */
    async decryptAES(encryptedData, key) {
        return this.executeTask('decrypt-aes', { encryptedData, key });
    }

    /**
     * RSA加密
     */
    async encryptRSA(plaintext, publicKey) {
        return this.executeTask('encrypt-rsa', { plaintext, publicKey });
    }

    /**
     * RSA解密
     */
    async decryptRSA(encryptedData, privateKey) {
        return this.executeTask('decrypt-rsa', { encryptedData, privateKey });
    }

    /**
     * 混合加密
     */
    async hybridEncrypt(plaintext, publicKey) {
        return this.executeTask('encrypt-hybrid', { plaintext, publicKey });
    }

    /**
     * 混合解密
     */
    async hybridDecrypt(encryptedData, encryptedKey, privateKey) {
        return this.executeTask('decrypt-hybrid', { encryptedData, encryptedKey, privateKey });
    }

    /**
     * ECC加密
     */
    async encryptECC(plaintext, publicKey) {
        return this.executeTask('encrypt-ecc', { plaintext, publicKey });
    }

    /**
     * ECC解密
     */
    async decryptECC(encryptedData, privateKey) {
        return this.executeTask('decrypt-ecc', { encryptedData, privateKey });
    }

    /**
     * ECC签名
     */
    async signECC(message, privateKey) {
        return this.executeTask('sign-ecc', { message, privateKey });
    }

    /**
     * ECC验证
     */
    async verifyECC(message, signature, publicKey) {
        return this.executeTask('verify-ecc', { message, signature, publicKey });
    }

    /**
     * 量子安全加密
     */
    async encryptQuantumSafe(plaintext, kyberPublicKey) {
        return this.executeTask('encrypt-quantum-safe', { plaintext, kyberPublicKey });
    }

    /**
     * 量子安全解密
     */
    async decryptQuantumSafe(encryptedData, kyberPrivateKey) {
        return this.executeTask('decrypt-quantum-safe', { encryptedData, kyberPrivateKey });
    }

    /**
     * 量子安全签名
     */
    async signQuantumSafe(message, dilithiumPrivateKey) {
        return this.executeTask('sign-quantum-safe', { message, dilithiumPrivateKey });
    }

    /**
     * 量子安全验证
     */
    async verifyQuantumSafe(message, signature, dilithiumPublicKey) {
        return this.executeTask('verify-quantum-safe', { message, signature, dilithiumPublicKey });
    }

    /**
     * 生成密钥对
     */
    async generateKeys(algorithm) {
        return this.executeTask('generate-keys', { algorithm });
    }

    /**
     * 批量加密
     */
    async batchEncrypt(items, key) {
    // 将任务分配到多个Worker
        const chunkSize = Math.ceil(items.length / this.workerCount);
        const chunks = [];

        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }

        const promises = chunks.map(chunk =>
            this.executeTask('batch-encrypt', { items: chunk, key })
        );

        const results = await Promise.all(promises);

        return results.flat();
    }

    /**
     * 批量解密
     */
    async batchDecrypt(items, key) {
    // 将任务分配到多个Worker
        const chunkSize = Math.ceil(items.length / this.workerCount);
        const chunks = [];

        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }

        const promises = chunks.map(chunk =>
            this.executeTask('batch-decrypt', { items: chunk, key })
        );

        const results = await Promise.all(promises);

        return results.flat();
    }

    /**
     * 并行处理多个不同类型的任务
     */
    async parallelProcess(tasks) {
        const promises = tasks.map(task =>
            this.executeTask(task.type, task.data)
        );

        return Promise.all(promises);
    }

    /**
     * 获取Worker状态
     */
    getWorkerStatus() {
        return this.workers.map((worker, index) => ({
            id: index,
            taskCount: worker.taskCount,
            busy: worker.busy
        }));
    }

    /**
     * 销毁所有Worker
     */
    destroy() {
        this.workers.forEach(workerInfo => {
            workerInfo.worker.terminate();
        });
        this.workers = [];
        this.pendingTasks.clear();
    }
}
