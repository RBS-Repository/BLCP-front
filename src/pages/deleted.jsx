import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Cart.css';
import Swal from 'sweetalert2';

const Cart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cart');
        }

        const cartData = await response.json();
        setCartItems(cartData.products || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  const updateQuantity = async (productId, newQuantity) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:5000/api/cart/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      const updatedCart = await response.json();
      setCartItems(updatedCart.products);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message
      });
    }
  };

  const removeItem = async (productId) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:5000/api/cart/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      const updatedCart = await response.json();
      setCartItems(updatedCart.products);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Remove Failed',
        text: err.message
      });
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  if (loading) return <div className="cart-page">Loading cart...</div>;
  if (error) return <div className="cart-page">Error: {error}</div>;

  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1>Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <Link to="/products" className="continue-shopping">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.product._id} className="cart-item">
                  <div className="item-image">
                    <img src={item.product.image} alt={item.product.name} />
                  </div>
                  <div className="item-details">
                    <h3>{item.product.name}</h3>
                    <p className="item-price">₱{item.product.price.toLocaleString()}</p>
                    <p className="min-order">Minimum Order: {item.product.minOrder} pcs</p>
                  </div>
                  <div className="item-quantity">
                    <button 
                      onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                      disabled={item.quantity <= item.product.minOrder}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product._id, parseInt(e.target.value))}
                      min={item.product.minOrder}
                    />
                    <button onClick={() => updateQuantity(item.product._id, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <div className="item-total">
                    ₱{(item.product.price * item.quantity).toLocaleString()}
                  </div>
                  <button
                    className="remove-item"
                    onClick={() => removeItem(item.product._id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Tax (12%)</span>
                <span>₱{tax.toLocaleString()}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>₱{total.toLocaleString()}</span>
              </div>
              <Link to="/checkout" className="checkout-button">
                Proceed to Checkout
              </Link>
              <Link to="/products" className="continue-shopping">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart; 