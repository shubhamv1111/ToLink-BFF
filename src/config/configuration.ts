export default () => ({
  port: parseInt(process.env.PORT || '8080', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tolink',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-jwt-secret-key-please-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  environment: process.env.NODE_ENV || 'development',
});
