import React, { lazy } from 'react';

const Cart = lazy(() => import('../pages/Shop/Cart').then(module => ({ default: module.Cart })));

export default Cart; 