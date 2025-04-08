import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { motion } from 'framer-motion';
import { FaEye } from 'react-icons/fa';
import ImageLoader from '../common/ImageLoader';
import api from '../../api/client';

// Import Swiper styles if not already imported elsewhere
import 'swiper/css';
import 'swiper/css/navigation';

// Maximum number of products to show in recently viewed
const MAX_RECENT_PRODUCTS = 10;

// localStorage key for saving recently viewed products
const STORAGE_KEY = 'recently_viewed_products';

const RecentlyViewed = () => {
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        setLoading(true);
        
        // Get product IDs from localStorage
        const storedProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        if (storedProducts.length === 0) {
          setRecentProducts([]);
          setLoading(false);
          return;
        }
        
        // Fetch full product details for each ID
        const productDetails = await Promise.all(
          storedProducts.map(async (productId) => {
            try {
              const response = await api.get(`/products/${productId}`);
              return response.data;
            } catch (error) {
              console.error(`Error fetching product ${productId}:`, error);
              return null;
            }
          })
        );
        
        // Filter out any null entries (failed fetches) and set the state
        setRecentProducts(productDetails.filter(product => product !== null));
      } catch (error) {
        console.error('Error loading recently viewed products:', error);
        setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadRecentlyViewed();
  }, []);

  // Don't render if there are no recently viewed products
  if (recentProducts.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center">
          <FaEye className="mr-2 text-[#363a94]" />
          Recently Viewed
        </h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="bg-gray-200 animate-pulse h-48 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <Swiper
          modules={[Navigation]}
          spaceBetween={16}
          slidesPerView={1}
          navigation={true}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
            768: { slidesPerView: 3, spaceBetween: 16 },
            1024: { slidesPerView: 4, spaceBetween: 16 },
            1280: { slidesPerView: 5, spaceBetween: 16 },
          }}
          className="recent-products-slider"
        >
          {recentProducts.map((product) => (
            <SwiperSlide key={product._id}>
              <motion.div
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
              >
                <Link to={`/products/${product._id}`} className="block">
                  <div className="h-40 overflow-hidden">
                    <ImageLoader
                      src={product.image || 'https://via.placeholder.com/400x300'}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                </Link>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      <style jsx="true">{`
        .recent-products-slider .swiper-button-next,
        .recent-products-slider .swiper-button-prev {
          color: #363a94;
          background: rgba(255, 255, 255, 0.85);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          --swiper-navigation-size: 16px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          opacity: 0;
          transition: all 0.3s ease;
        }
        
        .recent-products-slider:hover .swiper-button-next,
        .recent-products-slider:hover .swiper-button-prev {
          opacity: 1;
        }
        
        .recent-products-slider .swiper-button-next:hover,
        .recent-products-slider .swiper-button-prev:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

// Helper function to add a product to recently viewed (to be used on product detail pages)
export const addToRecentlyViewed = (productId) => {
  try {
    if (!productId) return;
    
    // Get current list
    const currentList = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    // Remove the product if it's already in the list
    const filteredList = currentList.filter(id => id !== productId);
    
    // Add product to the beginning of the list
    const newList = [productId, ...filteredList].slice(0, MAX_RECENT_PRODUCTS);
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
  }
};

export default RecentlyViewed; 