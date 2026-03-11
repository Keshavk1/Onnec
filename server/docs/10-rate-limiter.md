# ONNEC — Distributed Rate Limiter

## 1. Concept
In a distributed environment, standard in-memory rate limiting fails because traffic is spread across multiple server instances. The **Distributed Rate Limiter** uses a centralized **Redis** store to track request counts across the entire cluster.

We implement the **Sliding Window algorithm**, which provides greater accuracy than Fixed Window by tracking the exact timestamp of each request.

## 2. Why this design?
- **Global Enforcement**: Limits are applied across all nodes in the distributed system.
- **Sliding Window**: Prevents "burst" traffic at the edge of fixed time windows.
- **Atomic Operations**: Uses **Redis Lua scripts** to ensure that "check-and-increment" operations are atomic, preventing race conditions.
- **Low Latency**: Redis's in-memory performance ensures rate limiting doesn't become a bottleneck.

## 3. Architecture & Algorithm

### Sliding Window with Redis Sorted Sets
1. Each request is stored as a member in a Sorted Set (`ZSET`).
2. The `score` and `member` are both the current timestamp.
3. **Cleanup**: Old timestamps outside the current window are removed using `ZREMRANGEBYSCORE`.
4. **Count**: The number of elements in the set is counted using `ZCARD`.
5. **Decision**: If the count is below the limit, the current request is added; otherwise, it is blocked.

## 4. Middleware Usage

```javascript
import { rateLimit } from '../middlewares/rateLimiter.middleware.js';

// Apply to specific routes
router.route('/sensitive-api').post(
    rateLimit(5, 60), // Max 5 requests per 60 seconds
    handleRequest
);
```

## 5. Security Considerations
- **Fail-Open vs. Fail-Closed**: In case of Redis downtime, the system is designed to "fail-open" (allow traffic) to maintain availability, but this can be toggled based on security needs.
- **Key Namespacing**: Keys are prefixed with `ratelimit:` and include the user's IP and the target URL to prevent cross-route interference.
- **TTL**: Every rate limit key has an automatic expiry (TTL) to ensure Redis memory is automatically reclaimed.

## 6. Implementation Files
- `src/services/rateLimiter.service.js`: Core sliding-window logic and Lua script.
- `src/middlewares/rateLimiter.middleware.js`: Express middleware for easy route protection.
