# 生产环境采用 NIST 认证的 PQC 库指南（Windows）

- 目标：在生产采用经 NIST/FIPS 标准化（FIPS 203 ML-KEM、FIPS 204 ML-DSA）实现；开发/测试阶段可用 `liboqs`/`liboqs-node` 做原型验证。
- 原则：不要修改算法原生签名字节；若需携带元信息，请使用“签名封装”（envelope）在外层添加元信息与校验戳。

## 后端选择
- 开发/测试：`@skairipaapps/liboqs-node` 或 `liboqs-node`（Open Quantum Safe 的 Node 绑定）。
  - 注意：OQS 官方说明该库用于原型与实验，不建议生产使用。
- 生产：选择含有 ML-KEM/ML-DSA 并通过 FIPS 验证的商用库（供应商随时间更新）。
  - 与 OpenSSL 3 FIPS Provider 结合的 PQC 提供者出现后，可采用它们的 Provider 接入。

## Windows 安装（开发/测试）
- 依赖：`CMake`、`Visual Studio Build Tools`（含 C++）、`Python`（可选）、`OpenSSL >= 1.1.1`。
- 步骤：
  - 安装 CMake：https://cmake.org/download/
  - 安装 VS Build Tools：https://visualstudio.microsoft.com/visual-cpp-build-tools/
  - 安装 OpenSSL（可用 vcpkg 或预编译发行版）。
  - 安装 Node 依赖：
    - `npm install @skairipaapps/liboqs-node`（优先）或 `npm install liboqs-node`

## 代码接入建议
- 引入可插拔 Provider 接口（已提供 `src/core/encryption/quantum-provider.js`）。
- 在 `QuantumEncryption` 中检测 `PQCProvider.available`：
  - 可用时走真实 ML-DSA/ML-KEM；不可用走模拟实现。
- 封装结构：
  - 使用真实签名字节 `sig`；外部 envelope 附加：`version`、`algorithm`，并计算校验戳 `stamp = sha3-256(sig || meta)` 的前 16 字节。
  - 验证时：先校验 envelope 的长度与 `stamp`，再调用后端库验签 `verify(message, sig, pk)`。

## 运行与环境变量
- `SIGNATURE_ALGO=ML-DSA-65`、`KEM_ALGO=ML-KEM-768`（示例）
- 回退策略：当 `PQCProvider` 不可用时自动转模拟实现，保证功能可用。

## 安全注意事项
- 避免自定义更改算法返回的“签名字节”；携带元信息与校验戳应采用 envelope 外层。
- 保持常量时间比较、长度检查与解析健壮性，防止篡改与截断攻击。
- 关注供应商的 FIPS 验证进度，及时更新到经认证的实现。