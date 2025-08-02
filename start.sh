#!/bin/bash

# 纯真IP库查询API服务启动脚本

echo "🚀 启动纯真IP库查询API服务..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js (>= 14.0.0)"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 创建必要的目录
mkdir -p data logs

# 检查是否有IP数据库文件
if [ ! -f "data/qqwry.dat" ]; then
    echo "📥 首次运行，正在下载IP数据库..."
    npm run update-db
    if [ $? -ne 0 ]; then
        echo "⚠️  IP数据库下载失败，服务启动时会自动下载"
    fi
fi

# 启动服务
echo "🎯 启动API服务..."
npm start