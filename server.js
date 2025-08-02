const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const NodeCache = require('node-cache');
const QQWryReader = require('./lib/qqwry-reader.js');
const path = require('path');
const fs = require('fs-extra');
const logger = require('./lib/logger');
const scheduler = require('./lib/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 缓存配置 - 缓存1小时
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// 统计信息
let stats = {
    totalQueries: 0,
    cacheHits: 0,
    startTime: new Date(),
    lastQuery: null
};

// 中间件
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 使用日志中间件
app.use(logger.expressMiddleware());

// 初始化纯真IP库
let qqwryReader;

async function initializeQQWry() {
    try {
        qqwryReader = new QQWryReader();
        await qqwryReader.loadDatabase();
        logger.info('✅ 纯真IP库加载成功');
        logger.info(`📊 IP数据库版本: ${qqwryReader.getVersion()}`);
        logger.info(`📈 IP记录数量: ${qqwryReader.getRecordCount()}`);
        
        // 初始化调度器
        scheduler.initialize(qqwryReader);
        scheduler.startAllJobs();
    } catch (error) {
        logger.error('❌ 纯真IP库加载失败:', error);
        process.exit(1);
    }
}

// 省份名称标准化映射
const provinceMapping = {
    '北京市': '北京', '天津市': '天津', '上海市': '上海', '重庆市': '重庆',
    '河北省': '河北', '山西省': '山西', '辽宁省': '辽宁', '吉林省': '吉林',
    '黑龙江省': '黑龙江', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
    '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
    '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '海南省': '海南',
    '四川省': '四川', '贵州省': '贵州', '云南省': '云南', '陕西省': '陕西',
    '甘肃省': '甘肃', '青海省': '青海', '台湾省': '台湾',
    '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏',
    '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
    '香港特别行政区': '香港', '澳门特别行政区': '澳门'
};

// 标准化省份名称
function normalizeProvinceName(location) {
    if (!location) return '未知';
    
    // 查找完全匹配
    for (const [fullName, shortName] of Object.entries(provinceMapping)) {
        if (location.includes(fullName.replace(/[省市自治区特别行政区]/g, ''))) {
            return shortName;
        }
    }
    
    // 模糊匹配
    const provinces = Object.values(provinceMapping);
    for (const province of provinces) {
        if (location.includes(province)) {
            return province;
        }
    }
    
    // 特殊处理
    if (location.includes('内蒙')) return '内蒙古';
    if (location.includes('新疆')) return '新疆';
    if (location.includes('西藏')) return '西藏';
    if (location.includes('宁夏')) return '宁夏';
    if (location.includes('广西')) return '广西';
    
    return '未知';
}

// 获取客户端真实IP
function getRealIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfIP = req.headers['cf-connecting-ip'];
    
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    if (cfIP) {
        return cfIP;
    }
    
    return req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
}

// 验证IP地址格式
function isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

// API路由

// 首页
app.get('/', (req, res) => {
    res.json({
        name: '纯真IP库查询API',
        version: '1.0.0',
        description: '基于纯真IP库的高性能IP地址查询服务',
        endpoints: {
            '/health': '健康检查',
            '/ip/:ip': '查询指定IP地址',
            '/myip': '查询当前访客IP',
            '/batch': '批量查询IP (POST)',
            '/stats': '服务统计信息'
        },
        usage: {
            single: 'GET /ip/8.8.8.8',
            current: 'GET /myip',
            batch: 'POST /batch {"ips": ["8.8.8.8", "114.114.114.114"]}'
        }
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: qqwryReader ? 'loaded' : 'not loaded',
        memory: process.memoryUsage(),
        cache: {
            keys: cache.keys().length,
            stats: cache.getStats()
        }
    });
});

// 查询指定IP
app.get('/ip/:ip', async (req, res) => {
    try {
        const ip = req.params.ip;
        stats.totalQueries++;
        stats.lastQuery = new Date();
        
        if (!isValidIP(ip)) {
            return res.status(400).json({
                success: false,
                error: '无效的IP地址格式',
                ip: ip
            });
        }
        
        // 检查缓存
        const cacheKey = `ip_${ip}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            stats.cacheHits++;
            return res.json({
                ...cached,
                cached: true
            });
        }
        
        // 查询IP信息
        const result = await qqwryReader.query(ip);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'IP地址未找到',
                ip: ip
            });
        }
        
        const response = {
            success: true,
            ip: ip,
            country: result.country || '中国',
            province: result.province || '未知',
            city: result.city || '未知',
            area: result.area || '未知',
            isp: result.isp || '未知',
            timestamp: new Date().toISOString(),
            cached: false
        };
        
        // 缓存结果
        cache.set(cacheKey, response);
        
        res.json(response);
        
    } catch (error) {
        console.error('IP查询错误:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误',
            ip: req.params.ip
        });
    }
});

// 查询当前访客IP
app.get('/myip', async (req, res) => {
    try {
        const clientIP = getRealIP(req);
        
        // 内网IP直接返回
        if (clientIP === '127.0.0.1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
            return res.json({
                success: true,
                ip: clientIP,
                country: '本地',
                province: '本地',
                city: '本地',
                area: '内网地址',
                isp: '本地',
                timestamp: new Date().toISOString(),
                cached: false
            });
        }
        
        // 查询真实IP
        req.params = { ip: clientIP };
        return await app._router.handle(req, res);
        
    } catch (error) {
        console.error('获取客户端IP错误:', error);
        res.status(500).json({
            success: false,
            error: '无法获取客户端IP地址'
        });
    }
});

// 批量查询IP
app.post('/batch', async (req, res) => {
    try {
        const { ips } = req.body;
        
        if (!Array.isArray(ips) || ips.length === 0) {
            return res.status(400).json({
                success: false,
                error: '请提供有效的IP地址数组'
            });
        }
        
        if (ips.length > 100) {
            return res.status(400).json({
                success: false,
                error: '批量查询最多支持100个IP地址'
            });
        }
        
        const results = [];
        
        for (const ip of ips) {
            if (!isValidIP(ip)) {
                results.push({
                    ip: ip,
                    success: false,
                    error: '无效的IP地址格式'
                });
                continue;
            }
            
            try {
                // 检查缓存
                const cacheKey = `ip_${ip}`;
                let result = cache.get(cacheKey);
                
                if (!result) {
                    // 查询IP信息
                    const queryResult = await qqwryReader.query(ip);
                    
                    if (queryResult) {
                        result = {
                            success: true,
                            ip: ip,
                            country: queryResult.country || '中国',
                            province: queryResult.province || '未知',
                            city: queryResult.city || '未知',
                            area: queryResult.area || '未知',
                            isp: queryResult.isp || '未知',
                            timestamp: new Date().toISOString(),
                            cached: false
                        };
                        
                        // 缓存结果
                        cache.set(cacheKey, result);
                    } else {
                        result = {
                            ip: ip,
                            success: false,
                            error: 'IP地址未找到'
                        };
                    }
                } else {
                    result.cached = true;
                    stats.cacheHits++;
                }
                
                results.push(result);
                stats.totalQueries++;
                
            } catch (error) {
                results.push({
                    ip: ip,
                    success: false,
                    error: '查询失败'
                });
            }
        }
        
        stats.lastQuery = new Date();
        
        res.json({
            success: true,
            total: ips.length,
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('批量查询错误:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});

// 服务统计信息
app.get('/stats', (req, res) => {
    const uptime = Math.floor(process.uptime());
    const cacheStats = cache.getStats();
    
    res.json({
        service: {
            name: '纯真IP库查询API',
            version: '1.0.0',
            uptime: uptime,
            startTime: stats.startTime
        },
        database: {
            loaded: !!qqwryReader,
            version: qqwryReader ? qqwryReader.getVersion() : null,
            records: qqwryReader ? qqwryReader.getRecordCount() : 0
        },
        queries: {
            total: stats.totalQueries,
            cacheHits: stats.cacheHits,
            cacheHitRate: stats.totalQueries > 0 ? (stats.cacheHits / stats.totalQueries * 100).toFixed(2) + '%' : '0%',
            lastQuery: stats.lastQuery
        },
        cache: {
            keys: cache.keys().length,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            hitRate: cacheStats.hits + cacheStats.misses > 0 ? 
                (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2) + '%' : '0%'
        },
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
async function startServer() {
    try {
        await initializeQQWry();
        
        app.listen(PORT, HOST, () => {
            logger.info(`🚀 纯真IP库查询API服务已启动`);
            logger.info(`📍 服务地址: http://${HOST}:${PORT}`);
            logger.info(`📖 API文档: http://${HOST}:${PORT}/`);
            logger.info(`💊 健康检查: http://${HOST}:${PORT}/health`);
            logger.info(`📊 统计信息: http://${HOST}:${PORT}/stats`);
        });
        
    } catch (error) {
        logger.error('❌ 服务启动失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('📴 收到SIGTERM信号，正在关闭服务...');
    scheduler.stopAllJobs();
    logger.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('📴 收到SIGINT信号，正在关闭服务...');
    scheduler.stopAllJobs();
    logger.close();
    process.exit(0);
});

// 启动服务
startServer();