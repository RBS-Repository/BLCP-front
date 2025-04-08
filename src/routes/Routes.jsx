import OrderHistory from '../pages/User/OrderHistory';

const router = createBrowserRouter([
  {
    path: "/order-history",
    element: <ProtectedRoute><OrderHistory /></ProtectedRoute>
  },
  // ... other routes ...
]); 