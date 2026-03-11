# ONNEC — URL Shortening Service

## 1. Concept
The **URL Shortening Service** transforms long URLs into short, manageable links. It is designed for high performance with **constant-time (O(1)) redirection** using Redis caching.

## 2. Why this design?
- **Base62 Encoding**: Uses `[0-9][a-z][A-Z]` to generate compact, URL-friendly strings.
- **Low Latency**: High-traffic links are cached in Redis, bypassing the database for redirects.
- **Scalable ID Generation**: Designed to work with distributed counters for unique short codes.
- **Analytics Ready**: Tracks click counts for every shortened URL.

## 3. Database Schema

### `urls` collection
```javascript
{
  _id: ObjectId,
  originalUrl: { type: String, required: true },
  shortCode: { type: String, unique: true, index: true },
  clicks: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt, updatedAt
}
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/url/shorten` | Create a short link for a given URL |
| GET | `/api/v1/url/:shortCode` | Redirect to the original URL |
| GET | `/api/v1/url/stats/:shortCode` | Get click statistics |

## 5. Algorithmic Flow

### Shortening
1. Receive `originalUrl`.
2. Generate a unique numeric ID (using DB sequence or Redis counter).
3. Convert the ID to **Base62**.
4. Store the mapping in MongoDB.

### Redirection
1. Receive `shortCode`.
2. **Check Cache**: Look for `shortCode` in Redis.
3. **Database Fallback**: If not in cache, query MongoDB.
4. **Update Analytics**: Increment click count (asynchronously).
5. **Cache High-Hit**: Store the result in Redis with a TTL.
6. **Redirect**: Issue a `302 Foundation` redirect.

## 6. Implementation Files
- `src/models/url.model.js`: Mongoose schema.
- `src/services/url.service.js`: Base62 and Caching logic.
- `src/controllers/url.controller.js`: Request handlers.
- `src/routes/url.routes.js`: API endpoints.
