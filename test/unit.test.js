const QQWryReader = require('../lib/qqwry-reader.js');
const assert = require('assert');

/**
 * 纯真IP库读取器单元测试
 */

// 测试用例
const testCases = {
    validIPs: [
        '8.8.8.8',          // Google DNS
        '114.114.114.114',  // 114 DNS
        '223.5.5.5',        // 阿里DNS
    ],
    invalidIPs: [
        '256.256.256.256',  // 超出范围
        '192.168.1',        // 不完整
        'invalid.ip',       // 非数字
    ],
    localIPs: [
        '127.0.0.1',        // 本地回环
        '192.168.1.1',      // 私有网络
    ]
};

/**
 * 测试IP转换函数
 */
async function testIPConversion() {
    console.log('🧪 测试IP地址转换函数...');
    
    const reader = new QQWryReader();
    
    // 测试ip2long
    console.log('  测试ip2long函数:');
    assert.strictEqual(reader.ip2long('8.8.8.8'), 134744072, '8.8.8.8应该转换为134744072');
    assert.strictEqual(reader.ip2long('127.0.0.1'), 2130706433, '127.0.0.1应该转换为2130706433');
    assert.strictEqual(reader.ip2long('255.255.255.255'), 4294967295, '255.255.255.255应该转换为4294967295');
    assert.strictEqual(reader.ip2long('0.0.0.0'), 0, '0.0.0.0应该转换为0');
    assert.strictEqual(reader.ip2long('invalid'), null, '无效IP应该返回null');
    assert.strictEqual(reader.ip2long('192.168.1'), null, '不完整IP应该返回null');
    
    // 测试long2ip
    console.log('  测试long2ip函数:');
    assert.strictEqual(reader.long2ip(134744072), '8.8.8.8', '134744072应该转换为8.8.8.8');
    assert.strictEqual(reader.long2ip(2130706433), '127.0.0.1', '2130706433应该转换为127.0.0.1');
    assert.strictEqual(reader.long2ip(4294967295), '255.255.255.255', '4294967295应该转换为255.255.255.255');
    assert.strictEqual(reader.long2ip(0), '0.0.0.0', '0应该转换为0.0.0.0');
    
    console.log('✅ IP地址转换函数测试通过\n');
    return true;
}

/**
 * 测试字符串清理函数
 */
async function testStringCleaning() {
    console.log('🧪 测试字符串清理函数...');
    
    const reader = new QQWryReader();
    
    assert.strictEqual(reader.cleanString('北京市CZ88.NET'), '北京市', '应该移除CZ88.NET');
    assert.strictEqual(reader.cleanString('上海市 浦东区 纯真网络'), '上海市 浦东区', '应该移除纯真网络');
    assert.strictEqual(reader.cleanString('  广州市  '), '广州市', '应该移除多余空格');
    assert.strictEqual(reader.cleanString(''), '', '空字符串应该返回空字符串');
    assert.strictEqual(reader.cleanString(null), '', 'null应该返回空字符串');
    assert.strictEqual(reader.cleanString(undefined), '', 'undefined应该返回空字符串');
    
    console.log('✅ 字符串清理函数测试通过\n');
    return true;
}

/**
 * 测试位置解析函数
 */
async function testLocationParsing() {
    console.log('🧪 测试位置解析函数...');
    
    const reader = new QQWryReader();
    
    // 测试不同格式的位置信息
    const testLocations = [
        {
            input: { country: '北京市', area: '联通' },
            expected: { country: '北京市', province: '北京', city: '未知', area: '联通', isp: '联通' }
        },
        {
            input: { country: '广东省深圳市', area: '电信' },
            expected: { country: '广东省深圳市', province: '广东', city: '深圳市', area: '电信', isp: '电信' }
        },
        {
            input: { country: '美国', area: 'Google公司' },
            expected: { country: '美国', province: '未知', city: '未知', area: 'Google公司', isp: '未知' }
        },
        {
            input: { country: '浙江省杭州市', area: '阿里云' },
            expected: { country: '浙江省杭州市', province: '浙江', city: '杭州市', area: '阿里云', isp: '未知' }
        }
    ];
    
    for (const test of testLocations) {
        const result = reader.parseLocation(test.input.country, test.input.area);
        console.log(`  测试: ${test.input.country} ${test.input.area}`);
        console.log(`  结果: ${result.province} ${result.city} ${result.isp}`);
        
        // 验证省份解析
        if (test.expected.province !== '未知') {
            assert.strictEqual(result.province, test.expected.province, `省份解析错误: ${test.input.country}`);
        }
        
        // 验证ISP解析
        if (test.expected.isp !== '未知') {
            assert.strictEqual(result.isp, test.expected.isp, `ISP解析错误: ${test.input.area}`);
        }
    }
    
    console.log('✅ 位置解析函数测试通过\n');
    return true;
}

/**
 * 测试数据库文件检查
 */
async function testDatabaseCheck() {
    console.log('🧪 测试数据库文件检查...');
    
    const reader = new QQWryReader();
    
    try {
        const needsUpdate = await reader.needsUpdate();
        console.log(`  数据库是否需要更新: ${needsUpdate ? '是' : '否'}`);
        
        // 这里我们不做断言，因为结果取决于文件是否存在和修改时间
        
        console.log('✅ 数据库文件检查测试通过\n');
        return true;
    } catch (error) {
        console.error('❌ 数据库文件检查测试失败:', error);
        return false;
    }
}

/**
 * 运行所有单元测试
 */
async function runUnitTests() {
    console.log('🚀 开始运行单元测试...');
    console.log('=' .repeat(60));
    
    const results = {
        ipConversion: false,
        stringCleaning: false,
        locationParsing: false,
        databaseCheck: false
    };
    
    try {
        results.ipConversion = await testIPConversion();
        results.stringCleaning = await testStringCleaning();
        results.locationParsing = await testLocationParsing();
        results.databaseCheck = await testDatabaseCheck();
        
        // 测试结果汇总
        console.log('=' .repeat(60));
        console.log('📋 单元测试结果汇总:');
        
        for (const [name, passed] of Object.entries(results)) {
            console.log(`  ${name}: ${passed ? '✅ 通过' : '❌ 失败'}`);
        }
        
        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
        
        if (passedTests === totalTests) {
            console.log('🎉 所有单元测试通过！');
            return true;
        } else {
            console.log('⚠️  部分单元测试失败，请检查错误信息');
            return false;
        }
        
    } catch (error) {
        console.error('💥 单元测试运行失败:', error);
        return false;
    }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    runUnitTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = {
    runUnitTests,
    testIPConversion,
    testStringCleaning,
    testLocationParsing,
    testDatabaseCheck
};