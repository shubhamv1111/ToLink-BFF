# ToLink Backend TODO - NestJS (Port 8080)

## ✅ Phase 1: MVP - Basic URL Shortener (2-3 weeks)

_Based on ToLink.md Phase 1 requirements - NO Redis initially_

### 1.1 Project Setup (✅ DONE)

- [x] Initialize NestJS project with TypeScript
- [x] Create .env file with MongoDB URI
- [x] Basic project structure

### 1.2 Core Dependencies (Install as needed)

- [ ] Install database dependencies:
  ```bash
  npm install @nestjs/mongoose mongoose
  npm install @nestjs/config
  ```
- [ ] Install validation dependencies:
  ```bash
  npm install class-validator class-transformer
  ```
- [ ] Install API documentation:
  ```bash
  npm install @nestjs/swagger swagger-ui-express
  ```

### 1.3 Database Setup

- [ ] Configure MongoDB connection (`src/app.module.ts`)
- [ ] Create database schemas in `src/schemas/`:
  - [ ] **URL Schema** (`src/schemas/url.schema.ts`):
    ```typescript
    interface Url {
      _id: ObjectId;
      shortCode: string;
      originalUrl: string;
      customAlias?: string;
      clickCount: number;
      createdAt: Date;
      updatedAt: Date;
    }
    ```
  - [ ] Add proper indexes (shortCode, createdAt)

### 1.4 Core URL Shortening Service

- [ ] Create URL module (`src/modules/urls/`)
- [ ] **URL Service** (`src/modules/urls/urls.service.ts`):
  - [ ] Implement Base62 encoding algorithm:
    ```typescript
    generateShortCode(counter: number): string {
      const base62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
      let result = "";
      while (counter > 0) {
        result = base62[counter % 62] + result;
        counter = Math.floor(counter / 62);
      }
      return result.padStart(7, '0');
    }
    ```
  - [ ] Auto-incrementing counter service
  - [ ] Custom alias validation
  - [ ] URL validation service
  - [ ] Basic CRUD operations
- [ ] **In-Memory Caching** (NO Redis yet):
  - [ ] Use JavaScript Map object for caching
  - [ ] Cache frequently accessed URLs
  - [ ] Simple TTL implementation

### 1.5 API Endpoints - Phase 1

- [ ] **URL Shortening API** - `POST /api/shorten`:
  - [ ] Request validation
  - [ ] Generate short code
  - [ ] Store in MongoDB
  - [ ] Cache in memory
  - [ ] Return short URL
- [ ] **Redirection Service** - `GET /:shortCode`:
  - [ ] Check in-memory cache first
  - [ ] Query database if cache miss
  - [ ] 301 redirect to original URL
  - [ ] Increment click count
  - [ ] Handle non-existent URLs (404)

### 1.6 Basic Analytics

- [ ] **Analytics Service**:
  - [ ] Simple click count tracking
  - [ ] Creation date tracking
  - [ ] Basic stats calculation
- [ ] **Analytics API** - `GET /api/stats/:shortCode`:
  - [ ] Return click count
  - [ ] Return creation date
  - [ ] Simple JSON response

### 1.7 QR Code Generation

- [ ] Install QR code library:
  ```bash
  npm install qrcode @types/qrcode
  ```
- [ ] **QR Code Service**:
  - [ ] Generate PNG format QR codes
  - [ ] Basic size options
- [ ] **QR Code API** - `GET /api/qr/:shortCode`:
  - [ ] Generate QR code for short URL
  - [ ] Return PNG image
  - [ ] Basic error handling

### 1.8 API Documentation

- [ ] Setup Swagger documentation:
  - [ ] Document all endpoints
  - [ ] Request/response schemas
  - [ ] Error codes
  - [ ] Basic API examples

### 1.9 Basic Configuration

- [ ] Configure CORS for frontend (port 3000)
- [ ] Basic error handling
- [ ] Request validation pipes
- [ ] Global exception filter
- [ ] Environment configuration

### 1.10 Testing & Validation

- [ ] Test URL shortening flow
- [ ] Test redirection service
- [ ] Test QR code generation
- [ ] Test basic analytics
- [ ] Verify in-memory caching works

---

## 🔄 Phase 2: Enhanced Features (1-2 weeks)

_Implement after Phase 1 MVP is working_

### 2.1 User Authentication

- [ ] Install authentication dependencies:
  ```bash
  npm install @nestjs/jwt @nestjs/passport passport passport-jwt
  npm install bcryptjs @types/bcryptjs
  ```
- [ ] **User Schema** (`src/schemas/user.schema.ts`):
  ```typescript
  interface User {
    _id: ObjectId;
    name: string;
    email: string;
    passwordHash: string;
    isEmailVerified: boolean;
    role: "user" | "admin";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- [ ] **Authentication Module**:
  - [ ] User registration API
  - [ ] User login API
  - [ ] JWT token management
  - [ ] Password hashing with bcryptjs
  - [ ] Protected routes

### 2.2 Google OAuth Integration

- [ ] Install Google OAuth:
  ```bash
  npm install passport-google-oauth20 @types/passport-google-oauth20
  ```
- [ ] **Google OAuth Strategy**:
  - [ ] Google OAuth configuration
  - [ ] User creation/linking
  - [ ] OAuth callback handling

### 2.3 Advanced Analytics

- [ ] Install analytics dependencies:
  ```bash
  npm install ua-parser-js @types/ua-parser-js
  npm install geoip-lite @types/geoip-lite
  ```
- [ ] **Analytics Schema** (`src/schemas/analytics.schema.ts`):
  ```typescript
  interface Analytics {
    _id: ObjectId;
    urlId: ObjectId;
    shortCode: string;
    ipAddress: string;
    userAgent: string;
    referer?: string;
    country?: string;
    city?: string;
    device: string;
    browser: string;
    os: string;
    timestamp: Date;
  }
  ```
- [ ] **Advanced Analytics Service**:
  - [ ] Geographic data collection
  - [ ] Device/browser detection
  - [ ] Time-series data storage
  - [ ] Analytics aggregation APIs

### 2.4 Personal Dashboard APIs

- [ ] **User URL Management**:
  - [ ] `GET /api/user/links` - User's URLs with pagination
  - [ ] `PUT /api/links/:id` - Update URL
  - [ ] `DELETE /api/links/:id` - Delete URL
  - [ ] Search and filter functionality

### 2.5 Link Management Features

- [ ] **Advanced URL Features**:
  - [ ] Link expiry functionality
  - [ ] Password protection for URLs
  - [ ] Categories/tags system
  - [ ] Auto-deletion of expired links

### 2.6 Security & Performance

- [ ] Install security dependencies:
  ```bash
  npm install @nestjs/throttler helmet
  ```
- [ ] **Security Enhancements**:
  - [ ] Rate limiting implementation
  - [ ] Input sanitization
  - [ ] XSS protection
  - [ ] Request validation
- [ ] **Performance Optimization**:
  - [ ] Database indexing optimization
  - [ ] Query performance tuning
  - [ ] Response compression

### 2.7 Email Service

- [ ] Install email dependencies:
  ```bash
  npm install nodemailer @types/nodemailer
  ```
- [ ] **Email Service**:
  - [ ] Gmail SMTP configuration
  - [ ] Email verification flow
  - [ ] Password reset emails
  - [ ] Email templates

---

## 🔮 Phase 3: Advanced Features & System Design (Future)

_Advanced features for later implementation when user load increases_

### 3.1 Redis Caching Integration

- [ ] Install Redis dependencies:
  ```bash
  npm install redis ioredis @nestjs/cache-manager cache-manager-redis-store
  ```
- [ ] **Redis Configuration**:
  - [ ] Replace in-memory Map with Redis
  - [ ] Cache-aside pattern implementation
  - [ ] TTL strategy (24-hour expiration)
  - [ ] Cache invalidation strategies
  - [ ] Distributed caching for multiple server instances

### 3.2 Admin Panel

- [ ] Admin authentication
- [ ] User management APIs
- [ ] Link management APIs
- [ ] System monitoring
- [ ] Activity logs

### 3.3 File Upload & Bulk Operations

- [ ] CSV file processing
- [ ] Bulk URL import
- [ ] File validation
- [ ] Progress tracking

### 3.4 Background Jobs

- [ ] Job queue implementation
- [ ] Link cleanup jobs
- [ ] Analytics aggregation
- [ ] Email sending queues

### 3.5 Advanced System Design

- [ ] Load balancing
- [ ] Database sharding
- [ ] CDN integration
- [ ] Microservices architecture
- [ ] Advanced performance optimization

---

## 📁 Project Structure

```
src/
├── modules/
│   ├── urls/
│   │   ├── urls.controller.ts
│   │   ├── urls.service.ts
│   │   └── urls.module.ts
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── analytics.module.ts
│   └── qr/
│       ├── qr.controller.ts
│       ├── qr.service.ts
│       └── qr.module.ts
├── schemas/
│   ├── url.schema.ts
│   ├── user.schema.ts            # Phase 2
│   └── analytics.schema.ts       # Phase 2
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── filters/
├── config/
│   └── configuration.ts
└── utils/
    ├── base62.util.ts
    └── cache.util.ts
```

## 🎯 Phase 1 Success Criteria

- [x] NestJS project initialized
- [x] MongoDB connection configured
- [ ] URL shortening API working
- [ ] Redirection service working
- [ ] In-memory caching implemented
- [ ] Basic analytics working
- [ ] QR code generation working
- [ ] API documentation complete
- [ ] CORS configured for frontend

## 📝 Phase 1 API Endpoints

```
POST /api/shorten          # Create short URL
GET /:shortCode           # Redirect to original URL
GET /api/stats/:shortCode # Get basic analytics
GET /api/qr/:shortCode    # Generate QR code
GET /api/health           # Health check
```

## 🔧 Environment Configuration (.env)

```bash
# Database (✅ DONE)
MONGODB_URI=mongodb+srv://sv26551:BqXImbgT7cm6UIfv@cluster0.ntsnfef.mongodb.net/tolink

# App Configuration
PORT=8080
BASE_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000

# JWT (Phase 2)
# JWT_SECRET=your-jwt-secret
# JWT_EXPIRES_IN=7d

# Redis (Phase 3)
# REDIS_URL=redis://localhost:6379

# Email (Phase 2)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Google OAuth (Phase 2)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 📝 Notes

- **Phase 1**: Focus on basic URL shortening with in-memory caching
- **Phase 2**: Add authentication, user management, and advanced features
- **Phase 3**: Add Redis caching, system design, and performance optimization
- **NO Redis initially** - Use JavaScript Map for caching until user load increases
- Install packages only when needed for each phase
- Test each phase thoroughly before moving to next
- Follow exact API structure as defined in ToLink.md
