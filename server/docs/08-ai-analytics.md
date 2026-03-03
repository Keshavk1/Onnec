# Phase 8: Platform Intelligence — AI & Analytics

## 1. Concept
What sets a modern SaaS platform apart is intelligence. We integrate AI and analytics to:
1. **Personalize content recommendations** (AI-powered feed ranking).
2. **Suggest connections** (mutual friends + interest vector similarity).
3. **Provide creator analytics** (post reach, engagement trends, subscriber growth).
4. **Moderate content automatically** (AI-based toxicity and NSFW detection).
5. **Expose a platform API** (API keys for developers building on top of Onnec — the SaaS layer).

## 2. Why this design?
- **Embedded analytics** vs. third-party: Storing events in-house gives you full control and avoids user data leaving your infrastructure.
- **AI via API (OpenAI/Together.ai)**: Rather than training custom models, call external LLM/vision APIs. Cheaper to start, can migrate to self-hosted models later.
- **Event-driven analytics**: Use an internal event bus to asynchronously log platform events without blocking request handlers.

## 3. Database Schema

### `analytics_events` collection (high-write, use TTL index to auto-expire old events)
```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  userId: ObjectId,
  event: String,     // 'post.viewed', 'profile.visited', 'story.watched'
  entityId: ObjectId,
  entityType: String,
  metadata: Object,  // { source: 'feed', duration: 30 }
  createdAt          // TTL index: expire after 90 days
}
```

### `api_keys` collection (Platform API)
```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  name: String,            // human label: "My Integration"
  keyHash: String,         // bcrypt hash of the API key (never store plaintext)
  scopes: [String],        // ['read:posts', 'write:messages']
  rateLimit: Number,       // requests/hour
  lastUsedAt: Date,
  expiresAt: Date,
  createdAt
}
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/analytics/overview` | Creator stats: followers, reach, engagement rate |
| GET | `/api/v1/analytics/posts/:postId` | Per-post analytics (views, likes, shares over time) |
| GET | `/api/v1/recommendations/users` | AI-powered user suggestions |
| GET | `/api/v1/recommendations/content` | Personalized content not from followed users |
| POST | `/api/v1/developer/api-keys` | Generate a platform API key |
| DELETE | `/api/v1/developer/api-keys/:keyId` | Revoke an API key |

## 5. Folder Structure
```text
src/
├── models/
│   ├── analytics-event.model.js
│   └── api-key.model.js
├── services/
│   ├── analytics.service.js    # aggregate event summaries
│   ├── recommendation.service.js # call AI API + score users/posts
│   └── moderation.service.js   # AI content moderation checks
├── events/
│   └── event-bus.js            # Node EventEmitter / BullMQ queue
└── middlewares/
    └── apikey.middleware.js    # Authenticate requests by API key
```

## 6. Security Considerations
- **API Key security**: Show the plaintext key only once at creation. Store only the bcrypt hash in DB. Apply your own rate limiting per key.
- **AI Moderation**: Auto-flag posts with toxicity score > 0.85. Don't auto-delete — queue for human review (prevents false positives silencing legitimate users).
- **Data minimization**: Collect only the analytics events you actually use. Excess data collection is a GDPR liability.

## 7. Implementation Steps
1. Create `analytics-event.model.js` with a TTL index on `createdAt` (90 days).
2. Create `event-bus.js` — simple Node EventEmitter or BullMQ queue.
3. Fire analytics events from post/profile/chat services asynchronously.
4. Build aggregation pipeline for creator analytics dashboard (reach, follower growth).
5. Integrate OpenAI Moderation API in post creation flow.
6. Build recommendation service: fetch candidate users → score by mutual follows + shared hashtag interest.
7. Implement API key generation, hashing, and `apikey.middleware.js`.

## 8. Advanced Improvements
- **BullMQ Jobs**: Offload heavy analytics aggregations and AI API calls to background queues.
- **Interest Vectors**: Store user interest profiles as tag-frequency maps, compute dot-product similarity for recommendations.
- **LLM Summary**: Generate AI weekly summary for creators: "Your top post this week was X. Engagement was up 24%."
- **Embeddings Search**: Use OpenAI text embeddings + MongoDB Vector Search to power semantic content discovery.
