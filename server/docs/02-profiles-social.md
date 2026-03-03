# Phase 2: Profiles & Social Graph

## 1. Explain the Concept
Users need customizable profiles and the ability to connect with others. The app will feature two modes: **Personal** and **Social**.
- **Personal Mode**: Private interactions, direct messaging, hidden from public feeds.
- **Social Mode**: Public profile, posts, feed generation, and follower/following mechanics.

The **Social Graph** represents how users are connected (who follows whom).

## 2. Why design it this way?
- **Separate Modes**: Gives users exact control over their privacy without needing two separate accounts. Logic can easily check the `mode` field to allow or restrict access to certain endpoints.
- **Connection Documents**: For Follow/Unfollow, instead of storing massive arrays of `followers` inside the User document (which can hit MongoDB's 16MB limit), we create a separate `Connection` collection to track who follows whom. This is scalable and efficient for querying.

## 3. Database Schema (MongoDB Modeling)
**Profile Schema (`profile.model.js`)**
- `user` (ObjectId ref to User)
- `bio` (String)
- `avatarUrl` (String)
- `socialLinks` (Array / Object)
- `privacyScope` (Enum: ['Public', 'FriendsOnly', 'Private'])

**Connection Schema (`connection.model.js`)**
- `follower` (ObjectId ref to User)
- `following` (ObjectId ref to User)
- `status` (Enum: ['Pending', 'Accepted'] - useful for private accounts)
- timestamps...

## 4. API Structure
- `GET /api/v1/profiles/:userId` -> Fetch user profile.
- `PUT /api/v1/profiles/me` -> Update my profile.
- `POST /api/v1/connections/follow/:userId` -> Follow a user.
- `POST /api/v1/connections/unfollow/:userId` -> Unfollow a user.
- `GET /api/v1/users/:userId/followers` -> List followers.

## 5. Folder Structure
```text
src/
├── controllers/
│   ├── profile.controller.js
│   └── connection.controller.js
├── services/
│   ├── profile.service.js
│   └── connection.service.js
├── repositories/
│   ├── profile.repository.js
│   └── connection.repository.js
...
```

## 6. Security Considerations
- **IDOR (Insecure Direct Object Reference)**: Ensure a user can only edit their own profile (`req.user.id === profile.user.toString()`).
- **Privacy Enforcement**: If a user is in Personal Mode, prevent non-friends from fetching their full profile or following them without a request.

## 7. Implementation Steps (Next Actions)
1. Design `Profile` and `Connection` schemas.
2. Implement Profile CRUD operations (uploading avatars via Cloudinary/AWS S3).
3. Implement Follow/Unfollow logic (ensuring avoiding duplicate follows).
4. Implement basic Feed Logic (fetching recent posts from followed users).

## 8. Advanced Improvements
- **Caching Profiles**: Use Redis to cache popular user profiles to reduce DB hits.
- **Graph Database**: For extremely complex social graphs (friends of friends), consider Neo4j or ArangoDB alongside MongoDB.
