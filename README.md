# 趋势网格策略

基于 Nest.js 实现的趋势网格策略，在震荡行情下实盘月化 20%。

## 环境变量

```
# MySQL 数据库配置
DATABASE_HOST=
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_DATABASE=

# 币安 API 交易私钥，记得勾选 "允许现货交易"
BINANCE_API_KEY=
BINANCE_API_SECRET=

# 配置微信 Pusher Token 和 UID 用于接受交易通知
PUSHER_APP_TOKEN=
PUSHER_UIDS=
```

## 用法

```
// 安装依赖
yarn

// 交互式配置参数
yarn data

// 启动服务
yarn start
```
