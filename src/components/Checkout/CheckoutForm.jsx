const handleSubmit = async (e) => {
  e.preventDefault();
  setProcessing(true);

  try {
    // Add validation before submission
    if (formData.shipping.city === 'Select Cities' || formData.shipping.province === 'Select Province') {
      throw new Error('Please select valid city and province');
    }

    // Add validation for payment method
    if (formData.payment.method === 'credit_card' && !formData.payment.cardNumber) {
      throw new Error('Credit card details are required');
    }

    // Process payment
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });
    if (error) throw error;

    // Prepare order items
    const orderItems = cartItems.map(item => ({
      product: item.product.id, // Send only product ID
      quantity: item.quantity,
      price: item.product.price
    }));

    // Create order payload
    const orderData = {
      items: orderItems,
      total: cartTotal,
      shipping: formData.shipping,
      billing: formData.billing,
      payment: formData.payment
    };

    // Submit order
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await user.getIdToken()}`
      },
      body: JSON.stringify(orderData)
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Order failed: ${errorText}`);
    }

    // Clear cart after successful order
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
    });

    // Force refresh of orders list in admin panel
    window.dispatchEvent(new Event('new-order'));

    navigate('/order-confirmation');
  } catch (err) {
    console.error('Checkout error:', err);
    Swal.fire({
      title: 'Order Failed',
      text: err.message,
      icon: 'error'
    });
  } finally {
    setProcessing(false);
  }
}; 