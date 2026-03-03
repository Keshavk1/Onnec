# Phase 4: Payment Gateway Integration

## 1. Explain the Concept
Monetization typically occurs via subscriptions, premium features, or direct tips/donations to creators. We need a Payment Gateway (like Stripe or Razorpay) to securely process credit cards, UPI, or other payment methods.

## 2. Why design it this way?
- **Security & Compliance**: We never store credit card info on our servers. We pass that burden to Stripe/Razorpay (PCI-DSS compliance).
- **Webhooks**: Payments are asynchronous. A user pays on the bank's page, and the bank eventually tells the payment gateway it succeeded. The gateway then hits a URL on our server (**Webhook**) to confirm payment. We must strictly rely on Webhooks to grant premium status, NOT the client-side success response (which can be easily forged).

## 3. Database Schema (MongoDB Modeling)
**Transaction Schema (`transaction.model.js`)**
- `user` (ObjectId ref to User)
- `amount` (Number)
- `currency` (String)
- `status` (Enum: ['Pending', 'Success', 'Failed'])
- `gatewayOrderId` (String)
- `gatewayPaymentId` (String)
- `itemType` (String, e.g., 'Subscription', 'Donation')

## 4. API Structure
- `POST /api/v1/payments/create-order` -> Generates an Order ID from Razorpay/Client Secret from Stripe. Send to client.
- `POST /api/v1/payments/webhook` -> Stripe/Razorpay hits this to confirm background payment success.

## 5. Folder Structure
```text
src/
├── controllers/
│   └── payment.controller.js
├── services/
│   └── payment.service.js      <-- Razorpay/Stripe SDK initializations
├── routes/
│   └── payment.routes.js       <-- Dedicated webhook routes
...
```

## 6. Security Considerations
- **Webhook Signature Verification**: Anyone can send a POST request to our `/webhook` endpoint pretending to be Stripe. We must verify the cryptographic signature sent in the headers using our exact Webhook Secret to guarantee it actually came from the gateway.
- **Idempotency**: Webhooks might fire multiple times for the same event. Our Database logic must handle duplicate events without granting the user standard premium status a dozen times.

## 7. Implementation Steps (Next Actions)
1. Create developer accounts on Stripe / Razorpay.
2. Store Gateway Keys in `.env`.
3. Build the `/create-order` endpoint.
4. Build the Transaction Schema to track pending payments.
5. Setup the `/webhook` endpoint (requires raw body parsing in Express).
6. Verify signatures and update the Transaction to 'Success'.

## 8. Advanced Improvements
- **Pricing Strategy Design**: Use the gateway's recurring "Subscription" APIs rather than manual one-time charges.
- **Refund Automation**: API endpoints for admins to issue partial/full refunds directly from our dashboard.
