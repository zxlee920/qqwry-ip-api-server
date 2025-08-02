const fs = require('fs-extra');
const path = require('path');
const util = require('util');

/**
 * 日志管理模块
 * 提供统一的日志记录功能
 */
class Logger {
    constructor(options = {}) {
        this.options = {
            logDir: path.join(__dirname, '../logs'),
            logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            maxLogSize: 10 * 1024 * 1024, // 10MB
            maxLogFiles: 10,
            ...options
        };

        // 日志级别
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            http: 3,
            debug: 4
        };

        // 日志颜色
        this.colors = {
            error: '\x1b[31m', // 红色
            warn: '\x1b[33m',  // 黄色
            info: '\x1b[36m',  // 青色
            http: '\x1b[35m',  // 紫色
            debug: '\x1b[32m'  // 绿色
        };

        // 重置颜色
        this.reset = '\x1b[0m';

        // 确保日志目录存在
        this.ensureLogDir();

        // 创建日志文件流
        this.createLogStreams();
    }

    /**
     * 确保日志目录存在
     */
    ensureLogDir() {
        try {
            fs.ensureDirSync(this.options.logDir);
        } catch (error) {
            console.error(`创建日志目录失败: ${error.message}`);
        }
    }

    /**
     * 创建日志文件流
     */
    createLogStreams() {
        const date = new Date().toISOString().split('T')[0];
        
        // 常规日志
        this.logStream = fs.createWriteStream(
            path.join(this.options.logDir, `app-${date}.log`),
            { flags: 'a' }
        );
        
        // 错误日志
        this.errorStream = fs.createWriteStream(
            path.join(this.options.logDir, `error-${date}.log`),
            { flags: 'a' }
        );
        
        // 访问日志
        this.accessStream = fs.createWriteStream(
            path.join(this.options.logDir, `access-${date}.log`),
            { flags: 'a' }
        );
    }

    /**
     * 格式化日志消息
     * @param {string} level 日志级别
     * @param {string} message 日志消息
     * @returns {string} 格式化后的日志
     */
    formatLog(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    }

    /**
     * 写入日志到文件
     * @param {string} level 日志级别
     * @param {string} message 日志消息
     */
    writeLog(level, message) {
        const formattedMessage = this.formatLog(level, message);
        
        // 写入到控制台
        if (this.shouldLog(level)) {
            const color = this.colors[level] || '';
            console.log(`${color}${formattedMessage.trim()}${this.reset}`);
        }
        
        // 写入到日志文件
        this.logStream.write(formattedMessage);
        
        // 错误日志同时写入错误日志文件
        if (level === 'error') {
            this.errorStream.write(formattedMessage);
        }
    }

    /**
     * 记录HTTP访问日志
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {number} duration 请求处理时间(ms)
     */
    logAccess(req, res, duration) {
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress;
                   
        const userAgent = req.headers['user-agent'] || '-';
        const method = req.method;
        const url = req.originalUrl || req.url;
        const status = res.statusCode;
        
        const logMessage = `${ip} - "${method} ${url}" ${status} ${duration}ms "${userAgent}"`;
        
        // 写入访问日志
        this.accessStream.write(this.formatLog('http', logMessage));
        
        // 控制台输出
        if (this.shouldLog('http')) {
            console.log(`${this.colors.http}[HTTP] ${logMessage}${this.reset}`);
        }
    }

    /**
     * 判断是否应该记录该级别的日志
     * @param {string} level 日志级别
     * @returns {boolean} 是否记录
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.options.logLevel];
    }

    /**
     * 记录错误日志
     * @param {string} message 日志消息
     * @param {Error} [error] 错误对象
     */
    error(message, error) {
        let logMessage = message;
        
        if (error) {
            logMessage += ` - ${error.message}`;
            if (error.stack) {
                logMessage += `\n${error.stack}`;
            }
        }
        
        this.writeLog('error', logMessage);
    }

    /**
     * 记录警告日志
     * @param {string} message 日志消息
     */
    warn(message) {
        this.writeLog('warn', message);
    }

    /**
     * 记录信息日志
     * @param {string} message 日志消息
     */
    info(message) {
        this.writeLog('info', message);
    }

    /**
     * 记录调试日志
     * @param {string} message 日志消息
     */
    debug(message) {
        this.writeLog('debug', message);
    }

    /**
     * 记录对象日志
     * @param {string} message 日志消息
     * @param {Object} obj 要记录的对象
     */
    logObject(message, obj, level = 'debug') {
        const objString = util.inspect(obj, { depth: null, colors: false });
        this.writeLog(level, `${message}\n${objString}`);
    }

    /**
     * 创建Express中间件
     * @returns {Function} Express中间件
     */
    expressMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            // 捕获响应结束事件
            res.on('finish', () => {
                const duration = Date.now() - start;
                this.logAccess(req, res, duration);
            });
            
            next();
        };
    }

    /**
     * 关闭日志流
     */
    close() {
        if (this.logStream) {
            this.logStream.end();
        }
        if (this.errorStream) {
            this.errorStream.end();
        }
        if (this.accessStream) {
            this.accessStream.end();
        }
    }

    /**
     * 清理旧日志文件
     */
    async cleanOldLogs() {
        try {
            const files = await fs.readdir(this.options.logDir);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            if (logFiles.length <= this.options.maxLogFiles) {
                return;
            }
            
            // 按修改时间排序
            const fileStats = await Promise.all(
                logFiles.map(async file => {
                    const filePath = path.join(this.options.logDir, file);
                    const stats = await fs.stat(filePath);
                    return { file, path: filePath, mtime: stats.mtime };
                })
            );
            
            fileStats.sort((a, b) => a.mtime - b.mtime);
            
            // 删除最旧的文件
            const filesToDelete = fileStats.slice(0, fileStats.length - this.options.maxLogFiles);
            for (const file of filesToDelete) {
                await fs.unlink(file.path);
                this.debug(`已清理旧日志文件: ${file.file}`);
            }
            
        } catch (error) {
            this.error('清理旧日志文件失败', error);
        }
    }
}

// 创建默认日志实例
const logger = new Logger();

module.exports = logger;