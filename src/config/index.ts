export default () => ({
  isDev: process.env.NODE_ENV ? process.env.NODE_ENV === 'dev' : true,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DATABASE,
  },
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
  },
  pusher: {
    appToken: process.env.PUSHER_APP_TOKEN,
    uids: process.env.PUSHER_UIDS?.split(',') ?? [],
  },
});
