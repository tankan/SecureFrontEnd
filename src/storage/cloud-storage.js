import OSS from 'ali-oss';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import axios from 'axios';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

/**
 * 云存储服务集成模块
 * 支持阿里云OSS、AWS S3、Azure Blob Storage和OneDrive
 */
export class CloudStorageManager {
    constructor(config = {}) {
        this.config = config;
        this.providers = {};
        this.initializeProviders();
    }

    /**
     * 初始化云存储提供商
     */
    initializeProviders() {
    // 阿里云OSS
        if (this.config.aliyun) {
            this.providers.aliyun = new OSS({
                region: this.config.aliyun.region,
                accessKeyId: this.config.aliyun.accessKeyId,
                accessKeySecret: this.config.aliyun.accessKeySecret,
                bucket: this.config.aliyun.bucket
            });
        }

        // AWS S3
        if (this.config.aws) {
            this.providers.aws = new S3Client({
                region: this.config.aws.region,
                credentials: {
                    accessKeyId: this.config.aws.accessKeyId,
                    secretAccessKey: this.config.aws.secretAccessKey
                }
            });
        }

        // Azure Blob Storage
        if (this.config.azure) {
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${this.config.azure.accountName};AccountKey=${this.config.azure.accountKey};EndpointSuffix=core.windows.net`;

            this.providers.azure = BlobServiceClient.fromConnectionString(connectionString);
        }

        // OneDrive (通过Microsoft Graph API)
        if (this.config.onedrive) {
            this.providers.onedrive = {
                clientId: this.config.onedrive.clientId,
                clientSecret: this.config.onedrive.clientSecret,
                redirectUri: this.config.onedrive.redirectUri,
                accessToken: null
            };
        }
    }

    /**
     * 上传文件到指定云存储
     */
    async uploadFile(filePath, remotePath, provider = 'aliyun', options = {}) {
        try {
            const fileName = path.basename(filePath);
            const fileStats = await fs.stat(filePath);

            let result;

            switch (provider) {
                case 'aliyun':
                    result = await this.uploadToAliyun(filePath, remotePath, options);
                    break;
                case 'aws':
                    result = await this.uploadToAWS(filePath, remotePath, options);
                    break;
                case 'azure':
                    result = await this.uploadToAzure(filePath, remotePath, options);
                    break;
                case 'onedrive':
                    result = await this.uploadToOneDrive(filePath, remotePath, options);
                    break;
                default:
                    throw new Error(`不支持的云存储提供商: ${provider}`);
            }

            return {
                provider,
                localPath: filePath,
                remotePath,
                fileName,
                fileSize: fileStats.size,
                uploadTime: new Date().toISOString(),
                ...result
            };
        } catch (error) {
            throw new Error(`上传文件失败: ${error.message}`);
        }
    }

    /**
     * 上传到阿里云OSS
     */
    async uploadToAliyun(filePath, remotePath, options = {}) {
        try {
            const client = this.providers.aliyun;

            if (!client) {
                throw new Error('阿里云OSS客户端未初始化');
            }

            const result = await client.put(remotePath, filePath, {
                headers: options.headers || {},
                meta: options.metadata || {}
            });

            return {
                url: result.url,
                etag: result.res.headers.etag,
                requestId: result.res.headers['x-oss-request-id']
            };
        } catch (error) {
            throw new Error(`阿里云OSS上传失败: ${error.message}`);
        }
    }

    /**
     * 上传到AWS S3
     */
    async uploadToAWS(filePath, remotePath, options = {}) {
        try {
            const client = this.providers.aws;

            if (!client) {
                throw new Error('AWS S3客户端未初始化');
            }

            const fileStream = createReadStream(filePath);
            const uploadParams = {
                Bucket: this.config.aws.bucket,
                Key: remotePath,
                Body: fileStream,
                ContentType: options.contentType || 'application/octet-stream',
                Metadata: options.metadata || {}
            };

            const result = await client.send(new PutObjectCommand(uploadParams));

            return {
                etag: result.ETag,
                versionId: result.VersionId,
                url: `https://${this.config.aws.bucket}.s3.${this.config.aws.region}.amazonaws.com/${remotePath}`
            };
        } catch (error) {
            throw new Error(`AWS S3上传失败: ${error.message}`);
        }
    }

    /**
     * 上传到Azure Blob Storage
     */
    async uploadToAzure(filePath, remotePath, options = {}) {
        try {
            const blobServiceClient = this.providers.azure;

            if (!blobServiceClient) {
                throw new Error('Azure Blob Storage客户端未初始化');
            }

            const containerClient = blobServiceClient.getContainerClient(this.config.azure.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(remotePath);

            const uploadBlobResponse = await blockBlobClient.uploadFile(filePath, {
                blobHTTPHeaders: {
                    blobContentType: options.contentType || 'application/octet-stream'
                },
                metadata: options.metadata || {}
            });

            return {
                etag: uploadBlobResponse.etag,
                requestId: uploadBlobResponse.requestId,
                url: blockBlobClient.url
            };
        } catch (error) {
            throw new Error(`Azure Blob Storage上传失败: ${error.message}`);
        }
    }

    /**
     * 上传到OneDrive
     */
    async uploadToOneDrive(filePath, remotePath, options = {}) {
        try {
            const config = this.providers.onedrive;

            if (!config || !config.accessToken) {
                throw new Error('OneDrive访问令牌未设置');
            }

            const fileData = await fs.readFile(filePath);
            const fileName = path.basename(remotePath);

            const response = await axios.put(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${remotePath}:/content`,
                fileData,
                {
                    headers: {
                        Authorization: `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );

            return {
                id: response.data.id,
                downloadUrl: response.data['@microsoft.graph.downloadUrl'],
                webUrl: response.data.webUrl,
                size: response.data.size
            };
        } catch (error) {
            throw new Error(`OneDrive上传失败: ${error.message}`);
        }
    }

    /**
     * 下载文件
     */
    async downloadFile(remotePath, localPath, provider = 'aliyun', options = {}) {
        try {
            let result;

            switch (provider) {
                case 'aliyun':
                    result = await this.downloadFromAliyun(remotePath, localPath, options);
                    break;
                case 'aws':
                    result = await this.downloadFromAWS(remotePath, localPath, options);
                    break;
                case 'azure':
                    result = await this.downloadFromAzure(remotePath, localPath, options);
                    break;
                case 'onedrive':
                    result = await this.downloadFromOneDrive(remotePath, localPath, options);
                    break;
                default:
                    throw new Error(`不支持的云存储提供商: ${provider}`);
            }

            return {
                provider,
                remotePath,
                localPath,
                downloadTime: new Date().toISOString(),
                ...result
            };
        } catch (error) {
            throw new Error(`下载文件失败: ${error.message}`);
        }
    }

    /**
     * 从阿里云OSS下载
     */
    async downloadFromAliyun(remotePath, localPath, options = {}) {
        try {
            const client = this.providers.aliyun;
            const result = await client.get(remotePath, localPath);

            return {
                etag: result.res.headers.etag,
                lastModified: result.res.headers['last-modified'],
                contentLength: result.res.headers['content-length']
            };
        } catch (error) {
            throw new Error(`阿里云OSS下载失败: ${error.message}`);
        }
    }

    /**
     * 从AWS S3下载
     */
    async downloadFromAWS(remotePath, localPath, options = {}) {
        try {
            const client = this.providers.aws;
            const getObjectParams = {
                Bucket: this.config.aws.bucket,
                Key: remotePath
            };

            const result = await client.send(new GetObjectCommand(getObjectParams));

            // 将流写入文件
            const chunks = [];

            for await (const chunk of result.Body) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            await fs.writeFile(localPath, buffer);

            return {
                etag: result.ETag,
                lastModified: result.LastModified,
                contentLength: result.ContentLength
            };
        } catch (error) {
            throw new Error(`AWS S3下载失败: ${error.message}`);
        }
    }

    /**
     * 从Azure Blob Storage下载
     */
    async downloadFromAzure(remotePath, localPath, options = {}) {
        try {
            const blobServiceClient = this.providers.azure;
            const containerClient = blobServiceClient.getContainerClient(this.config.azure.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(remotePath);

            const downloadBlockBlobResponse = await blockBlobClient.downloadToFile(localPath);

            return {
                etag: downloadBlockBlobResponse.etag,
                lastModified: downloadBlockBlobResponse.lastModified,
                contentLength: downloadBlockBlobResponse.contentLength
            };
        } catch (error) {
            throw new Error(`Azure Blob Storage下载失败: ${error.message}`);
        }
    }

    /**
     * 从OneDrive下载
     */
    async downloadFromOneDrive(remotePath, localPath, options = {}) {
        try {
            const config = this.providers.onedrive;

            if (!config || !config.accessToken) {
                throw new Error('OneDrive访问令牌未设置');
            }

            // 获取下载URL
            const metaResponse = await axios.get(
                `https://graph.microsoft.com/v1.0/me/drive/root:/${remotePath}`,
                {
                    headers: {
                        Authorization: `Bearer ${config.accessToken}`
                    }
                }
            );

            const downloadUrl = metaResponse.data['@microsoft.graph.downloadUrl'];

            // 下载文件
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer'
            });

            await fs.writeFile(localPath, response.data);

            return {
                id: metaResponse.data.id,
                size: metaResponse.data.size,
                lastModified: metaResponse.data.lastModifiedDateTime
            };
        } catch (error) {
            throw new Error(`OneDrive下载失败: ${error.message}`);
        }
    }

    /**
     * 列出远程文件
     */
    async listFiles(prefix = '', provider = 'aliyun', options = {}) {
        try {
            let result;

            switch (provider) {
                case 'aliyun':
                    result = await this.listAliyunFiles(prefix, options);
                    break;
                case 'aws':
                    result = await this.listAWSFiles(prefix, options);
                    break;
                case 'azure':
                    result = await this.listAzureFiles(prefix, options);
                    break;
                case 'onedrive':
                    result = await this.listOneDriveFiles(prefix, options);
                    break;
                default:
                    throw new Error(`不支持的云存储提供商: ${provider}`);
            }

            return result;
        } catch (error) {
            throw new Error(`列出文件失败: ${error.message}`);
        }
    }

    /**
     * 列出阿里云OSS文件
     */
    async listAliyunFiles(prefix = '', options = {}) {
        try {
            const client = this.providers.aliyun;
            const result = await client.list({
                prefix,
                'max-keys': options.maxKeys || 1000
            });

            return {
                files: result.objects || [],
                isTruncated: result.isTruncated,
                nextMarker: result.nextMarker
            };
        } catch (error) {
            throw new Error(`列出阿里云OSS文件失败: ${error.message}`);
        }
    }

    /**
     * 列出AWS S3文件
     */
    async listAWSFiles(prefix = '', options = {}) {
        try {
            const client = this.providers.aws;
            const listParams = {
                Bucket: this.config.aws.bucket,
                Prefix: prefix,
                MaxKeys: options.maxKeys || 1000
            };

            const result = await client.send(new ListObjectsV2Command(listParams));

            return {
                files: result.Contents || [],
                isTruncated: result.IsTruncated,
                nextContinuationToken: result.NextContinuationToken
            };
        } catch (error) {
            throw new Error(`列出AWS S3文件失败: ${error.message}`);
        }
    }

    /**
     * 列出Azure Blob Storage文件
     */
    async listAzureFiles(prefix = '', options = {}) {
        try {
            const blobServiceClient = this.providers.azure;
            const containerClient = blobServiceClient.getContainerClient(this.config.azure.containerName);

            const files = [];

            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                files.push(blob);
                if (options.maxKeys && files.length >= options.maxKeys) {
                    break;
                }
            }

            return {
                files,
                isTruncated: false
            };
        } catch (error) {
            throw new Error(`列出Azure Blob Storage文件失败: ${error.message}`);
        }
    }

    /**
     * 列出OneDrive文件
     */
    async listOneDriveFiles(prefix = '', options = {}) {
        try {
            const config = this.providers.onedrive;

            if (!config || !config.accessToken) {
                throw new Error('OneDrive访问令牌未设置');
            }

            const folderPath = prefix ? `root:/${prefix}:` : 'root';
            const response = await axios.get(
                `https://graph.microsoft.com/v1.0/me/drive/${folderPath}/children`,
                {
                    headers: {
                        Authorization: `Bearer ${config.accessToken}`
                    },
                    params: {
                        $top: options.maxKeys || 1000
                    }
                }
            );

            return {
                files: response.data.value,
                isTruncated: false
            };
        } catch (error) {
            throw new Error(`列出OneDrive文件失败: ${error.message}`);
        }
    }

    /**
     * 删除远程文件
     */
    async deleteFile(remotePath, provider = 'aliyun') {
        try {
            let result;

            switch (provider) {
                case 'aliyun':
                    result = await this.providers.aliyun.delete(remotePath);
                    break;
                case 'aws':
                    const deleteParams = {
                        Bucket: this.config.aws.bucket,
                        Key: remotePath
                    };

                    result = await this.providers.aws.send(new DeleteObjectCommand(deleteParams));
                    break;
                case 'azure':
                    const containerClient = this.providers.azure.getContainerClient(this.config.azure.containerName);
                    const blockBlobClient = containerClient.getBlockBlobClient(remotePath);

                    result = await blockBlobClient.delete();
                    break;
                case 'onedrive':
                    const config = this.providers.onedrive;

                    result = await axios.delete(
                        `https://graph.microsoft.com/v1.0/me/drive/root:/${remotePath}`,
                        {
                            headers: {
                                Authorization: `Bearer ${config.accessToken}`
                            }
                        }
                    );
                    break;
                default:
                    throw new Error(`不支持的云存储提供商: ${provider}`);
            }

            return {
                provider,
                remotePath,
                deleteTime: new Date().toISOString(),
                result
            };
        } catch (error) {
            throw new Error(`删除文件失败: ${error.message}`);
        }
    }

    /**
     * 获取OneDrive访问令牌
     */
    async getOneDriveAccessToken(authCode) {
        try {
            const config = this.providers.onedrive;
            const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: authCode,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code',
                scope: 'https://graph.microsoft.com/Files.ReadWrite'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            config.accessToken = response.data.access_token;

            return response.data;
        } catch (error) {
            throw new Error(`获取OneDrive访问令牌失败: ${error.message}`);
        }
    }

    /**
     * 批量上传文件
     */
    async uploadBatch(files, provider = 'aliyun', options = {}) {
        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const result = await this.uploadFile(
                    file.localPath,
                    file.remotePath,
                    provider,
                    file.options || options
                );

                results.push(result);
            } catch (error) {
                errors.push({
                    file: file.localPath,
                    error: error.message
                });
            }
        }

        return {
            successful: results,
            failed: errors,
            totalFiles: files.length,
            successCount: results.length,
            failureCount: errors.length
        };
    }
}

export default CloudStorageManager;
