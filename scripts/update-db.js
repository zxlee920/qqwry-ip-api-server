const QQWryReader = require('../lib/qqwry-reader.js');
const fs = require('fs-extra');
const path = require('path');

/**
 * 数据库更新脚本
 * 用于手动更新纯真IP库
 */

async function updateDatabase() {
    console.log('🚀 开始更新纯真IP数据库...');
    console.log('⏰ 更新时间:', new Date().toLocaleString('zh-CN'));
    
    try {
        const reader = new QQWryReader();
        
        // 检查是否需要更新
        const needsUpdate = await reader.needsUpdate();
        if (!needsUpdate) {
            console.log('ℹ️  数据库已是最新版本，无需更新');
            return;
        }
        
        console.log('📥 正在下载最新的纯真IP库...');
        await reader.updateDatabase();
        
        console.log('✅ 数据库更新完成！');
        console.log(`📊 数据库版本: ${reader.getVersion()}`);
        console.log(`📈 IP记录数量: ${reader.getRecordCount()}`);
        
        // 测试查询
        console.log('\n🧪 测试查询...');
        const testIPs = ['8.8.8.8', '114.114.114.114', '223.5.5.5'];
        
        for (const ip of testIPs) {
            const result = await reader.query(ip);
            if (result) {
                console.log(`  ${ip} -> ${result.country} ${result.province} ${result.city} ${result.isp}`);
            } else {
                console.log(`  ${ip} -> 查询失败`);
            }
        }
        
        console.log('\n🎉 数据库更新和测试完成！');
        
    } catch (error) {
        console.error('❌ 数据库更新失败:', error.message);
        process.exit(1);
    }
}

// 命令行参数处理
const args = process.argv.slice(2);
const forceUpdate = args.includes('--force') || args.includes('-f');

if (forceUpdate) {
    console.log('🔄 强制更新模式');
}

// 执行更新
updateDatabase().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('💥 更新过程中发生错误:', error);
    process.exit(1);
});