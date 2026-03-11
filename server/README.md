# ONNEC — Distributed Systems Engineering

A robust, production-level Node.js backend focused on distributed systems patterns, high performance, and real-time communication.

## 🚀 Key Features

- **Distributed Rate Limiting**: Redis-based sliding-window algorithm protecting APIs from traffic spikes.
- **URL Shortening Service**: High-performance URL transformation with Base62 encoding and O(1) redirection via Redis caching.
- **Real-time Chat System**: Low-latency bidirectional messaging using WebSockets (Socket.io) and MongoDB persistence.
- **Modern Architecture**: Clean separation of concerns, repository/service pattern, and hardened security.

## 🛠️ Technology Stack
- **Runtime**: Node.js (Express.js)
- **Database**: MongoDB (Mongoose)
- **Cache/Distributed Store**: Redis (ioredis)
- **Real-time**: Socket.io
- **Security**: JWT, Bcrypt, Helmet, CORS

## 📖 Documentation

Explore the detailed design and implementation guides for each module:

- [Phase 0: Roadmap](./docs/00-roadmap.md)
- [Phase 1: Foundation & Authentication](./docs/01-auth.md)
- [Distributed Rate Limiter](./docs/10-rate-limiter.md)
- [URL Shortening Service](./docs/11-url-shortener.md)
- [Real-time Chat System](./docs/12-realtime-chat.md)

## 🏁 Getting Started

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your credentials.
4. **Run in development**:
   ```bash
   npm run dev
   ```

## 🔒 Security
- **Sliding Window Rate Limiting** to prevent brute-force and DDoS.
- **HTTP-only Cookies** for secure token storage.
- **Atomic Operations** via Lua scripts to ensure consistency in distributed state.
