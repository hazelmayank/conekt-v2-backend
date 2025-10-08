# Conekt Admin MVP Backend API Documentation

## Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

## Twilio Configuration

### Required Environment Variables
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SID=your_twilio_verify_service_sid
```

### Development Mode
- Set `FORCE_DEV_MODE=true` to bypass Twilio
- Use OTP code `000000` in development
- No actual SMS messages sent

## Authentication

### Admin Authentication (OTP-based)
All admin endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Hardware Authentication
Hardware endpoints require device ID in header:
```
X-Device-ID: <controller_id>
```

---

## Admin APIs

### Authentication

#### Send Login OTP
```http
POST /admin/auth/login
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "OTP sent for login",
  "data": {
    "sid": "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "status": "pending",
    "dev": false
  }
}
```

#### Verify Login OTP
```http
POST /admin/auth/login/verify
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "phone": "+919876543210",
    "name": "Admin User",
    "role": "admin"
  }
}
```

#### Create Admin User
```http
POST /admin/auth/create-admin
Content-Type: application/json

{
  "phone": "+919876543210",
  "name": "Admin User"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Admin user created. OTP sent for verification.",
  "data": {
    "sid": "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "status": "pending",
    "dev": false
  }
}
```

#### Verify Admin Account
```http
POST /admin/auth/create-admin/verify
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Account verified successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "phone": "+919876543210",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Cities & Trucks

#### Get All Cities
```http
GET /admin/cities
Authorization: Bearer <token>
```

#### Create Truck
```http
POST /admin/trucks
Authorization: Bearer <token>
Content-Type: application/json

{
  "city_id": "64a1b2c3d4e5f6789012345",
  "truck_number": "KA01-AB-1234",
  "route_name": "Route A",
  "gps_lat": 19.0760,
  "gps_lng": 72.8777
}
```

**Note:** `controller_id` is automatically generated as `TRUCK_{truck_number}` (e.g., "KA01-AB-1234" becomes "TRUCK_KA01_AB_1234")

#### Get Trucks in City
```http
GET /admin/cities/:cityId/trucks
Authorization: Bearer <token>
```

#### Get Truck Details
```http
GET /admin/trucks/:truckId
Authorization: Bearer <token>
```

#### Get Truck Playlist
```http
GET /admin/trucks/:truckId/playlist?date=2024-01-01
Authorization: Bearer <token>
```

#### Get Calendar View
```http
GET /admin/trucks/:truckId/calendar?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### Campaign Management

#### Create Campaign
```http
POST /admin/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaign_name": "Summer Sale 2024",
  "company_name": "ABC Company",
  "truck_id": "truck_id_here",
  "video_id": "video_id_here",
  "package_type": "half_month",
  "start_date": "2024-01-01",
  "play_order": 1
}
```

#### Remove Campaign
```http
DELETE /admin/campaigns/:campaignId
Authorization: Bearer <token>
```

#### Reorder Campaigns
```http
POST /admin/trucks/:truckId/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaigns": [
    { "campaign_id": "id1", "play_order": 1 },
    { "campaign_id": "id2", "play_order": 2 }
  ]
}
```

#### Push Playlist
```http
POST /admin/trucks/:truckId/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-01-01"
}
```

### Video Management

#### Get Upload Signature
```http
POST /admin/uploads/presign
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "video.mp4",
  "folder": "conekt-videos"
}
```

#### Save Video Metadata
```http
POST /admin/videos
Authorization: Bearer <token>
Content-Type: application/json

{
  "video_url": "https://cloudinary.com/video.mp4",
  "filename": "video.mp4",
  "duration_sec": 30,
  "file_size_mb": 5.2,
  "cloudinary_public_id": "conekt-videos/video_123",
  "resolution": { "width": 1920, "height": 1080 },
  "format": "mp4",
  "bitrate": 2000
}
```

#### Get All Videos
```http
GET /admin/videos?page=1&limit=20&search=summer
Authorization: Bearer <token>
```

#### Delete Video
```http
DELETE /admin/videos/:videoId
Authorization: Bearer <token>
```

### Dashboard

#### Get Dashboard Stats
```http
GET /admin/dashboard
Authorization: Bearer <token>
```

#### Get System Health
```http
GET /admin/health
Authorization: Bearer <token>
```

---

## Hardware APIs

### Send Status Update
```http
POST /api/v1/hardware/status
X-Device-ID: TRUCK_MH01_001
Content-Type: application/json

{
  "device_id": "TRUCK_MH01_001",
  "status": "online",
  "uptime": 86400,
  "gps_lat": 19.0760,
  "gps_lng": 72.8777,
  "storage_mb": 1500,
  "battery_percent": 85,
  "telemetry": {
    "cpu_usage": 45,
    "memory_usage": 60,
    "disk_free": 800,
    "network_rssi": -65,
    "temperature": 45
  },
  "player_status": {
    "status": "playing",
    "current_item": "campaign_id",
    "position_sec": 15,
    "playlist_version": "1704067200-5"
  },
  "errors": [
    {
      "level": "warning",
      "message": "Low battery warning"
    }
  ]
}
```

### Fetch Playlist
```http
GET /api/v1/hardware/playlist
X-Device-ID: TRUCK_MH01_001
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1704067200-5",
  "playlist": [
    {
      "id": "campaign_id_1",
      "type": "video",
      "url": "https://cloudinary.com/video1.mp4",
      "checksum": "abc123",
      "duration": 30,
      "loop": true,
      "play_order": 1
    }
  ]
}
```

### Get Telemetry
```http
GET /api/v1/hardware/telemetry
X-Device-ID: TRUCK_MH01_001
```

### Download Video
```http
GET /api/v1/hardware/video/:videoId
X-Device-ID: TRUCK_MH01_001
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Field-specific error"
    }
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Booking Cycle Rules

### Valid Start Dates
- Only 1st or 16th of any month
- Cannot be in the past

### Package Types
- `half_month`: Either 1-15 OR 16-end of month
- `full_month`: 1st to last day of month

### Overbooking Prevention
- Maximum 7 active campaigns per truck per cycle
- System validates before allowing new bookings
- Returns next available cycle if fully booked

### Examples
✅ Valid:
- Oct 1 → Oct 15 (Half Month, Cycle 1)
- Oct 16 → Oct 31 (Half Month, Cycle 2)
- Oct 1 → Oct 31 (Full Month, both cycles)

❌ Invalid:
- Oct 7 → Oct 21 (wrong start date)
- Oct 1 → Oct 20 (doesn't align with cycle)
- Sep 20 → Oct 5 (past date)

---

## Cron Jobs

### Automatic Tasks
- **Midnight Daily**: Expire campaigns past end_date
- **5 PM Daily**: Generate next day's playlists
- **Every 5 minutes**: Update truck online/offline status
- **Weekly**: Clean up old audit logs and playlists

---

## Database Schema

### Key Collections
- `users` - Admin users with OTP authentication
- `cities` - Available cities for truck deployment
- `trucks` - Truck hardware with telemetry data
- `videos` - Video metadata and Cloudinary URLs
- `campaigns` - Campaign bookings with cycle validation
- `playlists` - Generated playlists for each truck/date
- `auditlogs` - Action tracking for admin operations

### Relationships
- Cities → Trucks (1:many)
- Trucks → Campaigns (1:many)
- Videos → Campaigns (1:many)
- Trucks → Playlists (1:many per date)
