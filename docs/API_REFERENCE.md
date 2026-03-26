# API Reference — RAHE KABA Tours & Travels

> Complete API endpoint documentation for the Express backend

---

## Base URL

```
https://yourdomain.com/api
```

## Authentication

All protected endpoints require:

```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST `/api/auth/register`

Register a new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone": "+8801XXXXXXXXX"
}
```

**Response:** `201`
```json
{
  "token": "jwt_token_here",
  "user": { "id": "uuid", "email": "...", "role": "user" }
}
```

### POST `/api/auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200`
```json
{
  "token": "jwt_token_here",
  "user": { "id": "uuid", "email": "...", "role": "admin" }
}
```

### GET `/api/auth/me`

Get current authenticated user with role.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200`
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "profile": { "full_name": "Admin", "phone": "..." }
  }
}
```

### POST `/api/auth/change-password`

Change admin password.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

---

## CRUD Endpoints (Generic Pattern)

All resource endpoints follow this pattern:

### GET `/api/{resource}`

List all records with optional filters.

**Query Parameters:**
- `limit` — Max records (default: 1000)
- `offset` — Pagination offset
- Any column name as filter: `?status=active&type=hajj`

### GET `/api/{resource}/:id`

Get single record by ID.

### POST `/api/{resource}`

Create new record.

### PUT `/api/{resource}/:id`

Update existing record.

### DELETE `/api/{resource}/:id`

Delete record.

---

## Available Resources

| Endpoint | Auth | Admin Only | Notes |
|----------|------|------------|-------|
| `/api/packages` | Read: No, Write: Yes | No | Public read for website |
| `/api/hotels` | Read: No, Write: Yes | No | Public read for website |
| `/api/hotel-rooms` | Read: No, Write: Yes | No | |
| `/api/bookings` | Yes | No | |
| `/api/booking-members` | Yes | No | |
| `/api/payments` | Yes | No | |
| `/api/profiles` | Yes | No | |
| `/api/moallems` | Yes | Yes | |
| `/api/moallem-payments` | Yes | Yes | |
| `/api/moallem-commission-payments` | Yes | Yes | |
| `/api/supplier-agents` | Yes | Yes | |
| `/api/supplier-agent-payments` | Yes | Yes | |
| `/api/supplier-contracts` | Yes | Yes | |
| `/api/supplier-contract-payments` | Yes | Yes | |
| `/api/accounts` | Yes | Yes | |
| `/api/transactions` | Yes | Yes | |
| `/api/expenses` | Yes | Yes | |
| `/api/daily-cashbook` | Yes | Yes | |
| `/api/financial-summary` | Yes | Yes | |
| `/api/notification-settings` | Yes | Yes | |
| `/api/notification-logs` | Yes | Yes | |
| `/api/site-content` | Read: No, Write: Yes | No | CMS content |
| `/api/cms-versions` | Yes | Yes | |
| `/api/blog-posts` | Read: No, Write: Yes | No | |
| `/api/company-settings` | Yes | Yes | |
| `/api/installment-plans` | Yes | No | |
| `/api/booking-documents` | Yes | No | |
| `/api/hotel-bookings` | Yes | No | |

---

## Special Endpoints

### POST `/api/upload`

Upload a file (image, document).

**Headers:** `Content-Type: multipart/form-data`

**Body:** FormData with `file` field

**Response:**
```json
{
  "url": "/uploads/1234567890-filename.jpg"
}
```

### GET `/api/backup`

Download database backup (admin only).

### POST `/api/backup/restore`

Restore from backup SQL file (admin only).

---

## Error Responses

```json
{
  "error": "Error message here"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 404 | Resource not found |
| 500 | Internal server error |
