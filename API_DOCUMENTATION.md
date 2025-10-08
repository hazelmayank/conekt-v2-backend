# Conekt Admin MVP Backend API Documentation

## Base URL
- Development: `http://localhost:3001`
- Production: `https://your-domain.com`

## Environment Variables

### Required
```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your_jwt_secret_key

# Twilio (for OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SID=your_twilio_verify_service_sid

# Cloudinary (for video storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Optional
```bash
# Development
NODE_ENV=development
FORCE_DEV_MODE=true  # Bypass Twilio, use OTP: 000000
PORT=3001

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

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

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "city_id",
      "name": "Mumbai",
      "coordinates": {
        "lat": 19.0760,
        "lng": 72.8777
      },
      "timezone": "Asia/Kolkata"
    }
  ]
}
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

**Response:**
```json
{
  "success": true,
  "message": "Truck created successfully",
  "data": {
    "_id": "truck_id",
    "city_id": {
      "_id": "city_id",
      "name": "Mumbai",
      "coordinates": { "lat": 19.0760, "lng": 72.8777 },
      "timezone": "Asia/Kolkata"
    },
    "truck_number": "KA01-AB-1234",
    "route_name": "Route A",
    "controller_id": "TRUCK_KA01_AB_1234",
    "status": "offline",
    "gps_lat": 19.0760,
    "gps_lng": 72.8777,
    "storage_mb": 0,
    "battery_percent": 0,
    "createdAt": "2025-01-07T...",
    "updatedAt": "2025-01-07T..."
  }
}
```

**Note:** `controller_id` is automatically generated as `TRUCK_{truck_number}` (e.g., "KA01-AB-1234" becomes "TRUCK_KA01_AB_1234")

#### Get Trucks in City
```http
GET /admin/cities/:cityId/trucks
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "truck_id",
      "truck_number": "KA01-AB-1234",
      "route_name": "Route A",
      "controller_id": "TRUCK_KA01_AB_1234",
      "status": "offline",
      "isOnline": false,
      "last_heartbeat_at": "2025-01-07T...",
      "gps_lat": 19.0760,
      "gps_lng": 72.8777,
      "storage_mb": 0,
      "battery_percent": 0
    }
  ]
}
```

#### Get Truck Details
```http
GET /admin/trucks/:truckId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "truck_id",
    "city_id": {
      "_id": "city_id",
      "name": "Mumbai"
    },
    "truck_number": "KA01-AB-1234",
    "route_name": "Route A",
    "controller_id": "TRUCK_KA01_AB_1234",
    "status": "offline",
    "last_heartbeat_at": "2025-01-07T...",
    "last_sync_at": "2025-01-07T...",
    "gps_lat": 19.0760,
    "gps_lng": 72.8777,
    "storage_mb": 0,
    "battery_percent": 0,
    "telemetry": {
      "uptime": 0,
      "cpu_usage": 0,
      "memory_usage": 0,
      "disk_free": 0,
      "network_rssi": 0,
      "temperature": 0,
      "last_updated": null
    },
    "player_status": {
      "status": "stopped",
      "current_item": null,
      "position_sec": 0,
      "playlist_version": null
    },
    "error_logs": [],
    "createdAt": "2025-01-07T...",
    "updatedAt": "2025-01-07T..."
  }
}
```

#### Get Truck Playlist
```http
GET /admin/trucks/:truckId/playlist?date=2025-01-01
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "truck_id": "truck_id",
    "date": "2025-01-01T00:00:00.000Z",
    "campaigns": [
      {
        "_id": "campaign_id",
        "campaign_name": "Summer Sale",
        "company_name": "ABC Company",
        "video_url": "https://cloudinary.com/video.mp4",
        "play_order": 1,
        "duration_sec": 30
      }
    ],
    "version": "1704067200-1",
    "push_status": "pending"
  }
}
```

#### Get Calendar View
```http
GET /admin/trucks/:truckId/calendar?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "truck_id": "truck_id",
    "period": {
      "start_date": "2025-01-01T00:00:00.000Z",
      "end_date": "2025-01-31T00:00:00.000Z"
    },
    "campaigns": [
      {
        "_id": "campaign_id",
        "campaign_name": "Summer Sale",
        "company_name": "ABC Company",
        "start_date": "2025-01-01T00:00:00.000Z",
        "end_date": "2025-01-15T00:00:00.000Z",
        "package_type": "half_month",
        "play_order": 1,
        "status": "active"
      }
    ]
  }
}
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

**Response:**
```json
{
  "success": true,
  "message": "Campaign order updated successfully"
}
```

#### Push Playlist
```http
POST /admin/trucks/:truckId/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2025-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Playlist pushed successfully",
  "data": {
    "playlistId": "playlist_id",
    "version": "1704067200-1",
    "campaignCount": 3,
    "pushStatus": "pending"
  }
}
```

### Campaign Management

#### Create Campaign
```http
POST /admin/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaign_name": "Summer Sale 2025",
  "company_name": "ABC Company",
  "truck_id": "truck_id_here",
  "video_id": "video_id_here",
  "package_type": "half_month",
  "start_date": "2025-01-01",
  "play_order": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "_id": "campaign_id",
    "truck_id": "truck_id",
    "campaign_name": "Summer Sale 2025",
    "company_name": "ABC Company",
    "video_url": "https://cloudinary.com/video.mp4",
    "video_id": {
      "_id": "video_id",
      "video_url": "https://cloudinary.com/video.mp4",
      "filename": "video.mp4",
      "duration_sec": 30,
      "file_size_mb": 5.2,
      "resolution": { "width": 1920, "height": 1080 },
      "format": "mp4",
      "bitrate": 2000
    },
    "start_date": "2025-01-01T00:00:00.000Z",
    "end_date": "2025-01-15T00:00:00.000Z",
    "package_type": "half_month",
    "play_order": 1,
    "status": "active",
    "booking_cycle": {
      "cycle_number": 1,
      "month": 1,
      "year": 2025
    },
    "created_by": "user_id",
    "createdAt": "2025-01-07T...",
    "updatedAt": "2025-01-07T..."
  }
}
```

#### Remove Campaign
```http
DELETE /admin/campaigns/:campaignId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign removed successfully"
}
```

### Video Management

#### Direct Video Upload
```http
POST /admin/video-assets
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- video: [file] (max 100MB, video/*)
```

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "video_id",
    "url": "https://cloudinary.com/video.mp4",
    "filename": "video.mp4",
    "durationSec": 30,
    "fileSize": 5.2,
    "resolution": { "width": 1920, "height": 1080 },
    "format": "mp4"
  }
}
```

#### Get Upload Signature (Alternative Method)
```http
POST /admin/uploads/presign
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "video.mp4",
  "folder": "conekt/videos"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "cloudinary_signature",
    "timestamp": 1704067200,
    "public_id": "conekt/videos/video_123",
    "folder": "conekt/videos"
  }
}
```

#### Save Video Metadata (Alternative Method)
```http
POST /admin/videos
Authorization: Bearer <token>
Content-Type: application/json

{
  "video_url": "https://cloudinary.com/video.mp4",
  "filename": "video.mp4",
  "duration_sec": 30,
  "file_size_mb": 5.2,
  "cloudinary_public_id": "conekt/videos/video_123",
  "resolution": { "width": 1920, "height": 1080 },
  "format": "mp4",
  "bitrate": 2000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video metadata saved successfully",
  "data": {
    "_id": "video_id",
    "video_url": "https://cloudinary.com/video.mp4",
    "filename": "video.mp4",
    "duration_sec": 30,
    "file_size_mb": 5.2,
    "cloudinary_public_id": "conekt/videos/video_123",
    "checksum": "abc123",
    "resolution": { "width": 1920, "height": 1080 },
    "format": "mp4",
    "bitrate": 2000,
    "createdAt": "2025-01-07T...",
    "updatedAt": "2025-01-07T..."
  }
}
```

#### Get All Videos
```http
GET /admin/videos?page=1&limit=20&search=summer
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "_id": "video_id",
        "video_url": "https://cloudinary.com/video.mp4",
        "filename": "video.mp4",
        "duration_sec": 30,
        "file_size_mb": 5.2,
        "resolution": { "width": 1920, "height": 1080 },
        "format": "mp4",
        "createdAt": "2025-01-07T..."
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalVideos": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Delete Video
```http
DELETE /admin/videos/:videoId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### Dashboard

#### Get Dashboard Stats
```http
GET /admin/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTrucks": 25,
      "onlineTrucks": 20,
      "offlineTrucks": 5,
      "totalCampaigns": 150,
      "activeCampaigns": 120,
      "expiredCampaigns": 30,
      "totalVideos": 500,
      "totalStorageUsed": "2.5 GB"
    },
    "recentActivity": [
      {
        "type": "campaign_created",
        "message": "New campaign 'Summer Sale' created",
        "timestamp": "2025-01-07T10:30:00.000Z"
      }
    ],
    "systemHealth": {
      "database": "connected",
      "cloudinary": "connected",
      "twilio": "connected"
    }
  }
}
```

#### Get System Health
```http
GET /admin/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-07T10:30:00.000Z",
    "services": {
      "database": "connected",
      "cloudinary": "connected",
      "twilio": "connected"
    },
    "uptime": 86400
  }
}
```

---

## Hardware APIs

### Send Status Update
```http
POST /api/v1/hardware/status
X-Device-ID: TRUCK_KA01_AB_1234
Content-Type: application/json

{
  "device_id": "TRUCK_KA01_AB_1234",
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

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully",
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

### Fetch Playlist
```http
GET /api/v1/hardware/playlist
X-Device-ID: TRUCK_KA01_AB_1234
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-07T10:30:00.000Z",
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
    },
    {
      "id": "campaign_id_2",
      "type": "video",
      "url": "https://cloudinary.com/video2.mp4",
      "checksum": "def456",
      "duration": 45,
      "loop": true,
      "play_order": 2
    }
  ]
}
```

### Get Telemetry
```http
GET /api/v1/hardware/telemetry
X-Device-ID: TRUCK_KA01_AB_1234
```

**Response:**
```json
{
  "success": true,
  "data": {
    "device": {
      "id": "TRUCK_KA01_AB_1234",
      "uptime": 86400,
      "cpu_usage": 45,
      "memory_usage": 60,
      "disk_free": 800,
      "network_rssi": -65,
      "temperature": 45,
      "last_updated": "2025-01-07T10:30:00.000Z"
    },
    "player": {
      "status": "playing",
      "current_item": "campaign_id",
      "position_sec": 15,
      "playlist_version": "1704067200-5"
    },
    "location": {
      "lat": 19.0760,
      "lng": 72.8777,
      "last_heartbeat": "2025-01-07T10:30:00.000Z"
    },
    "errors": [
      {
        "time": "2025-01-07T10:25:00.000Z",
        "level": "warning",
        "message": "Low battery warning"
      }
    ]
  }
}
```

### Download Video
```http
GET /api/v1/hardware/video/:videoId
X-Device-ID: TRUCK_KA01_AB_1234
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "video_id",
    "url": "https://cloudinary.com/video.mp4",
    "checksum": "abc123",
    "duration": 30,
    "filename": "video.mp4",
    "file_size_mb": 5.2
  }
}
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

## Booking Cycle Rules (MVP - 30-Day Months)

### Valid Start Dates
- Only 1st or 16th of any month
- Cannot be in the past

### Package Types
- `half_month`: 
  - Starting 1st: Ends on 15th of same month
  - Starting 16th: Ends on 30th of same month
- `full_month`: 
  - Starting 1st: Ends on 30th of same month (1-30 days)
  - **Cannot start on 16th** - Full month campaigns must start on 1st

### Overbooking Prevention
- Maximum 7 active campaigns per truck per cycle
- System validates before allowing new bookings
- Returns next available cycle if fully booked

### Examples
✅ **Valid:**
- Jan 1 → Jan 15 (Half Month, Cycle 1)
- Jan 16 → Jan 30 (Half Month, Cycle 2)
- Jan 1 → Jan 30 (Full Month, both cycles)

❌ **Invalid:**
- Jan 7 → Jan 21 (wrong start date)
- Jan 1 → Jan 20 (doesn't align with cycle)
- Jan 16 → Jan 30 (full month cannot start on 16th)
- Dec 20 → Jan 5 (past date)

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

---

## Development Notes

### Twilio Development Mode
- Set `FORCE_DEV_MODE=true` to bypass Twilio
- Use OTP code `000000` in development
- No actual SMS messages sent

### File Upload Limits
- Video files: Maximum 100MB
- Supported formats: All video/* MIME types
- Automatic 1080p scaling on upload

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables