const axios = require('axios');
const QQWryReader = require('../lib/qqwry-reader.js');

/**
 * API服务测试脚本
 */

const API_BASE_URL = 'http://localhost:3000';

// 测试用例
const testCases = {
    validIPs: [
        '8.8.8.8',          // Google DNS
        '114.114.114.114',  // 114 DNS
        '223.5.5.5',        // 阿里DNS
        '180.76.76.76',     // 百度DNS
        '119.29.29.29'      // 腾讯DNS
    ],
    invalidIPs: [
        '256.256.256.256',  // 超出范围
        '192.168.1',        // 不完整
        'invalid.ip',       // 非数字
        '192.168.1.256'     // 部分超出范围
    ],
    localIPs: [
        '127.0.0.1',        // 本地回环
        '192.168.1.1',      // 私有网络
        '10.0.0.1'          // 私有网络
    ]
};

/**
 * 测试纯真IP库读取器
 */
async function testQQWryReader() {
    console.log('🧪 测试纯真IP库读取器...\n');
    
    try {
        const reader = new QQWryReader();
        await reader.loadDatabase();
        
        console.log(`✅ 数据库加载成功`);
        console.log(`📊 版本信息: ${reader.getVersion()}`);
        console.log(`📈 记录数量: ${reader.getRecordCount()}\n`);
        
        // 测试有效IP查询
        console.log('📍 测试有效IP查询:');
        for (const ip of testCases.validIPs) {
            const result = await reader.query(ip);
            if (result) {
                console.log(`  ${ip.padEnd(15)} -> ${result.country} ${result.province} ${result.city} ${result.isp}`);
            } else {
                console.log(`  ${ip.padEnd(15)} -> ❌ 查询失败`);
            }
        }
        
        console.log('\n🏠 测试本地IP查询:');
        for (const ip of testCases.localIPs) {
            const result = await reader.query(ip);
            if (result) {
                console.log(`  ${ip.padEnd(15)} -> ${result.country} ${result.province} ${result.city}`);
            } else {
                console.log(`  ${ip.padEnd(15)} -> ❌ 查询失败`);
            }
        }
        
        console.log('\n❌ 测试无效IP查询:');
        for (const ip of testCases.invalidIPs) {
            const result = await reader.query(ip);
            console.log(`  ${ip.padEnd(15)} -> ${result ? '意外成功' : '正确失败'}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ 纯真IP库测试失败:', error.message);
        return false;
    }
}

/**
 * 测试API服务
 */
async function testAPIService() {
    console.log('\n🌐 测试API服务...\n');
    
    try {
        // 测试健康检查
        console.log('💊 测试健康检查:');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log(`  状态: ${healthResponse.data.status}`);
        console.log(`  运行时间: ${healthResponse.data.uptime}秒`);
        console.log(`  数据库: ${healthResponse.data.database}\n`);
        
        // 测试单个IP查询
        console.log('🔍 测试单个IP查询:');
        for (const ip of testCases.validIPs.slice(0, 3)) {
            try {
                const response = await axios.get(`${API_BASE_URL}/ip/${ip}`);
                const data = response.data;
                if (data.success) {
                    console.log(`  ${ip.padEnd(15)} -> ${data.province} ${data.city} ${data.isp}`);
                } else {
                    console.log(`  ${ip.padEnd(15)} -> ❌ ${data.error}`);
                }
            } catch (error) {
                console.log(`  ${ip.padEnd(15)} -> ❌ 请求失败: ${error.message}`);
            }
        }
        
        // 测试当前IP查询
        console.log('\n🏠 测试当前IP查询:');
        try {
            const response = await axios.get(`${API_BASE_URL}/myip`);
            const data = response.data;
            if (data.success) {
                console.log(`  当前IP: ${data.ip}`);
                console.log(`  位置: ${data.province} ${data.city}`);
                console.log(`  ISP: ${data.isp}`);
            } else {
                console.log(`  ❌ ${data.error}`);
            }
        } catch (error) {
            console.log(`  ❌ 请求失败: ${error.message}`);
        }
        
        // 测试批量查询
        console.log('\n📦 测试批量查询:');
        try {
            const batchIPs = testCases.validIPs.slice(0, 3);
            const response = await axios.post(`${API_BASE_URL}/batch`, {
                ips: batchIPs
            });
            const data = response.data;
            if (data.success) {
                console.log(`  批量查询成功，共 ${data.total} 个IP:`);
                data.results.forEach(result => {
                    if (result.success) {
                        console.log(`    ${result.ip.padEnd(15)} -> ${result.province} ${result.city}`);
                    } else {
                        console.log(`    ${result.ip.padEnd(15)} -> ❌ ${result.error}`);
                    }
                });
            } else {
                console.log(`  ❌ ${data.error}`);
            }
        } catch (error) {
            console.log(`  ❌ 请求失败: ${error.message}`);
        }
        
        // 测试无效IP
        console.log('\n❌ 测试无效IP查询:');
        for (const ip of testCases.invalidIPs.slice(0, 2)) {
            try {
                const response = await axios.get(`${API_BASE_URL}/ip/${ip}`);
                console.log(`  ${ip.padEnd(15)} -> 意外成功: ${response.data.province}`);
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log(`  ${ip.padEnd(15)} -> ✅ 正确拒绝`);
                } else {
                    console.log(`  ${ip.padEnd(15)} -> ❌ 其他错误: ${error.message}`);
                }
            }
        }
        
        // 测试统计信息
        console.log('\n📊 测试统计信息:');
        try {
            const response = await axios.get(`${API_BASE_URL}/stats`);
            const data = response.data;
            console.log(`  服务名称: ${data.service.name}`);
            console.log(`  总查询数: ${data.queries.total}`);
            console.log(`  缓存命中率: ${data.queries.cacheHitRate}`);
            console.log(`  数据库记录数: ${data.database.records}`);
        } catch (error) {
            console.log(`  ❌ 请求失败: ${error.message}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ API服务测试失败:', error.message);
        return false;
    }
}

/**
 * 性能测试
 */
async function performanceTest() {
    console.log('\n⚡ 性能测试...\n');
    
    const testIP = '8.8.8.8';
    const testCount = 100;
    
    console.log(`🏃 测试IP: ${testIP}`);
    console.log(`🔢 测试次数: ${testCount}`);
    
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < testCount; i++) {
            promises.push(axios.get(`${API_BASE_URL}/ip/${testIP}`));
        }
        
        const results = await Promise.all(promises);
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        const avgTime = duration / testCount;
        const qps = Math.round(testCount / (duration / 1000));
        
        console.log(`⏱️  总耗时: ${duration}ms`);
        console.log(`📈 平均响应时间: ${avgTime.toFixed(2)}ms`);
        console.log(`🚀 QPS: ${qps}`);
        
        // 检查缓存效果
        const cacheHits = results.filter(r => r.data.cached).length;
        console.log(`💾 缓存命中: ${cacheHits}/${testCount} (${(cacheHits/testCount*100).toFixed(1)}%)`);
        
        return true;
        
    } catch (error) {
        console.error('❌ 性能测试失败:', error.message);
        return false;
    }
}

/**
 * 主测试函数
 */
async function runTests() {
    console.log('🎯 开始运行测试套件...');
    console.log('=' .repeat(60));
    
    const results = {
        qqwryReader: false,
        apiService: false,
        performance: false
    };
    
    // 测试纯真IP库读取器
    results.qqwryReader = await testQQWryReader();
    
    // 等待一下，让用户看到结果
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试API服务（需要服务已启动）
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  请确保API服务已启动 (npm start)');
    console.log('🔗 服务地址:', API_BASE_URL);
    
    try {
        await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
        results.apiService = await testAPIService();
        
        // 性能测试
        if (results.apiService) {
            console.log('\n' + '='.repeat(60));
            results.performance = await performanceTest();
        }
        
    } catch (error) {
        console.log('❌ 无法连接到API服务，跳过API测试');
        console.log('💡 请先运行: npm start');
    }
    
    // 测试结果汇总
    console.log('\n' + '='.repeat(60));
    console.log('📋 测试结果汇总:');
    console.log(`  纯真IP库读取器: ${results.qqwryReader ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  API服务测试: ${results.apiService ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  性能测试: ${results.performance ? '✅ 通过' : '❌ 失败'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！');
        process.exit(0);
    } else {
        console.log('⚠️  部分测试失败，请检查错误信息');
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    testQQWryReader,
    testAPIService,
    performanceTest
};