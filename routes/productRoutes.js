const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products/:id  => Fetch product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /products - Create a new product
router.post('/products', async (req, res) => {
    try {
        // Make sure you're extracting stock from the correct source in req.body
        const { name, price, description, stock } = req.body;
        
        // Create a new product with stock
        const newProduct = new Product({
            name,
            price,
            description,
            stock // value from req.body
        });
        
        // Save the product to MongoDB
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 