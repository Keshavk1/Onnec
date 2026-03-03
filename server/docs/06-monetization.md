# Phase 6: Monetization — Subscriptions & Payments

## 1. Concept
Onnec's revenue model is dual-sided:
1. **Creator Monetization**: Followers pay to subscribe to a creator's exclusive content channel (monthly subscription) or send one-time tips.
2. **Platform Subscription (SaaS)**: Teams and organizations pay a monthly plan to use Onnec's workspace features (custom branding, advanced analytics, more team slots).

We integrate **Stripe** as the primary gateway (global) and **Razorpay** as the secondary (India/South Asia). The payment flow is event-driven: our system never trusts the client — all payment grants are triggered only after verifying a **webhook signature** from the gateway.

## 2. Why this design?
- **Webhooks as source of truth**: The client-side callback can be forged. The webhook from Stripe cannot (verified by cryptographic signature).
- **Idempotent webhook handlers**: Webhooks may fire multiple times. We use the gateway's `eventId` to ensure we process each event exactly once.
- **Stripe Connect** (advanced): For creator payouts, Stripe Connect lets us hold funds on our platform and route a cut to creator bank accounts — no manual transfer needed.

## 3. Database Schema

### `subscriptions` collection
```js
{
  _id: ObjectId,
  subscriber: { type: ObjectId, ref: 'User' },
  creator: { type: ObjectId, ref: 'User' },
  plan: { type: String, enum: ['monthly', 'annual'] },
  status: { type: String, enum: ['active', 'cancelled', 'past_due', 'trialing'] },
  stripeSubscriptionId: String,
  currentPeriodEnd: Date,
  cancelledAt: Date,
  createdAt
}
```

### `transactions` collection
```js
{
  _id: ObjectId,
  user: { type: ObjectId, ref: 'User' },
  amount: Number,       // in smallest currency unit (paise/cents)
  currency: String,
  type: { type: String, enum: ['subscription', 'tip', 'platform_plan'] },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'] },
  gatewayEventId: { type: String, unique: true }, // idempotency key
  gatewayPaymentId: String,
  metadata: Object,    // flexible: { creatorId, planId, etc. }
  createdAt
}
```

## 4. API Design

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/payments/create-subscription` | Create creator subscription checkout session |
| POST | `/api/v1/payments/tip` | Create a one-time tip payment intent |
| POST | `/api/v1/payments/webhook/stripe` | Stripe webhook receiver |
| POST | `/api/v1/payments/webhook/razorpay` | Razorpay webhook receiver |
| GET | `/api/v1/payments/my-subscriptions` | List all my subscriptions |
| DELETE | `/api/v1/payments/cancel/:subscriptionId` | Cancel a subscription |

## 5. Folder Structure
```text
src/
├── models/
│   ├── subscription.model.js
│   └── transaction.model.js
├── services/
│   ├── stripe.service.js
│   ├── razorpay.service.js
│   └── payment.service.js    # orchestrates both gateways
├── controllers/payment.controller.js
└── routes/payment.routes.js  # Webhook routes use raw body parser
```

## 6. Security Considerations
- **Raw body required**: Stripe webhook verification needs the raw, unparsed request body. Use `express.raw({ type: 'application/json' })` for the webhook route only.
- **Webhook signature verification**: `stripe.webhooks.constructEvent(rawBody, sig, secret)` — reject on failure.
- **PCI Compliance**: Never log or store full card details. Our server only handles tokens.
- **Revenue leak prevention**: Always check subscription `status === 'active'` server-side before serving premium content.

## 7. Implementation Steps
1. Create Stripe + Razorpay accounts, save keys in `.env`.
2. Create `transaction.model.js` + `subscription.model.js`.
3. Build `stripe.service.js`: create checkout sessions, retrieve subscriptions.
4. Build webhook routes with raw body parser.
5. Implement idempotency check: `if (await Transaction.findOne({ gatewayEventId })) return`.
6. On webhook success: update transaction to `success`, activate subscription.
7. Build subscription gating middleware: `requireActiveSubscription(creatorId)`.

## 8. Advanced Improvements
- **Stripe Connect**: Enable creator payouts with platform fee collection.
- **Trial periods**: 7-day free trial on pro subscriptions.
- **Discount Coupons**: Promo code support via Stripe Coupons API.
- **Revenue Dashboard**: Creator analytics showing MRR, churn, and subscriber growth.
