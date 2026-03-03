# Phase 9: Optimization, Security Hardening & Deployment

## 1. Concept
Before going to production, the application must be hardened, optimized, containerized, and monitored. This is not an afterthought — it's the systematic pass that makes your product reliable at scale and sleep-well-at-night deployable.

## 2. Performance Optimization

### MongoDB Indexing Strategy
Every query field that appears in a `.find({ field: value })` or is sorted needs an index:
```js
// user model
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// post model
postSchema.index({ author: 1, createdAt: -1 }); // compound
postSchema.index({ hashtags: 1 });

// connection model
connectionSchema.index({ follower: 1, following: 1 }, { unique: true });

// message model
messageSchema.index({ chat: 1, createdAt: -1 });
```

### Redis Caching
| Data | Cache Key | TTL |
|---|---|---|
| User profile | `profile:{userId}` | 10 min |
| Feed | `feed:{userId}` | 5 min |
| Trending hashtags | `trending:hashtags` | 1 hour |
| API key scopes | `apikey:{keyHash}` | 30 min |

### Other Optimizations
- Use `lean()` on Mongoose queries for read-only endpoints (returns plain JS objects, skips Mongoose overhead).
- Use `select()` to exclude heavy fields not needed in list endpoints.
- Paginate all list endpoints using cursor-based pagination (not `skip/limit`).

## 3. Security Hardening

```bash
npm install express-rate-limit helmet express-mongo-sanitize hpp xss-clean
```

| Package | Purpose |
|---|---|
| `helmet` | Sets 14 security HTTP headers |
| `express-rate-limit` | Prevents DDoS, brute force on auth endpoints |
| `express-mongo-sanitize` | Strips $ and . from inputs to prevent NoSQL injection |
| `hpp` | Prevents HTTP Parameter Pollution |
| `xss-clean` | Strips XSS payloads from req.body/query |

### CORS
```js
cors({
  origin: process.env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
})
```

## 4. Logging & Monitoring
- **Winston**: Structured JSON logs with levels (error, warn, info, debug). Transport to `logs/error.log` and `logs/combined.log`.
- **Morgan**: HTTP access logs piped to Winston stream.
- **Sentry**: Error tracking in production (`@sentry/node`). Captures unhandled exceptions + slow transaction traces.
- **Prometheus + Grafana** (advanced): Expose `/metrics` endpoint using `prom-client`, visualize in Grafana.

## 5. Dockerization

### `Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```

### `docker-compose.yml`
```yaml
version: '3.8'
services:
  server:
    build: .
    ports: ["5000:5000"]
    env_file: .env
    depends_on: [mongo, redis]
  mongo:
    image: mongo:7
    volumes: [mongo-data:/data/db]
  redis:
    image: redis:7-alpine
volumes:
  mongo-data:
```

## 6. CI/CD (GitHub Actions)

### `.github/workflows/main.yml`
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

### Deployment (Render / Railway / AWS ECS)
- Trigger Docker build on push to `main`.
- Deploy container to Render, Railway, or AWS ECS via GitHub Actions.
- Use managed MongoDB Atlas and Redis Cloud for production.

## 7. Environment Management
```text
.env               # local dev (gitignored)
.env.example       # committed — template for devs
.env.test          # for test suite
```

## 8. Advanced Improvements
- **Zero-downtime deployment**: Use rolling deployments on Kubernetes or AWS ECS with health check probes.
- **NGINX reverse proxy**: SSL termination, gzip, and static file serving in front of Node.
- **Load testing**: Use k6 or Artillery to benchmark before launch.
- **Database backups**: Automated MongoDB Atlas backups + point-in-time restore enabled.
