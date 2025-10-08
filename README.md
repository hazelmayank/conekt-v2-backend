# Conekt Admin MVP Backend

## Environment Variables

1. **Copy the environment template:**
```bash
cp env.example .env
```

2. **Fill in your actual values in `.env`:**

### Required Variables

**Server Configuration:**
```env
PORT=3000
NODE_ENV=development
```

**Database (MongoDB):**
```env
MONGODB_URI=mongodb://localhost:27017/conekt-admin
```

**JWT Authentication:**
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
```

**Twilio (OTP Service):**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SID=your_twilio_verify_service_sid
```

**Cloudinary (Video Storage):**
```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Optional Variables

**Development Mode:**
```env
FORCE_DEV_MODE=true  # Use mock OTP (000000) instead of real SMS
```

**Rate Limiting:**
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start MongoDB service

3. Create `.env` file with the above variables

4. Run the application:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Admin APIs
- `POST /admin/auth/otp/send` - Send OTP to phone
- `POST /admin/auth/otp/verify` - Verify OTP and login
- `GET /admin/cities` - List all cities
- `GET /admin/cities/:cityId/trucks` - Get trucks in a city
- `GET /admin/trucks/:truckId` - Get truck details
- `GET /admin/trucks/:truckId/playlist` - Get current playlist
- `GET /admin/trucks/:truckId/calendar` - Get calendar view
- `POST /admin/campaigns` - Create new campaign
- `DELETE /admin/campaigns/:campaignId` - Remove campaign
- `POST /admin/trucks/:truckId/reorder` - Reorder campaigns
- `POST /admin/uploads/presign` - Get Cloudinary upload URL
- `POST /admin/videos` - Save video metadata after upload
- `POST /admin/trucks/:truckId/push` - Push playlist to truck
- `GET /admin/dashboard` - Get overall stats

### Hardware APIs
- `POST /api/v1/hardware/status` - Send heartbeat
- `GET /playlist` - Fetch playlist for current day
- `GET /telemetry` - Query truck health/status
