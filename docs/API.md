# 纯真IP库查询API文档

## 概述

纯真IP库查询API是一个基于Node.js开发的高性能IP地址查询服务，提供RESTful API接口，支持单个IP查询、批量查询、当前访客IP查询等功能。

## 基础信息

- **基础URL**: `http://localhost:3000`
- **响应格式**: JSON
- **字符编码**: UTF-8
- **请求方法**: GET, POST
- **认证方式**: 无需认证

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体数据
  },
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

## API接口详情

### 1. 服务信息

#### 获取服务基本信息
```http
GET /
```

**响应示例:**
```json
{
  "name": "纯真IP库查询API",
  "version": "1.0.0",
  "description": "基于纯真IP库的高性能IP地址查询服务",
  "endpoints": {
    "/health": "健康检查",
    "/ip/:ip": "查询指定IP地址",
    "/myip": "查询当前访客IP",
    "/batch": "批量查询IP (POST)",
    "/stats": "服务统计信息"
  },
  "usage": {
    "single": "GET /ip/8.8.8.8",
    "current": "GET /myip",
    "batch": "POST /batch {\"ips\": [\"8.8.8.8\", \"114.114.114.114\"]}"
  }
}
```

### 2. 健康检查

#### 检查服务健康状态
```http
GET /health
```

**响应示例:**
```json
{
  "status": "ok",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "uptime": 3600,
  "database": "loaded",
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "cache": {
    "keys": 150,
    "stats": {
      "hits": 800,
      "misses": 200,
      "keys": 150,
      "ksize": 150,
      "vsize": 150
    }
  }
}
```

### 3. IP地址查询

#### 查询指定IP地址
```http
GET /ip/{ip}
```

**参数:**
- `ip` (string, required): 要查询的IP地址，格式为IPv4地址

**请求示例:**
```http
GET /ip/8.8.8.8
```

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
  "timestamp": "2023-12-01T12:00:00.000Z",
  "cached": false
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "无效的IP地址格式",
  "ip": "invalid.ip"
}
```

### 4. 当前访客IP查询

#### 查询当前访客的IP地址
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
  "timestamp": "2023-12-01T12:00:00.000Z",
  "cached": false
}
```

### 5. 批量IP查询

#### 批量查询多个IP地址
```http
POST /batch
Content-Type: application/json
```

**请求体:**
```json
{
  "ips": ["8.8.8.8", "114.114.114.114", "223.5.5.5"]
}
```

**参数:**
- `ips` (array, required): IP地址数组，最多支持100个IP地址

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
    },
    {
      "success": true,
      "ip": "114.114.114.114",
      "country": "中国",
      "province": "江苏",
      "city": "南京市",
      "area": "114DNS",
      "isp": "电信",
      "cached": false
    },
    {
      "success": true,
      "ip": "223.5.5.5",
      "country": "中国",
      "province": "浙江",
      "city": "杭州市",
      "area": "阿里云",
      "isp": "阿里云",
      "cached": false
    }
  ],
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "批量查询最多支持100个IP地址"
}
```

### 6. 服务统计

#### 获取服务统计信息
```http
GET /stats
```

**响应示例:**
```json
{
  "service": {
    "name": "纯真IP库查询API",
    "version": "1.0.0",
    "uptime": 3600,
    "startTime": "2023-12-01T08:00:00.000Z"
  },
  "database": {
    "loaded": true,
    "version": "20231201",
    "records": 500000
  },
  "queries": {
    "total": 1000,
    "cacheHits": 800,
    "cacheHitRate": "80.00%",
    "lastQuery": "2023-12-01T12:00:00.000Z"
  },
  "cache": {
    "keys": 150,
    "hits": 800,
    "misses": 200,
    "hitRate": "80.00%"
  },
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

## 错误码说明

| 错误信息 | 说明 | 解决方案 |
|----------|------|----------|
| 无效的IP地址格式 | IP地址格式不正确 | 检查IP地址格式是否为有效的IPv4地址 |
| IP地址未找到 | 数据库中未找到该IP的信息 | 该IP可能不在数据库范围内 |
| 批量查询最多支持100个IP地址 | 批量查询IP数量超过限制 | 减少批量查询的IP数量 |
| 请提供有效的IP地址数组 | 批量查询参数格式错误 | 检查请求体格式是否正确 |
| 服务器内部错误 | 服务器处理请求时发生错误 | 联系管理员或查看服务器日志 |

## 使用示例

### JavaScript (Fetch API)
```javascript
// 查询单个IP
fetch('http://localhost:3000/ip/8.8.8.8')
  .then(response => response.json())
  .then(data => console.log(data));

// 查询当前IP
fetch('http://localhost:3000/myip')
  .then(response => response.json())
  .then(data => console.log(data));

// 批量查询
fetch('http://localhost:3000/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ips: ['8.8.8.8', '114.114.114.114']
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Python (requests)
```python
import requests

# 查询单个IP
response = requests.get('http://localhost:3000/ip/8.8.8.8')
print(response.json())

# 查询当前IP
response = requests.get('http://localhost:3000/myip')
print(response.json())

# 批量查询
response = requests.post('http://localhost:3000/batch', json={
    'ips': ['8.8.8.8', '114.114.114.114']
})
print(response.json())
```

### cURL
```bash
# 查询单个IP
curl http://localhost:3000/ip/8.8.8.8

# 查询当前IP
curl http://localhost:3000/myip

# 批量查询
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -d '{"ips": ["8.8.8.8", "114.114.114.114"]}'

# 获取统计信息
curl http://localhost:3000/stats
```

## 性能说明

- **查询速度**: 单次查询响应时间通常在1-10ms之间
- **并发处理**: 支持1000+ QPS的并发查询
- **缓存机制**: 内置内存缓存，缓存时间1小时，大幅提升重复查询性能
- **批量查询**: 支持一次查询最多100个IP地址

## 注意事项

1. **IP地址格式**: 仅支持IPv4地址格式
2. **查询限制**: 批量查询最多支持100个IP地址
3. **缓存策略**: 查询结果会缓存1小时，重复查询会直接返回缓存结果
4. **数据更新**: IP数据库会定期自动更新，确保数据的准确性
5. **内网地址**: 对于内网IP地址（如192.168.x.x、10.x.x.x等），会返回"本地"或"内网地址"信息

## 联系支持

如果您在使用过程中遇到问题，请：

1. 查看 [FAQ文档](FAQ.md)
2. 检查 [GitHub Issues](https://github.com/your-username/qqwry-ip-api-server/issues)
3. 创建新的 [Issue](https://github.com/your-username/qqwry-ip-api-server/issues/new)