# Phase 4: Real-Time — Chat & Notifications

## 1. Concept
Real-time communication is a core expectation. We implement two systems:
1. **Chat**: One-on-one and group messaging with delivery/read receipts and typing indicators.
2. **Notification Hub**: A persistent in-app notification system (new followers, likes, mentions, payment events) delivered instantly via WebSockets.

We use **Socket.io** running on the same Express server, with **Redis Adapter** for horizontal scaling (multiple server instances share socket state via Redis pub/sub).

## 2. Why this design?
- **Socket.io** provides automatic reconnection, room-based broadcasting, and fallback transport — battle-tested for social products.
- **Redis Pub/Sub Adapter**: When deployed across multiple Node processes/pods, all instances subscribe to the same Redis channel, so a message sent on server1 reaches a client connected to server2.
- **Notification persistence**: Push to socket for instant delivery AND write to `notifications` collection so users get history even when offline.

## 3. Database Schema

### `chats` collection
```js
{
  _id: ObjectId,
  chatName: String,            // only for group chats
  isGroupChat: Boolean,
  participants: [{ type: ObjectId, ref: 'User' }],
  admin: { type: ObjectId, ref: 'User' }, // group admin
  lastMessage: { type: ObjectId, ref: 'Message' },
  createdAt, updatedAt
}
```

### `messages` collection
```js
{
  _id: ObjectId,
  chat: { type: ObjectId, ref: 'Chat' },
  sender: { type: ObjectId, ref: 'User' },
  content: { type: String, trim: true },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  attachments: [{ url: String, mimeType: String }],
  readBy: [{ type: ObjectId, ref: 'User' }],
  createdAt
}
```

### `notifications` collection
```js
{
  _id: ObjectId,
  recipient: { type: ObjectId, ref: 'User' },
  sender: { type: ObjectId, ref: 'User' },          // who triggered it
  type: { type: String, enum: ['follow', 'like', 'comment', 'mention', 'payment', 'system'] },
  entityId: ObjectId,   // e.g. postId, commentId
  entityType: String,   // 'Post', 'Comment'
  isRead: { type: Boolean, default: false },
  createdAt
}
```

## 4. API Design

### REST Endpoints
| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/chats` | Start a 1-on-1 or group chat |
| GET | `/api/v1/chats` | Get all chats for logged-in user |
| GET | `/api/v1/chats/:chatId/messages` | Paginated message history |
| GET | `/api/v1/notifications` | Get notification feed |
| PATCH | `/api/v1/notifications/mark-read` | Mark all/selected as read |

### Socket.io Events
| Event | Direction | Description |
|---|---|---|
| `setup` | Client → Server | Join personal socket room |
| `join-chat` | Client → Server | Join a specific chat room |
| `new-message` | Client → Server | Send a message |
| `message-received` | Server → Client | Incoming message broadcast |
| `typing` / `stop-typing` | Bidirectional | Typing indicator |
| `notification` | Server → Client | Real-time notification push |

## 5. Folder Structure
```text
src/
├── sockets/
│   ├── index.js           # socket.io server init & redis adapter
│   ├── chat.socket.js     # chat event handlers
│   └── notification.socket.js
├── models/
│   ├── chat.model.js
│   ├── message.model.js
│   └── notification.model.js
├── services/
│   ├── chat.service.js
│   └── notification.service.js
```

## 6. Security Considerations
- **Socket Authentication**: Verify JWT during the `connection` handshake. Reject unauthenticated sockets.
- **Room Authorization**: Before joining `chat:room:ID`, verify the user is a participant of that chat.
- **Message Sanitization**: Strip HTML/JS from messages before saving to prevent stored XSS.
- **Rate Limit Messages**: Prevent spam by limiting emission frequency per socket (e.g., max 30 messages/minute).

## 7. Implementation Steps
1. Install: `socket.io`, `@socket.io/redis-adapter`, `ioredis`.
2. Initialize Socket.io in `src/sockets/index.js`, attach Redis adapter.
3. Build Chat REST APIs (create, fetch).
4. Build Socket event handlers for chat.
5. Build Notification service and REST API.
6. Emit `notification` event on follow/like/comment actions from respective services.
7. Test with Postman WebSocket client.

## 8. Advanced Improvements
- **E2E Encryption**: Implement Signal Protocol or use a pre-built SDK for zero-knowledge message encryption.
- **Message Reactions**: Emoji reactions on messages stored as a subdocument array.
- **File Sharing**: Chunked upload via WebSocket for large files.
- **Push Notifications**: Integrate Firebase Cloud Messaging (FCM) for mobile push when the user is offline.
