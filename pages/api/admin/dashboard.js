import { verifyAuth } from '../../utils/auth';
import Order from '../../backend/models/Order';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    if (!user || !user.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch orders and other dashboard data
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10);

    res.json({
      orders: orders.map(order => ({
        id: order._id,
        customer: order.customer,
        amount: order.total,
        status: order.status
      }))
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 