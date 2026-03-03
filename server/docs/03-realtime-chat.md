# Phase 3: Real-Time Chat System

## 1. Explain the Concept
A modern social app needs instant messaging. Standard HTTP is stateless and unidirectional (Client asks -> Server responds). For real-time chat, we need bidirectional, persistent connections. We will use **WebSockets via Socket.io**.

## 2. Why design it this way?
- **Socket.io**: Handles WebSockets efficiently and falls back to HTTP long-polling if WebSockets are blocked by proxies/firewalls. It also handles automatic reconnections and "rooms" (useful for group chats).
- **Decoupled Architecture**: Socket servers can be heavy. We want to separate the REST API (auth, profile) from the real-time message bus as much as possible, though they can run on the same Express server initially.

## 3. Database Schema (MongoDB Modeling)
**Chat Schema (`chat.model.js`)**
- `chatName` (String, for groups)
- `isGroupChat` (Boolean)
- `users` (Array of ObjectId ref to User)
- `latestMessage` (ObjectId ref to Message)
- `admin` (ObjectId ref to User)

**Message Schema (`message.model.js`)**
- `sender` (ObjectId ref to User)
- `content` (String)
- `chat` (ObjectId ref to Chat)
- timestamps...

## 4. API Structure (REST + Sockets)
**REST Endpoints**
- `POST /api/v1/chats` -> Create a 1-on-1 chat or group chat.
- `GET /api/v1/chats` -> Fetch all chats for logged-in user.
- `GET /api/v1/messages/:chatId` -> Fetch message history for a chat.

**Socket Events**
- `connection` -> establish socket connection.
- `setup` -> join personal user room to receive notifications.
- `join chat` -> join a specific chat room ID.
- `new message` -> server broadcasts message to room participants.

## 5. Folder Structure
```text
src/
├── sockets/
│   └── chat.socket.js      <-- Handles all socket logic separately
├── controllers/
│   ├── chat.controller.js
│   └── message.controller.js
├── repositories/
...
```

## 6. Security Considerations
- **Authenticating Sockets**: Just like REST API requests, socket connections must be authenticated. Send the JWT during the initial WebSocket handshake to verify the user identity.
- **Message Authorization**: Verify if `req.user.id` is actually part of `chat.users` before allowing them to read or send messages in that chat. 

## 7. Implementation Steps (Next Actions)
1. Install `socket.io`.
2. Configure Socket.io with the Express server.
3. Design Chat and Message schemas.
4. Build REST APIs to fetch chat list and history.
5. Create Socket event listeners (`connection`, `join chat`, `new message`).
6. Test in Postman WebSocket client or a basic frontend UI.

## 8. Advanced Improvements
- **Message Queues**: If creating an enterprise app, use RabbitMQ or Kafka to handle high-throughput message processing.
- **Read Receipts**: Implement "delivered" and "read" socket events.
- **Typing Indicators**: Emit `typing` and `stop typing` events.
