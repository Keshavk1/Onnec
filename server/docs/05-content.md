# Phase 5: Content — Posts, Media & Discovery

## 1. Concept
Content is the heart of a social platform. Users publish **Posts** (text, images, videos, polls, links) and discover content through hashtags, categories, and a search engine.

Media files (images, videos) are uploaded to **Cloudinary** (or S3 for enterprise tenants), not stored in MongoDB. MongoDB only stores the returned URL.

A **post lifecycle** has states: `draft → published → archived`. Creators can schedule posts and manage them like a CMS.

## 2. Why this design?
- Storing media in object storage (not MongoDB GridFS) is the industry standard — cheaper, faster CDN delivery, and does not bloat the database.
- **Hashtag normalization** (lowercase, strip spaces) ensures consistent grouping.
- **Nested comments** are capped at 2 levels deep to simplify queries and avoid infinite nesting UX problems.

## 3. Database Schema

### `posts` collection
```js
{
  _id: ObjectId,
  author: { type: ObjectId, ref: 'User' },
  content: { type: String, maxlength: 2200 },
  media: [{ url: String, type: { type: String, enum: ['image','video'] }, aspectRatio: String }],
  type: { type: String, enum: ['text', 'image', 'video', 'poll', 'article'] },
  hashtags: [String],
  mentions: [{ type: ObjectId, ref: 'User' }],
  poll: { options: [{ text: String, votes: Number }], endsAt: Date },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  scheduledAt: Date,
  visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
  stats: { likes: Number, comments: Number, reposts: Number, views: Number },
  createdAt, updatedAt
}
```

### `comments` collection
```js
{
  _id: ObjectId,
  post: { type: ObjectId, ref: 'Post' },
  author: { type: ObjectId, ref: 'User' },
  content: String,
  parentComment: { type: ObjectId, ref: 'Comment', default: null }, // null = top-level
  likes: Number,
  createdAt
}
```

### `likes` collection
```js
{
  user: ObjectId, targetId: ObjectId, targetType: { type: String, enum: ['Post', 'Comment'] }
}
// Compound unique index: { user, targetId, targetType }
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/posts` | Create a post (with media upload) |
| GET | `/api/v1/posts/:postId` | Get a single post |
| PUT | `/api/v1/posts/:postId` | Edit a post (within 5 min window) |
| DELETE | `/api/v1/posts/:postId` | Delete a post |
| POST | `/api/v1/posts/:postId/like` | Like/Unlike a post (toggle) |
| POST | `/api/v1/posts/:postId/repost` | Repost |
| GET | `/api/v1/posts/:postId/comments` | Get paginated comments |
| POST | `/api/v1/posts/:postId/comments` | Add a comment |
| GET | `/api/v1/explore?q=&tag=` | Explore posts by hashtag or search |

## 5. Folder Structure
```text
src/
├── models/
│   ├── post.model.js
│   ├── comment.model.js
│   └── like.model.js
├── services/
│   ├── post.service.js
│   ├── media.service.js     # Cloudinary upload helpers
│   └── discovery.service.js # hashtag search, trending topics
```

## 6. Security Considerations
- **Edit window**: Allow post edits only within 5 minutes of creation. After that, require admin approval for edits (prevents misinformation manipulation).
- **Content moderation**: Integrate with a moderation API (AWS Rekognition / OpenAI Moderation) to auto-flag explicit media.
- **Visibility enforcement**: If a post is `followers-only`, include an auth check middleware before returning it.

## 7. Implementation Steps
1. Create `post.model.js`, `comment.model.js`, `like.model.js`.
2. Build media upload service (Multer → Cloudinary pipeline).
3. Build Post CRUD APIs with visibility checks.
4. Implement like toggle (upsert in likes collection, increment/decrement counter).
5. Build comment system (2-level nesting).
6. Build hashtag discovery endpoint (aggregation pipeline on `posts.hashtags`).
7. Wire up post creation to feed fan-out service from Phase 3.

## 8. Advanced Improvements
- **Post scheduling**: Cron job (node-cron) that publishes `scheduledAt` posts.
- **Trending algorithm**: Score hashtags with `count * decayFactor(time)` — recency-weighted popularity.
- **Content Report system**: Users can report posts. Admin review queue.
- **Article Editor**: Rich-text posts using a serialized JSON content format (e.g., TipTap / Slate schema).
