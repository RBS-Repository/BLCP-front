import paymongoService from '../../backend/services/paymongoService';
import Order from '../../backend/models/Order';

export const config = {
  api: {
    bodyParser: false // We need raw body for signature verification
  }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add basic authentication check
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const buf = await buffer(req);
    const signature = req.headers['paymongo-signature'];
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Missing PAYMONGO_WEBHOOK_SECRET');
    }

    // Verify webhook signature and parse event
    const event = paymongoService.constructEvent(
      buf,
      signature,
      webhookSecret
    );

    console.log('Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'source.chargeable':
        await handleChargeableSource(event.data.id);
        break;

      case 'payment.paid':
        await handlePaymentPaid(event.data.id);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.data.id);
        break;

      case 'checkout_session.payment.paid':
        await handleCheckoutSessionPaid(event.data);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: err.message });
  }
}

// Helper functions to handle different event types
async function handleChargeableSource(sourceId) {
  const order = await Order.findOne({ 'payment.sourceId': sourceId });
  if (order) {
    await paymongoService.handleChargeableSource(sourceId, order);
  }
}

async function handlePaymentPaid(paymentId) {
  const order = await Order.findOne({ 'payment.paymentId': paymentId });
  if (order) {
    order.payment.status = 'paid';
    order.status = 'processing';
    await order.save();
  }
}

async function handlePaymentFailed(paymentId) {
  const order = await Order.findOne({ 'payment.paymentId': paymentId });
  if (order) {
    order.payment.status = 'failed';
    order.status = 'payment_failed';
    await order.save();
  }
}

async function handleCheckoutSessionPaid(data) {
  const order = await Order.findOne({ 'payment.checkoutSessionId': data.id });
  if (order) {
    order.payment.status = 'paid';
    order.status = 'processing';
    order.payment.details = data.attributes.payments[0];
    await order.save();
  }
} 