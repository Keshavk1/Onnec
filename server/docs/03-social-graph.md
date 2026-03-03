# Phase 3: Social Graph — Connections & Feed

## 1. Concept
The social graph is the map of relationships between users: who follows whom. On top of this graph, we build the **Feed** — a personalized stream of content from people you follow.

Unlike a simple list of posts, a production feed must be **fast** (pre-computed, cached) and **personalized** (weighted by engagement, recency, and relationship closeness).

## 2. Why this design?
- **Separate `connections` collection**: Avoids embedding massive arrays inside user documents (MongoDB 16MB limit).
- **Fan-out-on-write feed strategy**: When a creator posts, we push references to the post into each follower's feed cache (Redis sorted set). On read, the feed is instant.
- **Privacy-aware**: Connections can be `accepted` (mutual) or `following` (one-directional). Personal Mode users require a request + approval.

## 3. Database Schema

### `connections` collection
```js
{
  _id: ObjectId,
  follower: { type: ObjectId, ref: 'User', required: true },
  following: { type: ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'accepted' },
  createdAt
}
// Compound unique index: { follower: 1, following: 1 }
```

### Feed (Redis — no collection)
- Key: `feed:{userId}` → Redis Sorted Set
- Member: `postId`, Score: `timestamp` (Unix ms)
- TTL: 7 days (rehydrated on demand)

## 4. API Design

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/connections/follow/:userId` | Follow/send request to user |
| DELETE | `/api/v1/connections/unfollow/:userId` | Unfollow user |
| PATCH | `/api/v1/connections/accept/:userId` | Accept a follow request (Personal Mode) |
| DELETE | `/api/v1/connections/reject/:userId` | Reject a follow request |
| POST | `/api/v1/connections/block/:userId` | Block a user |
| GET | `/api/v1/users/:userId/followers?page=` | Paginated followers list |
| GET | `/api/v1/users/:userId/following?page=` | Paginated following list |
| GET | `/api/v1/feed` | Get my personalized feed (paginated cursor) |

## 5. Folder Structure
```text
src/
├── models/connection.model.js
├── repositories/connection.repository.js
├── services/
│   ├── connection.service.js
│   └── feed.service.js        # feed fan-out logic
├── controllers/
│   ├── connection.controller.js
│   └── feed.controller.js
└── routes/
    ├── connection.routes.js
    └── feed.routes.js
```

## 6. Security Considerations
- **Self-follow prevention**: Validate `follower !== following` in service layer.
- **Block system**: Blocked users cannot send requests, view profiles, or see content — enforced via middleware.
- **Mutual follow fast-path**: Use aggregation pipeline to efficiently determine mutual connections.

## 7. Implementation Steps
1. Create `connection.model.js` with compound unique index.
2. Build follow/unfollow/block service with duplicate prevention.
3. Implement feed fan-out: on new post created event → push to Redis sorted sets of all followers.
4. Build paginated feed endpoint using Redis `ZREVRANGEBYSCORE`.
5. Add `suggest-users` endpoint (users not yet followed, sorted by mutual connections count).

## 8. Advanced Improvements
- **Mutual Friends API**: "X people you follow also follow this user."
- **Interest-based suggestions**: Weight suggestions by shared interests/categories.
- **Feed algorithm v2**: Factor in engagement rate: `score = w1*recency + w2*likes + w3*comments`.
- **Cursor-based pagination**: More efficient than `skip/limit` for large datasets.
