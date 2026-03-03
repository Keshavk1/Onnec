# Onnec — SaaS Social Platform: Server Roadmap

## What makes Onnec unique?

Onnec is not just another social networking app. It is a **dual-mode SaaS social platform** where users can operate in:
- **Personal Mode**: A private, curated digital identity for personal relationships and networking.
- **Social/Creator Mode**: A public-facing profile with follower ecosystems, content monetization, and community tools.

The platform is designed as a **multi-tenant SaaS** product. Businesses, communities, or creator agencies can set up their own "workspace" on Onnec, with their own branding, user base, and revenue management — all powered by the same core backend.

---

## Architecture Principles
- **Controller → Service → Repository**: Clean separation of HTTP, business logic, and data layers.
- **Event-Driven Architecture**: Use internal event emitters / message queues to decouple side-effects (emails, notifications, analytics).
- **Security-First**: Rate limiting, CSRF, injection protection, Helmet, input sanitization on every layer.
- **Observability**: Structured logging (Winston), error monitoring (Sentry), metrics (Prometheus/Datadog integration-ready).

---

## Server-Side Phases

| Phase | Feature Area | Folder |
|---|---|---|
| 1 | Foundation: Project Setup & Auth | `01-auth.md` |
| 2 | Identity: User Profile & Mode System | `02-profiles-modes.md` |
| 3 | Social Graph: Connections & Feed | `03-social-graph.md` |
| 4 | Real-Time: Chat & Notifications | `04-realtime.md` |
| 5 | Content: Posts, Media & Discovery | `05-content.md` |
| 6 | Monetization: Subscriptions & Payments | `06-monetization.md` |
| 7 | Admin & SaaS: Tenant Management | `07-saas-admin.md` |
| 8 | Platform Intelligence: AI & Analytics | `08-ai-analytics.md` |
| 9 | Optimization & Deployment | `09-optimization-deployment.md` |

---

> We build server phases 1–9 completely before starting the client side.
> Each phase doc outlines: Concept → DB Schema → API Design → Security → Implementation steps → Advanced improvements.
