import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Cart.css';

const Cart = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('http://localhost:5000/api/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setCart(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cart:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (user) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [user]);

  const updateQuantity = async (productId, quantity) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:5000/api/cart/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const updatedCart = await res.json();
      setCart(updatedCart);
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const removeItem = async (productId) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:5000/api/cart/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const updatedCart = await res.json();
      setCart(updatedCart);
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  if (loading) {
    return <div className="cart-page">Loading...</div>;
  }

  if (error) {
    return <div className="cart-page">Error: {error}</div>;
  }

  return (
    <div className="cart-page">
      <h1>Your Cart</h1>
      {cart && cart.products.length > 0 ? (
        <div className="cart-items">
          {cart.products.map(item => (
            <div key={item.product._id} className="cart-item">
              <img src={item.product.image} alt={item.product.name} />
              <div className="item-details">
                <h2><Link to={`/products/${item.product._id}`}>{item.product.name}</Link></h2>
                <p>Price: ₱{item.product.price.toLocaleString()}</p>
                <div className="item-controls">
                  <button onClick={() => updateQuantity(item.product._id, item.quantity - 1)} disabled={item.quantity === 1}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product._id, item.quantity + 1)}>+</button>
                  <button onClick={() => removeItem(item.product._id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Your cart is empty.</p>
      )}
    </div>
  );
};

export default Cart; 