# Phase 2: Identity — User Profile & Mode System

## 1. Concept
Users have two distinct existences on Onnec: a **Personal Identity** (private, curated connections, like a personal LinkedIn) and a **Social/Creator Identity** (public, followers, content monetization). These are not two accounts — they are two **modes** on the same account.

The **Mode System** is one of Onnec's core differentiators. When a user switches to Social Mode, their public profile, follower count, and content feed become visible. In Personal Mode, everything is private and invite-only.

## 2. Why this design?
- Most social platforms force you into one lane. Onnec's dual-mode gives users privacy control without creating multiple accounts.
- Separating Profile from User keeps the User model lightweight (auth concerns only). Profile handles identity/presentation concerns.

## 3. Database Schema

### `profiles` collection
```js
{
  _id: ObjectId,
  user: { type: ObjectId, ref: 'User', unique: true },
  displayName: String,
  username: String,  // readonly after 14 days of account creation
  bio: String,
  avatarUrl: String,
  coverUrl: String,
  website: String,
  location: String,
  mode: { type: String, enum: ['personal', 'social'], default: 'personal' },
  isVerifiedCreator: { type: Boolean, default: false }, // blue tick
  socialLinks: {
    twitter: String,
    instagram: String,
    github: String,
    linkedin: String,
  },
  stats: {       // denormalized counters (increment on action)
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
  },
  privacySettings: {
    allowFollowRequests: Boolean,
    showOnlineStatus: Boolean,
    allowMentions: { type: String, enum: ['everyone', 'following', 'none'] },
  },
  createdAt, updatedAt
}
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| GET | `/api/v1/profiles/me` | Get my own profile |
| PUT | `/api/v1/profiles/me` | Update my profile |
| GET | `/api/v1/profiles/:username` | Get public profile by username |
| PATCH | `/api/v1/profiles/me/mode` | Switch mode (personal ↔ social) |
| PATCH | `/api/v1/profiles/me/avatar` | Upload avatar (multipart/form-data) |
| PATCH | `/api/v1/profiles/me/privacy` | Update privacy settings |
| GET | `/api/v1/profiles/search?q=` | Search users by name/username |

## 5. Folder Structure
```text
src/
├── models/profile.model.js
├── repositories/profile.repository.js
├── services/profile.service.js
├── controllers/profile.controller.js
├── routes/profile.routes.js
├── middlewares/
│   └── upload.middleware.js   # Multer + Cloudinary integration
└── validators/
    └── profile.schema.js
```

## 6. Security Considerations
- **IDOR Protection**: Always verify `req.user._id === profile.user` before allowing edits.
- **Username locks**: After 14 days, a username change request generates a 72-hour cooldown and requires re-verification.
- **File Upload**: Validate MIME type server-side (not just extension). Set max file size limits in Multer.
- **Mode Switch Audit**: Log mode switches with timestamps so you can detect abuse (e.g., someone going public then private rapidly).

## 7. Implementation Steps
1. Install: `multer`, `cloudinary`.
2. Create `profile.model.js`.
3. Create `profile.repository.js`.
4. Auto-create a Profile document when a User registers (use a Mongoose post-save hook on User model).
5. Create `upload.middleware.js` to handle Cloudinary file uploads.
6. Build Profile CRUD service and controller.
7. Add search endpoint with `$regex` or MongoDB Atlas Search.

## 8. Advanced Improvements
- **Creator Verification Flow**: Manual admin review queue + badge assignment.
- **Profile Completion Score**: Show users a % metric encouraging them to complete their profile.
- **MongoDB Atlas Search**: Use Atlas Search indexes for full-text username/bio search.
- **Gravatar Fallback**: Automatically use Gravatar URL if user hasn't uploaded an avatar.
