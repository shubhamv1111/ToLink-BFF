export default () => ({
  port: parseInt(process.env.PORT || '8080', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tolink',
  },
  environment: process.env.NODE_ENV || 'development',
});
