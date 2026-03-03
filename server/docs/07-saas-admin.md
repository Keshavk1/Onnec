# Phase 7: SaaS & Admin — Tenant Management, Roles & Backoffice

## 1. Concept
This is what makes Onnec a true **SaaS platform**. Beyond individual users, Onnec allows **Organizations/Teams** (tenants) to claim a workspace — a branded sub-environment with:
- Custom domain/subdomain routing.
- Private user pool (only invited members see the workspace).
- Tenant-specific settings: branding, feature flags, billing plan.
- Admin dashboard for user management, content moderation, and analytics.

User roles per workspace: `owner → admin → moderator → member`.

## 2. Why this design?
- **Multi-tenancy** (shared DB, isolated by `tenantId`): Cheaper than running separate DB instances per tenant (good for startups to scale 100s of organizations on one MongoDB cluster).
- **Role-Based Access Control (RBAC)**: A declarative permission system scales better than hardcoded `if (user.role === 'admin')` checks everywhere.
- **Feature Flags**: Allow enabling/disabling features for specific tenants without deploying code — critical for B2B SaaS.

## 3. Database Schema

### `tenants` collection
```js
{
  _id: ObjectId,
  name: String,
  slug: { type: String, unique: true }, // workspace URL identifier
  logoUrl: String,
  plan: { type: String, enum: ['free', 'pro', 'enterprise'] },
  features: {                           // feature flags
    customBranding: Boolean,
    analyticsAccess: Boolean,
    apiAccess: Boolean,
  },
  ownerId: { type: ObjectId, ref: 'User' },
  stripeCustomerId: String,
  createdAt
}
```

### `tenant_members` collection
```js
{
  _id: ObjectId,
  tenant: { type: ObjectId, ref: 'Tenant' },
  user: { type: ObjectId, ref: 'User' },
  role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'] },
  inviteStatus: { type: String, enum: ['pending', 'accepted', 'rejected'] },
  joinedAt: Date,
  createdAt
}
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/tenants` | Create a new tenant workspace |
| GET | `/api/v1/tenants/:slug` | Get tenant public info |
| PATCH | `/api/v1/tenants/:slug` | Update tenant settings (owner only) |
| POST | `/api/v1/tenants/:slug/invite` | Invite user to workspace |
| PATCH | `/api/v1/tenants/:slug/members/:userId/role` | Change member role |
| DELETE | `/api/v1/tenants/:slug/members/:userId` | Remove member |
| GET | `/api/v1/admin/users` | Superadmin: List all platform users |
| PATCH | `/api/v1/admin/users/:userId/ban` | Ban/unban a user |
| GET | `/api/v1/admin/reports` | Fetch flagged content reports |

## 5. Folder Structure
```text
src/
├── models/
│   ├── tenant.model.js
│   └── tenant-member.model.js
├── services/
│   ├── tenant.service.js
│   └── rbac.service.js       # Permission checks
├── middlewares/
│   ├── tenant.middleware.js   # Resolve tenant from subdomain/header
│   └── rbac.middleware.js     # requireRole('admin', 'moderator')
```

## 6. Security Considerations
- **Tenant isolation**: All tenant-scoped queries must include `{ tenantId }` filter. An admin of Tenant A must never be able to access Tenant B data.
- **RBAC middleware**: Use a composable middleware `requireRole(['admin', 'owner'])` before sensitive routes.
- **Superadmin segregation**: Superadmin roles should be assigned only via database migration, never via API, to prevent privilege escalation.
- **Audit logs**: Record every admin action (ban, role change, content deletion) with timestamp + actorId.

## 7. Implementation Steps
1. Create `tenant.model.js`, `tenant-member.model.js`.
2. Build `tenant.middleware.js` — resolves the tenant from `X-Tenant-Slug` header or subdomain.
3. Build `rbac.service.js` — `hasPermission(userId, tenantId, requiredRole)`.
4. Implement invite flow: generate signed JWT invite links with 48h expiry.
5. Build admin routes for user management and content moderation.
6. Implement feature flag middleware: `requireFeature('analyticsAccess')`.

## 8. Advanced Improvements
- **Custom Domains**: DNS validation flow so tenants can point their domain to Onnec.
- **Audit Log UI**: Admin can browse all actions performed within their workspace.
- **Webhooks for tenants**: Tenant-level webhooks so their own systems get notified of events (new member joined, new report filed, etc.).
- **Usage billing**: Meter API calls per tenant and bill for overages on the enterprise plan.
