import React, { useState } from 'react';
import axios from 'axios';

function Checkout() {
  const [formData, setFormData] = useState({
    shipping: {
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      phone: '',
      email: ''
    },
    // ... other form sections
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.shipping.province || !formData.shipping.city) {
      alert('Please fill in province and city fields');
      return;
    }

    try {
      const response = await axios.post('/api/orders', formData);
      // Handle success
    } catch (error) {
      console.error('Order submission failed:', error);
      alert(`Order failed: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="province"
        value={formData.shipping.province}
        onChange={handleInputChange}
        placeholder="Enter Province (e.g. Gauteng)"
        required
      />

      <input
        type="text"
        name="city"
        value={formData.shipping.city}
        onChange={handleInputChange}
        placeholder="Enter City (e.g. Johannesburg)"
        required
      />
    </form>
  );
}

export default Checkout; 