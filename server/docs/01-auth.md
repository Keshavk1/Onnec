# Phase 1: Foundation & Authentication

## 1. Explain the Concept
We need a secure way to verify users (Authentication) and ensure they have the right permissions (Authorization). We will use **JWT (JSON Web Tokens)** to keep the server stateless—we don't need to store login sessions in the database. For registration, we will use **OTP (One-Time Password)** to verify the user's email or phone number.

## 2. Why design it this way?
- **Stateless JWT**: Very scalable. The token itself contains the user's identity proof. We don't need to query the database on every single request just to know who the user is.
- **OTP Verification**: Prevents bots from creating fake accounts and ensures the user owns the provided contact method.
- **Controller-Service-Repository Pattern**: Keeps the code clean. If we ever want to switch from MongoDB to PostgreSQL, we only change the Repository layer. The Service and Controller layers remain untouched.

## 3. Database Schema (MongoDB Modeling)
**User Schema (`user.model.js`)**
- `email` (String, unique, required)
- `password` (String, hashed, required)
- `isVerified` (Boolean, default: false)
- `mode` (Enum: ['Personal', 'Social'], default: 'Personal')
- `otp` (String, hashed or plain, for verification)
- `otpExpiry` (Date)
- timestamps...

## 4. API Structure
- `POST /api/v1/auth/register` -> Sends OTP to email.
- `POST /api/v1/auth/verify-otp` -> Verifies OTP, marks user as `isVerified`, returns JWT.
- `POST /api/v1/auth/login` -> Verifies email/password, returns JWT.

## 5. Folder Structure
```text
src/
├── controllers/
│   └── auth.controller.js
├── services/
│   └── auth.service.js
├── repositories/
│   └── user.repository.js
├── models/
│   └── user.model.js
├── routes/
│   └── auth.routes.js
├── middlewares/
│   ├── auth.middleware.js
│   └── error.middleware.js
└── utils/
    ├── jwt.util.js
    └── email.util.js
```

## 6. Security Considerations
- **Password Hashing**: Use `bcrypt` to hash passwords before saving them to the DB. Need 10-12 salt rounds.
- **Refresh Tokens**: Access tokens should have a short lifespan (e.g., 15 mins). Refresh tokens (longer lifespan) should be stored securely (e.g., HTTP-only cookies) to get new access tokens.
- **OTP Security**: OTPs must expire (e.g., in 5 minutes). Implement rate limiting so attackers can't spam OTP requests.

## 7. Implementation Steps (Next Actions)
1. Initialize the Node.js project (`npm init -y`).
2. Install dependencies (`express`, `mongoose`, `jsonwebtoken`, `bcrypt`, `dotenv`, `nodemailer`).
3. Set up the basic Express server and connect to MongoDB.
4. Implement the User schema.
5. Build the Repository, Service, and Controller for Auth.
6. Connect the Routes and test with Postman/Insomnia.

## 8. Advanced Improvements
- Implement a Redis cache to store OTPs instead of storing them in the MongoDB User schema. This reduces write operations to the main database and naturally handles TTL (Time To Live).
