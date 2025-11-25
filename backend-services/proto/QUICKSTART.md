# Proto 统一管理 - 快速上手

## 🎯 概述

Proto 文件已统一迁移到根目录的 `proto/` 文件夹，所有服务的 gRPC 配置已自动更新。

## ⚡ 快速验证

### 1. 运行验证脚本

```bash
# 验证所有 proto 文件路径是否正确
node proto/verify-proto-paths.js
```

**预期输出**:
```
🚀 Proto 文件路径验证工具
══════════════════════════════════════════════════════════════════════

📁 验证根目录 proto 文件是否存在
══════════════════════════════════════════════════════════════════════
✓ user_auth.proto 存在
✓ relationship.proto 存在
✓ user.proto 存在

🔍 验证服务文件中的 proto 引用路径
══════════════════════════════════════════════════════════════════════
✓ user-service/src/rpc/server.js
  └─ 引用: user_auth.proto
✓ relationship-service/src/rpc/server.js
  └─ 引用: relationship.proto
...（更多文件）

📊 验证总结
══════════════════════════════════════════════════════════════════════
总文件数: 10
✓ 通过: 10
失败: 0

✅ 所有验证通过！Proto 文件路径配置正确。
ℹ️  现在可以重启服务进行功能测试。
```

### 2. 重启服务

```powershell
# Windows - 使用启动脚本
.\start-all-services.ps1
```

```bash
# Linux/Mac - 手动启动服务
cd user-service && npm start &
cd relationship-service && npm start &
# ... 其他服务
```

### 3. 验证 gRPC 通信

服务启动后，检查日志中是否有 gRPC 相关错误：

```
✓ 正常启动日志:
  📡 gRPC server for UserAuthService running on port 50051
  🚀 关系服务 gRPC 服务运行在端口 50053

✗ 错误日志示例:
  ❌ Cannot find module '../../../proto/user_auth.proto'
  ❌ Failed to bind gRPC server
```

## 📚 文档目录

- **`README.md`** - Proto 文件功能说明和使用方法
- **`MIGRATION_GUIDE.md`** - 详细的迁移指南和故障排查
- **`QUICKSTART.md`** - 本文档（快速上手）
- **`verify-proto-paths.js`** - 自动验证脚本

## 🔧 常见问题

### Q: 验证脚本报错怎么办？

**A**: 查看具体的错误信息：
- 如果是 proto 文件不存在 → 检查 `proto/` 目录
- 如果是路径引用错误 → 参考 `MIGRATION_GUIDE.md` 的路径计算说明

### Q: 服务启动失败？

**A**: 检查步骤：
1. 确认 proto 文件存在: `ls proto/`
2. 运行验证脚本: `node proto/verify-proto-paths.js`
3. 查看服务日志中的具体错误信息
4. 参考 `MIGRATION_GUIDE.md` 的故障排查章节

### Q: 旧的 proto 文件需要删除吗？

**A**: 不是必须的：
- **保留**: 作为备份，不影响新配置
- **删除**: 验证一切正常后可删除（节省空间）

删除命令（可选）：
```powershell
# Windows PowerShell
Remove-Item -Path "user-service\src\rpc\proto" -Recurse -Force
Remove-Item -Path "relationship-service\src\rpc\proto" -Recurse -Force
# ... 其他服务
```

## ✅ 验证清单

- [ ] Proto 文件已存在于根目录 `proto/` 文件夹
- [ ] 运行验证脚本，所有检查通过
- [ ] 所有服务成功启动，无 proto 相关错误
- [ ] gRPC 客户端能正常调用服务
- [ ] （可选）删除旧的 proto 文件目录

## 🆘 需要帮助？

- 查看详细文档: `proto/README.md`
- 迁移指南: `proto/MIGRATION_GUIDE.md`
- 联系团队: Backend Team

---

**最后更新**: 2025-10-29

