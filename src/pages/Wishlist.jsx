import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProductIds, setLoadingProductIds] = useState([]);

  // Fetch all wishlist products
  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (wishlistItems.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch each product from the API
        const productPromises = wishlistItems.map(productId => 
          api.get(`/products/${productId}`)
            .then(response => response.data)
            .catch(err => {
              console.error(`Error fetching product ${productId}:`, err);
              return null; // Return null for products that couldn't be fetched
            })
        );

        const results = await Promise.all(productPromises);
        // Filter out any null products
        const validProducts = results.filter(product => product !== null);
        setProducts(validProducts);
      } catch (error) {
        console.error('Error fetching wishlist products:', error);
        toast.error('Failed to load wishlist products');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlistItems, user]);

  const handleRemoveFromWishlist = (productId) => {
    removeFromWishlist(productId);
  };

  const handleAddToCart = async (product) => {
    try {
      setLoadingProductIds(prev => [...prev, product._id]);
      await addToCart(product, product.minOrder || 1);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add product to cart');
      console.error('Add to cart error:', error);
    } finally {
      setLoadingProductIds(prev => prev.filter(id => id !== product._id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#363a94] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <Toaster position="top-center" />
      
      {/* Hero Section */}
      <motion.section
        className="bg-gradient-to-r from-[#363a94] to-[#2a2d73] text-white py-16 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            My Wishlist
          </motion.h1>
          <motion.p
            className="text-xl max-w-2xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Your favorite products in one place
          </motion.p>
        </div>
      </motion.section>

      {/* Wishlist Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {wishlistItems.length === 0 ? (
          <motion.div 
            className="bg-white rounded-xl shadow-md p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center justify-center">
              <FaHeart className="text-6xl text-gray-300 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
              <p className="text-gray-500 mb-6">Browse our products and add items to your wishlist</p>
              <Link 
                to="/products" 
                className="px-6 py-3 bg-[#363a94] text-white rounded-lg font-medium hover:bg-[#2a2d73] transition duration-300"
              >
                Browse Products
              </Link>
            </div>
          </motion.div>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Items in your wishlist ({wishlistItems.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <motion.div
                  key={product._id}
                  className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Product Image */}
                  <Link to={`/products/${product._id}`} className="block relative overflow-hidden h-56 bg-gray-100">
                    <img
                      src={product.image || 'https://via.placeholder.com/300'}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Product Info */}
                  <div className="p-4 flex-grow">
                    <Link to={`/products/${product._id}`}>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1 hover:text-[#363a94] transition">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-gray-600 text-sm mb-2">{product.category}</p>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-lg font-bold text-[#363a94]">₱{product.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Min Order: {product.minOrder || 1}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 mt-auto">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={loadingProductIds.includes(product._id)}
                        className="flex-1 py-2 px-4 bg-[#363a94] text-white rounded flex items-center justify-center hover:bg-[#2a2d73] transition"
                      >
                        {loadingProductIds.includes(product._id) ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                          <FaShoppingCart className="mr-2" />
                        )}
                        Add to Cart
                      </button>
                      <button
                        onClick={() => handleRemoveFromWishlist(product._id)}
                        className="p-2 text-red-500 rounded hover:bg-red-50 transition"
                      >
                        <FaHeart />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist; 