# 纯真IP库查询API服务

基于纯真IP库(qqwry.dat)的高性能IP地址查询API服务，使用Node.js开发，支持高并发查询和智能缓存。

## 🌟 特性

- 🚀 **高性能**: 基于纯真IP库，查询速度快
- 💾 **智能缓存**: 内存缓存机制，减少重复查询
- 🌐 **RESTful API**: 标准的REST接口设计
- 📊 **统计监控**: 提供详细的查询统计信息
- 🔄 **自动更新**: 支持自动下载最新IP库
- 🐳 **容器化**: 支持Docker部署
- ⚡ **集群模式**: 支持PM2集群部署

## 📦 安装部署

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- 内存 >= 512MB

### 快速开始

```bash
# 克隆项目
git clone https://github.com/your-username/qqwry-ip-api-server.git
cd qqwry-ip-api-server

# 安装依赖
npm install

# 启动服务
npm start
```

服务启动后访问: http://localhost:3000

### 开发模式

```bash
# 开发模式启动（自动重启）
npm run dev
```

### 生产部署

```bash
# 使用PM2部署
npm install -g pm2
npm run pm2-start

# 查看状态
pm2 status

# 查看日志
pm2 logs qqwry-api
```

## 🔧 配置

### 环境变量

```bash
PORT=3000          # 服务端口
HOST=0.0.0.0       # 监听地址
NODE_ENV=production # 运行环境
```

### PM2配置

编辑 `ecosystem.config.js` 文件进行高级配置：

- 集群实例数
- 内存限制
- 日志配置
- 自动重启策略

## 📖 API文档

### 基础信息

- **基础URL**: `http://localhost:3000`
- **响应格式**: JSON
- **字符编码**: UTF-8

### 接口列表

#### 1. 健康检查

```http
GET /health
```

**响应示例:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 3600,
  "database": "loaded"
}
```

#### 2. 查询指定IP

```http
GET /ip/{ip}
```

**参数:**
- `ip`: 要查询的IP地址

**响应示例:**
```json
{
  "success": true,
  "ip": "8.8.8.8",
  "country": "美国",
  "province": "未知",
  "city": "未知",
  "area": "Google DNS",
  "isp": "Google",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "cached": false
}
```

#### 3. 查询当前访客IP

```http
GET /myip
```

**响应示例:**
```json
{
  "success": true,
  "ip": "123.456.789.0",
  "country": "中国",
  "province": "北京",
  "city": "北京市",
  "area": "北京市",
  "isp": "电信",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "cached": false
}
```

#### 4. 批量查询IP

```http
POST /batch
Content-Type: application/json

{
  "ips": ["8.8.8.8", "114.114.114.114", "223.5.5.5"]
}
```

**响应示例:**
```json
{
  "success": true,
  "total": 3,
  "results": [
    {
      "success": true,
      "ip": "8.8.8.8",
      "country": "美国",
      "province": "未知",
      "city": "未知",
      "area": "Google DNS",
      "isp": "Google",
      "cached": false
    }
  ],
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### 5. 统计信息

```http
GET /stats
```

**响应示例:**
```json
{
  "service": {
    "name": "纯真IP库查询API",
    "version": "1.0.0",
    "uptime": 3600
  },
  "database": {
    "loaded": true,
    "version": "20250101",
    "records": 500000
  },
  "queries": {
    "total": 1000,
    "cacheHits": 800,
    "cacheHitRate": "80.00%"
  }
}
```

## 🛠️ 管理命令

### 数据库管理

```bash
# 手动更新IP库
npm run update-db

# 强制更新IP库
npm run update-db -- --force
```

### 测试

```bash
# 运行测试套件
npm test

# 测试纯真IP库读取器
node test/test.js
```

### PM2管理

```bash
# 启动服务
npm run pm2-start

# 停止服务
npm run pm2-stop

# 重启服务
npm run pm2-restart

# 查看状态
pm2 status qqwry-api

# 查看日志
pm2 logs qqwry-api

# 监控面板
pm2 monit
```

## 🐳 Docker部署

### 构建镜像

```bash
# 构建Docker镜像
docker build -t qqwry-api .

# 运行容器
docker run -d -p 3000:3000 --name qqwry-api qqwry-api
```

### Docker Compose

```yaml
version: '3.8'
services:
  qqwry-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

## 📊 性能指标

### 基准测试

- **查询速度**: ~0.1ms (缓存命中)
- **并发处理**: 1000+ QPS
- **内存占用**: ~100MB (含IP库)
- **缓存命中率**: 80%+

### 优化建议

1. **启用集群模式**: 使用PM2集群部署
2. **配置反向代理**: 使用Nginx进行负载均衡
3. **调整缓存策略**: 根据访问模式调整缓存时间
4. **监控资源使用**: 定期检查内存和CPU使用情况

## 🔍 故障排除

### 常见问题

**Q: 服务启动失败？**
A: 检查端口是否被占用，确保Node.js版本符合要求

**Q: IP查询结果不准确？**
A: 运行 `npm run update-db` 更新IP库到最新版本

**Q: 内存使用过高？**
A: 调整缓存配置或重启服务释放内存

**Q: 查询速度慢？**
A: 检查缓存命中率，考虑增加缓存时间

### 日志分析

```bash
# 查看错误日志
pm2 logs qqwry-api --err

# 查看访问日志
pm2 logs qqwry-api --out

# 实时监控
pm2 monit
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [纯真IP库](https://github.com/metowolf/qqwry.dat) - 提供IP地址数据
- [Express.js](https://expressjs.com/) - Web框架
- [PM2](https://pm2.keymetrics.io/) - 进程管理器

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [FAQ](docs/FAQ.md)
2. 搜索 [Issues](https://github.com/your-username/qqwry-ip-api-server/issues)
3. 创建新的 [Issue](https://github.com/your-username/qqwry-ip-api-server/issues/new)

---

⭐ 如果这个项目对您有帮助，请给个星标支持！