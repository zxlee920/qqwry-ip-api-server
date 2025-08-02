#!/usr/bin/env node

// 简化的启动脚本，避免PM2问题
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动纯真IP库查询API服务...');

// 启动主服务
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001
    }
});

server.on('error', (err) => {
    console.error('❌ 服务启动失败:', err);
    process.exit(1);
});

server.on('exit', (code) => {
    console.log(`📴 服务退出，退出码: ${code}`);
    if (code !== 0) {
        process.exit(code);
    }
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('📴 收到SIGTERM信号，正在关闭服务...');
    server.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('📴 收到SIGINT信号，正在关闭服务...');
    server.kill('SIGINT');
});