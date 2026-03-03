# Phase 1: Foundation & Authentication

## 1. Concept
Every production system starts with a hardened foundation. This phase establishes the Express server, MongoDB connection, error handling, and a **multi-strategy authentication system** using JWT + OTP.

We use two tokens:
- **Access Token** (short-lived: 15 minutes): Passed with every API request.
- **Refresh Token** (long-lived: 30 days): Stored in an HTTP-only cookie, used to silently rotate access tokens without re-login.

OTP is used for both registration email verification and as a 2FA mechanism in sensitive actions.

## 2. Why this design?
- **Stateless JWTs** scale horizontally without session stores.
- **Dual-token strategy** balances security (short expiry) with user experience (no frequent logouts).
- **OTP over SMS/Email** prevents bot-created accounts.
- **Repository Pattern** makes auth logic unit-testable without a live DB.

## 3. Database Schema

### `users` collection
```js
{
  _id: ObjectId,
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false }, // auto-excluded from queries
  username: { type: String, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ['user', 'creator', 'admin', 'superadmin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  refreshToken: { type: String, select: false },
  otp: { type: String, select: false },
  otpExpiry: { type: Date },
  createdAt, updatedAt
}
```

### `otps` collection (optional — Redis TTL preferred)
Store OTPs in Redis with a TTL of 5 minutes instead of MongoDB to avoid unnecessary write load.

## 4. API Design

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register with email + password → Send OTP |
| POST | `/api/v1/auth/verify-otp` | Verify OTP → Mark user as verified |
| POST | `/api/v1/auth/login` | Authenticate → Return access + refresh tokens |
| POST | `/api/v1/auth/refresh-token` | Rotate access token via refresh token |
| POST | `/api/v1/auth/logout` | Clear refresh token from DB + cookie |
| POST | `/api/v1/auth/forgot-password` | Send reset OTP |
| POST | `/api/v1/auth/reset-password` | Reset password using OTP |
| POST | `/api/v1/auth/resend-otp` | Resend OTP (rate-limited) |

## 5. Folder Structure
```text
src/
├── models/user.model.js
├── repositories/user.repository.js
├── services/auth.service.js
├── controllers/auth.controller.js
├── routes/auth.routes.js
├── middlewares/
│   ├── auth.middleware.js     # verifyJWT
│   └── error.middleware.js    # global error handler
└── utils/
    ├── ApiError.js
    ├── ApiResponse.js
    ├── AsyncHandler.js
    ├── jwt.util.js
    └── otp.util.js
```

## 6. Security Considerations
- Hash passwords with **bcrypt** (salt rounds: 12).
- Never return `password`, `refreshToken`, `otp` in API responses. Use `.select('-password')`.
- Rate-limit `/auth/login` and `/auth/resend-otp` — max 5 requests per 15 minutes per IP.
- Use **HTTP-only, Secure, SameSite=Strict** cookies for refresh tokens.
- Validate all inputs with Zod schemas.

## 7. Implementation Steps
1. Install: `bcrypt`, `jsonwebtoken`, `nodemailer`, `express-rate-limit`, `zod`.
2. Create `user.model.js`.
3. Create `user.repository.js` (findByEmail, createUser, updateRefreshToken).
4. Create `auth.service.js` (registerUser, verifyOtp, loginUser, refreshAccessToken).
5. Create `auth.controller.js` + `auth.routes.js`.
6. Create validation Zod schemas (`register.schema.js`, `login.schema.js`).
7. Create `validate.middleware.js` to auto-validate request bodies.
8. Create global `error.middleware.js`.
9. Test all flows with Postman.

## 8. Advanced Improvements
- **OAuth2**: Add Google/GitHub login via Passport.js.
- **Redis OTP store**: OTPs stored with TTL in Redis instead of MongoDB.
- **Device/Session tracking**: Store device fingerprints with refresh tokens to detect suspicious logins.
- **Audit Logs**: Record login timestamps and IP addresses for compliance.
