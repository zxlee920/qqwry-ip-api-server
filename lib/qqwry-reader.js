const fs = require('fs-extra');
const path = require('path');
const iconv = require('iconv-lite');
const axios = require('axios');

/**
 * 纯真IP库读取器
 * 支持读取和解析纯真IP数据库文件
 */
class QQWryReader {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/qqwry.dat');
        this.buffer = null;
        this.firstIndex = 0;
        this.lastIndex = 0;
        this.recordCount = 0;
        this.version = '';
    }

    /**
     * 加载数据库文件
     */
    async loadDatabase() {
        try {
            // 检查数据库文件是否存在
            if (!await fs.pathExists(this.dbPath)) {
                console.log('📥 数据库文件不存在，正在下载...');
                await this.downloadDatabase();
            }

            // 读取数据库文件
            this.buffer = await fs.readFile(this.dbPath);
            
            // 读取索引信息
            this.firstIndex = this.buffer.readUInt32LE(0);
            this.lastIndex = this.buffer.readUInt32LE(4);
            this.recordCount = Math.floor((this.lastIndex - this.firstIndex) / 7) + 1;
            
            // 读取版本信息
            await this.readVersion();
            
            console.log(`✅ 数据库加载完成，共 ${this.recordCount} 条记录`);
            
        } catch (error) {
            throw new Error(`数据库加载失败: ${error.message}`);
        }
    }

    /**
     * 下载纯真IP数据库
     */
    async downloadDatabase() {
        try {
            // 确保数据目录存在
            await fs.ensureDir(path.dirname(this.dbPath));
            
            // 从GitHub下载最新的纯真IP库
            const downloadUrl = 'https://github.com/metowolf/qqwry.dat/releases/latest/download/qqwry.dat';
            
            console.log('📡 正在从GitHub下载纯真IP库...');
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'QQWry-IP-API/1.0.0'
                }
            });

            // 保存文件
            const writer = fs.createWriteStream(this.dbPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('✅ 纯真IP库下载完成');
                    resolve();
                });
                writer.on('error', reject);
            });

        } catch (error) {
            throw new Error(`下载数据库失败: ${error.message}`);
        }
    }

    /**
     * 读取版本信息
     */
    async readVersion() {
        try {
            // 查询特殊IP获取版本信息
            const versionResult = await this.query('255.255.255.255');
            if (versionResult && versionResult.area) {
                this.version = versionResult.area;
            } else {
                this.version = '未知版本';
            }
        } catch (error) {
            this.version = '版本读取失败';
        }
    }

    /**
     * 查询IP地址信息
     * @param {string} ip IP地址
     * @returns {Object|null} 查询结果
     */
    async query(ip) {
        if (!this.buffer) {
            throw new Error('数据库未加载');
        }

        try {
            const ipNum = this.ip2long(ip);
            if (ipNum === null) {
                return null;
            }

            // 二分查找IP记录
            const recordOffset = this.searchRecord(ipNum);
            if (recordOffset === -1) {
                return null;
            }

            // 读取记录详情
            return this.readRecord(recordOffset);

        } catch (error) {
            console.error(`查询IP ${ip} 失败:`, error);
            return null;
        }
    }

    /**
     * IP地址转换为长整型
     * @param {string} ip IP地址
     * @returns {number|null} 长整型IP
     */
    ip2long(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) {
            return null;
        }

        let result = 0;
        for (let i = 0; i < 4; i++) {
            const part = parseInt(parts[i], 10);
            if (isNaN(part) || part < 0 || part > 255) {
                return null;
            }
            result = (result << 8) + part;
        }

        return result >>> 0; // 转换为无符号32位整数
    }

    /**
     * 长整型转换为IP地址
     * @param {number} num 长整型IP
     * @returns {string} IP地址
     */
    long2ip(num) {
        return [
            (num >>> 24) & 0xFF,
            (num >>> 16) & 0xFF,
            (num >>> 8) & 0xFF,
            num & 0xFF
        ].join('.');
    }

    /**
     * 二分查找IP记录
     * @param {number} ipNum IP长整型
     * @returns {number} 记录偏移量
     */
    searchRecord(ipNum) {
        let left = 0;
        let right = this.recordCount - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const offset = this.firstIndex + mid * 7;
            
            const startIP = this.buffer.readUInt32LE(offset);
            
            if (ipNum < startIP) {
                right = mid - 1;
            } else {
                // 读取结束IP
                const recordOffset = this.buffer.readUInt32LE(offset + 4) & 0xFFFFFF;
                const endIP = this.buffer.readUInt32LE(recordOffset);
                
                if (ipNum <= endIP) {
                    return recordOffset;
                } else {
                    left = mid + 1;
                }
            }
        }

        return -1;
    }

    /**
     * 读取记录详情
     * @param {number} offset 记录偏移量
     * @returns {Object} 记录信息
     */
    readRecord(offset) {
        try {
            // 跳过结束IP（4字节）
            let pos = offset + 4;
            
            // 读取国家信息
            const countryFlag = this.buffer.readUInt8(pos);
            pos++;

            let country = '';
            let area = '';

            if (countryFlag === 1) {
                // 重定向模式1
                const redirectOffset = this.buffer.readUInt32LE(pos) & 0xFFFFFF;
                pos += 3;
                const result = this.readString(redirectOffset);
                country = result.country;
                area = result.area;
            } else if (countryFlag === 2) {
                // 重定向模式2
                const countryOffset = this.buffer.readUInt32LE(pos) & 0xFFFFFF;
                pos += 3;
                country = this.readCString(countryOffset);
                area = this.readArea(pos);
            } else {
                // 直接模式
                pos--;
                country = this.readCString(pos);
                pos += country.length + 1;
                area = this.readArea(pos);
            }

            // 解析结果
            const result = this.parseLocation(country, area);
            
            return {
                country: result.country,
                province: result.province,
                city: result.city,
                area: result.area,
                isp: result.isp
            };

        } catch (error) {
            console.error('读取记录失败:', error);
            return null;
        }
    }

    /**
     * 读取字符串和区域信息
     * @param {number} offset 偏移量
     * @returns {Object} 包含国家和区域的对象
     */
    readString(offset) {
        const flag = this.buffer.readUInt8(offset);
        
        if (flag === 1 || flag === 2) {
            const redirectOffset = this.buffer.readUInt32LE(offset + 1) & 0xFFFFFF;
            const country = this.readCString(redirectOffset);
            const area = this.readArea(offset + 4);
            return { country, area };
        } else {
            const country = this.readCString(offset);
            const area = this.readArea(offset + country.length + 1);
            return { country, area };
        }
    }

    /**
     * 读取区域信息
     * @param {number} offset 偏移量
     * @returns {string} 区域字符串
     */
    readArea(offset) {
        const flag = this.buffer.readUInt8(offset);
        
        if (flag === 1 || flag === 2) {
            const redirectOffset = this.buffer.readUInt32LE(offset + 1) & 0xFFFFFF;
            return this.readCString(redirectOffset);
        } else {
            return this.readCString(offset);
        }
    }

    /**
     * 读取C风格字符串（以\0结尾）
     * @param {number} offset 偏移量
     * @returns {string} 字符串
     */
    readCString(offset) {
        let end = offset;
        while (end < this.buffer.length && this.buffer[end] !== 0) {
            end++;
        }
        
        if (end === offset) {
            return '';
        }

        const bytes = this.buffer.slice(offset, end);
        return iconv.decode(bytes, 'gbk').trim();
    }

    /**
     * 解析位置信息
     * @param {string} country 国家信息
     * @param {string} area 区域信息
     * @returns {Object} 解析后的位置信息
     */
    parseLocation(country, area) {
        // 清理无效信息
        country = this.cleanString(country);
        area = this.cleanString(area);

        let province = '未知';
        let city = '未知';
        let areaInfo = '未知';
        let isp = '未知';

        // 优先处理country字段中的完整地址信息
        if (country && (country.includes('–') || country.includes('-'))) {
            const parts = country.split(/[–\-]/).map(part => part.trim());
            
            if (parts.length >= 2) {
                // 第1部分：国家（通常是"中国"）
                // 第2部分：省份
                if (parts[1]) {
                    province = parts[1];
                }
                
                // 第3部分：城市
                if (parts[2]) {
                    city = parts[2];
                }
                
                // 第4部分：区域（如果存在）
                if (parts[3]) {
                    areaInfo = parts[3];
                }
            }
        } else {
            // 如果country字段没有完整信息，使用传统解析方法
            const fullLocation = `${country} ${area}`.trim();

            // 解析省份
            const provincePatterns = [
                /(北京|天津|上海|重庆)/,
                /(河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾)省?/,
                /(内蒙古|广西|西藏|宁夏|新疆)(?:自治区)?/,
                /(香港|澳门)(?:特别行政区)?/
            ];

            for (const pattern of provincePatterns) {
                const match = fullLocation.match(pattern);
                if (match) {
                    province = match[1];
                    break;
                }
            }

            // 解析城市
            const cityPatterns = [
                /([^省市自治区–\-]{2,}?市)/,
                /([^省市自治区–\-]{2,}?县)/,
                /([^省市自治区–\-]{2,}?区)/,
            ];

            for (const pattern of cityPatterns) {
                const match = fullLocation.match(pattern);
                if (match) {
                    city = match[1];
                    break;
                }
            }

            // 如果area字段有信息，作为区域信息
            if (area && area !== '未知') {
                areaInfo = area;
            }
        }

        // 解析ISP信息 - 从area字段中提取
        const ispPatterns = [
            /(中国电信|电信)/,
            /(中国联通|联通)/,
            /(中国移动|移动)/,
            /(铁通|教育网|广电|长城宽带|方正宽带|歌华有线)/,
            /(阿里云|腾讯云|华为云|百度云)/,
            /China\s+(Telecom|Unicom|Mobile)/i
        ];
        
        // 处理area字段：区分区域信息和ISP信息
        if (area) {
            // 检查area是否为纯ISP信息
            let isAreaPureISP = false;
            for (const pattern of ispPatterns) {
                const match = area.match(pattern);
                if (match) {
                    isp = match[1];
                    // 如果area字段就是ISP信息（如"联通"、"电信"），则不作为区域信息
                    if (area.trim() === match[1] || area.trim().length <= 4) {
                        isAreaPureISP = true;
                    }
                    break;
                }
            }
            
            // 如果area字段没有被4段式地址覆盖，且不是纯ISP信息，则使用area作为区域信息
            if (areaInfo === '未知' && !isAreaPureISP) {
                areaInfo = area;
            }
        }
        
        // 如果没有从area中找到ISP，尝试从完整文本中查找
        if (isp === '未知') {
            const fullText = `${country} ${area}`.trim();
            for (const pattern of ispPatterns) {
                const match = fullText.match(pattern);
                if (match) {
                    isp = match[1];
                    break;
                }
            }
        }

        return {
            country: country || '中国',
            province: province,
            city: city,
            area: areaInfo,
            isp: isp
        };
    }

    /**
     * 清理字符串中的无效字符
     * @param {string} str 原始字符串
     * @returns {string} 清理后的字符串
     */
    cleanString(str) {
        if (!str) return '';
        
        return str
            .replace(/CZ88\.NET/gi, '')
            .replace(/纯真网络/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 获取数据库版本
     * @returns {string} 版本信息
     */
    getVersion() {
        return this.version;
    }

    /**
     * 获取记录数量
     * @returns {number} 记录数量
     */
    getRecordCount() {
        return this.recordCount;
    }

    /**
     * 检查数据库是否需要更新
     * @returns {boolean} 是否需要更新
     */
    async needsUpdate() {
        try {
            if (!await fs.pathExists(this.dbPath)) {
                return true;
            }

            const stats = await fs.stat(this.dbPath);
            const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            
            // 如果文件超过7天未更新，则需要更新
            return daysSinceModified > 7;
            
        } catch (error) {
            return true;
        }
    }

    /**
     * 更新数据库
     */
    async updateDatabase() {
        try {
            console.log('🔄 正在更新纯真IP库...');
            
            // 备份当前数据库
            const backupPath = this.dbPath + '.backup';
            if (await fs.pathExists(this.dbPath)) {
                await fs.copy(this.dbPath, backupPath);
            }

            // 下载新数据库
            await this.downloadDatabase();
            
            // 重新加载
            await this.loadDatabase();
            
            // 删除备份
            if (await fs.pathExists(backupPath)) {
                await fs.remove(backupPath);
            }
            
            console.log('✅ 数据库更新完成');
            
        } catch (error) {
            console.error('❌ 数据库更新失败:', error.message);
            
            // 恢复备份
            const backupPath = this.dbPath + '.backup';
            if (await fs.pathExists(backupPath)) {
                await fs.copy(backupPath, this.dbPath);
                await fs.remove(backupPath);
                console.log('🔄 已恢复备份数据库');
            }
            
            throw error;
        }
    }
}

module.exports = QQWryReader;