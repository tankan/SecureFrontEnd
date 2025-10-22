# API 文档

## 概述

SecureFrontEnd 提供了一套完整的 RESTful API，用于用户认证、密钥管理、资源管理、模块管理和安全监控等功能。所有 API 都遵循 REST 设计原则，使用 JSON 格式进行数据交换。

## 基础信息

- **Base URL**: `http://localhost:3000/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: JWT Bearer Token
- **API版本**: v1

## 新增功能

### 🏗️ 模块化架构支持
- **模块管理**: 统一的模块注册、启动、停止和健康监控
- **依赖管理**: 智能的模块依赖关系管理和解析
- **热插拔**: 支持模块的动态加载和卸载

### 🔐 增强安全特性
- **访问控制**: 基于角色的访问控制（RBAC）和权限管理
- **数据保护**: 端到端数据加密和隐私保护
- **安全监控**: 实时安全事件监控和威胁检测
- **合规审计**: 自动化合规检查和审计报告

## 模块管理 API

### 获取模块状态

```http
GET /modules/status
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalModules": 8,
    "activeModules": 7,
    "failedModules": 1,
    "modules": {
      "AccessControlSystem": {
        "status": "running",
        "health": "healthy",
        "uptime": "2h 30m",
        "lastHealthCheck": "2024-01-01T12:00:00Z"
      },
      "DataProtectionSystem": {
        "status": "running",
        "health": "healthy",
        "uptime": "2h 30m",
        "lastHealthCheck": "2024-01-01T12:00:00Z"
      }
    }
  }
}
```

### 启动模块

```http
POST /modules/{moduleName}/start
```

**响应**:
```json
{
  "success": true,
  "message": "模块启动成功",
  "data": {
    "moduleName": "SecurityMonitoringSystem",
    "status": "running",
    "startTime": "2024-01-01T12:00:00Z"
  }
}
```

### 停止模块

```http
POST /modules/{moduleName}/stop
```

### 重启模块

```http
POST /modules/{moduleName}/restart
```

### 获取模块健康报告

```http
GET /modules/health
```

**响应**:
```json
{
  "success": true,
  "data": {
    "overallHealth": "healthy",
    "healthScore": 95,
    "modules": [
      {
        "name": "AccessControlSystem",
        "health": "healthy",
        "metrics": {
          "responseTime": "15ms",
          "errorRate": "0.1%",
          "uptime": "99.9%"
        }
      }
    ]
  }
}
```

## 安全监控 API

### 获取安全事件

```http
GET /security/events
```

**查询参数**:
- `severity` - 事件严重程度 (low, medium, high, critical)
- `type` - 事件类型 (login_attempt, access_violation, data_breach)
- `from` - 开始时间 (ISO 8601)
- `to` - 结束时间 (ISO 8601)
- `page` - 页码
- `limit` - 每页数量

**响应**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_1704067200_abc123",
        "type": "login_attempt",
        "severity": "medium",
        "timestamp": "2024-01-01T12:00:00Z",
        "source": "192.168.1.100",
        "user": "john_doe",
        "details": {
          "success": false,
          "reason": "invalid_password",
          "attempts": 3
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 创建安全事件

```http
POST /security/events
```

**请求体**:
```json
{
  "type": "access_violation",
  "severity": "high",
  "source": "192.168.1.100",
  "details": {
    "resource": "/api/v1/admin/users",
    "method": "DELETE",
    "user": "unauthorized_user"
  }
}
```

## 合规审计 API

### 获取合规报告

```http
GET /compliance/reports
```

**响应**:
```json
{
  "success": true,
  "data": {
    "overallScore": 92,
    "lastAudit": "2024-01-01T00:00:00Z",
    "frameworks": {
      "GDPR": {
        "score": 95,
        "status": "compliant",
        "issues": []
      },
      "SOX": {
        "score": 88,
        "status": "mostly_compliant",
        "issues": [
          {
            "severity": "medium",
            "description": "Access logs retention period needs extension"
          }
        ]
      }
    }
  }
}
```

### 触发合规审计

```http
POST /compliance/audit
```

**请求体**:
```json
{
  "frameworks": ["GDPR", "SOX", "PCI-DSS"],
  "scope": "full"
}
```

## 访问控制 API

### 获取用户权限

```http
GET /access/permissions/{userId}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "roles": ["user", "moderator"],
    "permissions": [
      "read:resources",
      "write:resources",
      "delete:own_resources"
    ],
    "restrictions": {
      "rateLimit": "100/hour",
      "ipWhitelist": ["192.168.1.0/24"]
    }
  }
}
```

### 检查权限

```http
POST /access/check
```

**请求体**:
```json
{
  "userId": 1,
  "resource": "/api/v1/resources/123",
  "action": "delete"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "allowed": false,
    "reason": "insufficient_permissions",
    "requiredPermissions": ["delete:all_resources"]
  }
}
```

## 认证

### 获取访问令牌

```http
POST /auth/login
```

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### 用户注册

```http
POST /auth/register
```

**请求体**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "user"
}
```

### 刷新令牌

```http
POST /auth/refresh
```

**请求体**:
```json
{
  "refreshToken": "string"
}
```

### 用户登出

```http
POST /auth/logout
```

**Headers**: `Authorization: Bearer <token>`

### 获取当前用户信息

```http
GET /auth/me
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 密钥管理

### 获取用户密钥列表

```http
GET /keys?page=1&limit=20&purpose=resource_encryption
```

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `page` (可选): 页码，默认为 1
- `limit` (可选): 每页数量，默认为 20，最大 100
- `purpose` (可选): 密钥用途筛选
- `algorithm` (可选): 算法筛选

**响应**:
```json
{
  "success": true,
  "keys": [
    {
      "keyId": "key_1704067200_abc123",
      "algorithm": "aes-256-gcm",
      "purpose": "resource_encryption",
      "expiresAt": "2024-02-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isExpired": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasMore": false
  }
}
```

### 生成新密钥

```http
POST /keys/generate
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "purpose": "resource_encryption",
  "algorithm": "aes-256-gcm",
  "resourceId": "optional-resource-id",
  "expiresIn": "7d"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密钥生成成功",
  "key": {
    "keyId": "key_1704067200_def456",
    "algorithm": "aes-256-gcm",
    "purpose": "resource_encryption",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 获取密钥信息

```http
GET /keys/{keyId}
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "key": {
    "keyId": "key_1704067200_abc123",
    "userId": 1,
    "resourceId": null,
    "algorithm": "aes-256-gcm",
    "purpose": "resource_encryption",
    "isActive": true,
    "expiresAt": "2024-02-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "rotatedAt": null,
    "isExpired": false
  }
}
```

### 获取密钥数据

```http
GET /keys/{keyId}/data
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "keyData": {
    "keyId": "key_1704067200_abc123",
    "keyData": "a1b2c3d4e5f6...",
    "algorithm": "aes-256-gcm",
    "purpose": "resource_encryption",
    "expiresAt": "2024-02-01T00:00:00.000Z"
  }
}
```

### 轮换密钥

```http
POST /keys/rotate
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "keyId": "key_1704067200_abc123",
  "newPurpose": "resource_encryption",
  "newAlgorithm": "aes-256-gcm"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密钥轮换成功",
  "oldKeyId": "key_1704067200_abc123",
  "newKey": {
    "keyId": "key_1704067300_ghi789",
    "algorithm": "aes-256-gcm",
    "purpose": "resource_encryption",
    "expiresAt": "2024-02-08T00:00:00.000Z",
    "createdAt": "2024-01-01T01:00:00.000Z"
  }
}
```

### 删除密钥

```http
DELETE /keys/{keyId}
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "message": "密钥删除成功"
}
```

### 获取密钥使用统计

```http
GET /keys/{keyId}/usage
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "usage": {
    "statistics": [
      {
        "action": "key_access",
        "count": 15,
        "lastUsed": "2024-01-01T12:00:00.000Z",
        "success": true
      }
    ],
    "recentAccess": [
      {
        "action": "key_access",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "success": true,
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

### 批量轮换密钥

```http
POST /keys/batch-rotate
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "keyIds": ["key_1", "key_2"],
  "purpose": "resource_encryption",
  "olderThan": "30d",
  "rotateAll": false
}
```

## 资源管理

### 获取资源列表

```http
GET /resources?page=1&limit=20
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "resources": [
    {
      "id": "res_1704067200_abc123",
      "originalName": "app.js",
      "encryptedPath": "/encrypted/app.js.encrypted",
      "cloudProvider": "aliyun",
      "cloudPath": "https://bucket.oss-cn-hangzhou.aliyuncs.com/encrypted/app.js.encrypted",
      "fileSize": 1024000,
      "encryptionAlgorithm": "aes-256-gcm",
      "checksum": "sha256:a1b2c3...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "accessedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasMore": false
  }
}
```

### 获取资源解密密钥

```http
GET /resources/{resourceId}/key
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "keyData": {
    "keyId": "key_1704067200_abc123",
    "keyData": "a1b2c3d4e5f6...",
    "algorithm": "aes-256-gcm",
    "expiresAt": "2024-02-01T00:00:00.000Z"
  }
}
```

### 上传加密资源

```http
POST /resources/upload
```

**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**请求体**:
```
file: <encrypted-file>
originalName: "app.js"
encryptionAlgorithm: "aes-256-gcm"
keyId: "key_1704067200_abc123"
cloudProvider: "aliyun"
```

**响应**:
```json
{
  "success": true,
  "message": "资源上传成功",
  "resource": {
    "id": "res_1704067300_def456",
    "originalName": "app.js",
    "encryptedPath": "/encrypted/app.js.encrypted",
    "cloudPath": "https://bucket.oss-cn-hangzhou.aliyuncs.com/encrypted/app.js.encrypted",
    "fileSize": 1024000,
    "checksum": "sha256:a1b2c3..."
  }
}
```

### 删除资源

```http
DELETE /resources/{resourceId}
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "message": "资源删除成功"
}
```

## 管理员接口

### 获取所有用户

```http
GET /admin/users?page=1&limit=20
```

**Headers**: `Authorization: Bearer <admin-token>`

**响应**:
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLoginAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasMore": false
  }
}
```

### 获取所有密钥

```http
GET /admin/keys?page=1&limit=20
```

**Headers**: `Authorization: Bearer <admin-token>`

### 轮换所有密钥

```http
POST /admin/keys/rotate-all
```

**Headers**: `Authorization: Bearer <admin-token>`

### 获取系统统计

```http
GET /admin/stats
```

**Headers**: `Authorization: Bearer <admin-token>`

**响应**:
```json
{
  "success": true,
  "stats": {
    "users": {
      "total": 100,
      "active": 95,
      "newThisMonth": 10
    },
    "keys": {
      "total": 500,
      "active": 450,
      "expiringSoon": 25
    },
    "resources": {
      "total": 1000,
      "totalSize": "10GB",
      "uploadedThisMonth": 50
    },
    "system": {
      "uptime": "7d 12h 30m",
      "version": "1.0.0",
      "environment": "production"
    }
  }
}
```

## 错误处理

所有 API 错误都遵循统一的格式：

```json
{
  "error": "ERROR_CODE",
  "message": "错误描述",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/keys",
  "method": "POST",
  "details": {
    "errors": [
      {
        "field": "password",
        "message": "密码长度至少6位",
        "value": "123"
      }
    ]
  }
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求数据验证失败 |
| `AUTHENTICATION_ERROR` | 401 | 认证失败 |
| `AUTHORIZATION_ERROR` | 403 | 权限不足 |
| `NOT_FOUND_ERROR` | 404 | 资源不存在 |
| `CONFLICT_ERROR` | 409 | 资源冲突 |
| `RATE_LIMIT_ERROR` | 429 | 请求过于频繁 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

## 速率限制

API 实施了速率限制以防止滥用：

- **默认限制**: 每15分钟100个请求
- **认证用户**: 每15分钟1000个请求
- **管理员**: 每15分钟5000个请求

当达到速率限制时，响应头会包含以下信息：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-01T01:00:00.000Z
```

## SDK 和客户端库

我们提供了多种语言的 SDK：

- **JavaScript/TypeScript**: `npm install @secure-frontend/sdk`
- **Python**: `pip install secure-frontend-sdk`
- **Go**: `go get github.com/secure-frontend/go-sdk`
- **Java**: Maven/Gradle 依赖

### JavaScript SDK 示例

```javascript
import { SecureFrontendClient } from '@secure-frontend/sdk';

const client = new SecureFrontendClient({
  baseURL: 'https://api.secure-frontend.com',
  apiKey: 'your-api-key'
});

// 用户认证
const { token } = await client.auth.login({
  username: 'john_doe',
  password: 'password123'
});

// 生成密钥
const key = await client.keys.generate({
  purpose: 'resource_encryption',
  algorithm: 'aes-256-gcm'
});

// 获取资源
const resources = await client.resources.list({
  page: 1,
  limit: 20
});
```

## Webhook

系统支持 Webhook 通知，可以在特定事件发生时向您的服务器发送 HTTP 请求。

### 支持的事件

- `user.created` - 用户创建
- `user.login` - 用户登录
- `key.generated` - 密钥生成
- `key.rotated` - 密钥轮换
- `key.expired` - 密钥过期
- `resource.uploaded` - 资源上传
- `security.breach` - 安全事件

### Webhook 配置

```http
POST /admin/webhooks
```

**请求体**:
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["key.generated", "key.expired"],
  "secret": "your-webhook-secret"
}
```

### Webhook 负载示例

```json
{
  "id": "wh_1704067200_abc123",
  "event": "key.generated",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "keyId": "key_1704067200_def456",
    "userId": 1,
    "purpose": "resource_encryption",
    "algorithm": "aes-256-gcm"
  }
}
```

## 测试环境

我们提供了测试环境供开发和测试使用：

- **测试 API**: `https://api-staging.secure-frontend.com`
- **测试凭据**: 
  - 用户名: `test_user`
  - 密码: `test_password_123`

测试环境的数据会定期清理，请不要在生产环境中使用测试凭据。