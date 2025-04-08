import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const webhookUrl = process.env.WEBHOOK_URL;
const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

if (!webhookUrl || !webhookSecret) {
  console.error('Error: WEBHOOK_URL and PAYMONGO_WEBHOOK_SECRET environment variables must be set');
  process.exit(1);
}

const payload = {
  data: {
    attributes: {
      type: 'payment.paid',
      data: {
        id: 'test_payment',
        attributes: {
          status: 'paid',
          payment: {
            status: 'paid'
          },
          data: {
            checkout_session_id: 'test_session'
          }
        }
      }
    }
  }
};

const stringPayload = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(stringPayload)
  .digest('hex');

console.log('Sending webhook event...');
console.log('Payload:', stringPayload);
console.log('Signature:', signature);

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'paymongo-signature': signature
  },
  body: stringPayload
})
.then(response => response.json())
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
}); 