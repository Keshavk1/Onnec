# ONNEC — Real-time Chat System

## 1. Concept
The **Real-time Chat System** enables low-latency, bidirectional communication between users. It combines a robust REST API for history and management with **WebSockets (Socket.io)** for instant message delivery.

## 2. Why this design?
- **Dual Communication**: HTTP for "cold" data (history, settings) and WebSockets for "hot" data (live messages, typing indicators).
- **Room-based Architecture**: Efficiently multicasts messages to specific conversation participants.
- **Persistent Storage**: All messages are archived in MongoDB for offline access.
- **Scalable**: Designed to use **Redis Pub/Sub** adapter for Socket.io to support multiple server instances.

## 3. Database Schema

### `chats` collection
```javascript
{
  _id: ObjectId,
  name: String, // For group chats
  isGroupChat: Boolean,
  participants: [{ type: ObjectId, ref: 'User' }],
  lastMessage: { type: ObjectId, ref: 'Message' },
  admin: { type: ObjectId, ref: 'User' }
}
```

### `messages` collection
```javascript
{
  _id: ObjectId,
  sender: { type: ObjectId, ref: 'User' },
  content: String,
  chat: { type: ObjectId, ref: 'Chat' },
  attachments: [String]
}
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/chat/` | Get list of user's conversations |
| POST | `/api/v1/chat/c` | Create/Retrieve a 1-on-1 or group chat |
| POST | `/api/v1/chat/m` | Send a message via REST (fallback) |
| GET | `/api/v1/chat/m/:chatId` | Fetch message history |

## 5. WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `joinChat` | Client -> Server | Join a specific room based on `chatId` |
| `sendMessage` | Client -> Server | Send message to a room |
| `messageReceived` | Server -> Client | Broadcast new message to participants |
| `typing` | Client -> Server | Notify others that user is typing |

## 6. Implementation Files
- `src/models/chat.model.js`: Conversation schema.
- `src/models/message.model.js`: message schema.
- `src/socket/index.js`: WebSocket event handlers.
- `src/services/chat.service.js`: Business logic.
- `src/controllers/chat.controller.js`: API handlers.
