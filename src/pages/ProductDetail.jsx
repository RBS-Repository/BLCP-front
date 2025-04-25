import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { FaLock, FaHeart } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

// Generate structured data for product
const generateProductSchema = (product) => {
  if (!product) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.images?.[0] || product.image,
    "sku": product._id,
    "brand": {
      "@type": "Brand",
      "name": "Beauty Lab Cosmetic Products"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://beautylab.ph/products/${product._id}`,
      "priceCurrency": "PHP",
      "price": product.price,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Beauty Lab Cosmetic Products"
      }
    },
    "category": product.category
  };
};

// Generate breadcrumb schema for product page
const generateBreadcrumbSchema = (product) => {
  if (!product) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://beautylab.ph"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": "https://beautylab.ph/products"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.category,
        "item": `https://beautylab.ph/products?category=${product.category}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": product.name,
        "item": `https://beautylab.ph/products/${product._id}`
      }
    ]
  };
};

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState({
    peopleBought: [],
    mightLike: [],
    sameBrand: [],
  });
  const [quantity, setQuantity] = useState(1);
  const { cartItems, addToCart, removeFromCart } = useCart();
  const [inCart, setInCart] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isInUserWishlist, setIsInUserWishlist] = useState(false);
  
  // New state for image zoom functionality
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(2); // Zoom magnification level
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  // New state for variations
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [availableVariations, setAvailableVariations] = useState([]);

  // Handle going back
  const handleGoBack = () => {
    navigate(-1);
  };

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/products/${id}`;
        
        let headers = { 'Content-Type': 'application/json' };
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { method: 'GET', headers });

        if (response.status === 404) {
          toast.error('This product is currently not available.');
          navigate('/products');
          return;
        }

        const responseText = await response.text();
        
        let data;
        try {
          data = JSON.parse(responseText);
          if (response.ok) {
            if (data) {
              // Ensure product has an images array even if none are defined
              if (!data.images || !Array.isArray(data.images)) {
                data.images = [];
              }
              
              // If there's a main image but it's not in the images array, add it
              if (data.image && !data.images.includes(data.image)) {
                data.images = [data.image, ...data.images];
              }
              
              // If there's no images at all, create an empty array
              if (!data.images.length && !data.image) {
                data.images = [];
              }
            }
            setProduct(data);
            setQuantity(data.minOrder);
          } else {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
          }
        } catch (parseError) {
          throw new Error(`Failed to parse server response: ${responseText}`);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        
        // Redirect if error indicates product unavailability
        if (err.message.includes('not available') || err.message.includes('not found')) {
          toast.error('This product is currently not available.');
          navigate('/products');
        }
      }
    };
    fetchProduct();
  }, [id, user, navigate]);

  // Fetch recommendations
  useEffect(() => {
    if (product) {
      Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/products?price=${product.price}&limit=8`),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/products?category=${product.category}&limit=8`),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/products?category=${product.category}&limit=8`),
      ])
        .then((res) => Promise.all(res.map((r) => r.json())))
        .then(([peopleBought, mightLike, sameBrand]) => {
          // Fix filtering to match the field used in your backend
          const filterActiveProducts = (products) => 
            products
              .filter(p => p._id !== product._id && (p.status === 'active' || p.active === true))
              .slice(0, 4);
              
          setRecommendedProducts({
            peopleBought: filterActiveProducts(peopleBought),
            mightLike: filterActiveProducts(mightLike),
            sameBrand: filterActiveProducts(sameBrand),
          });
        })
        .catch(() => {
          // Silently handle recommendation errors
        });
    }
  }, [product]);

  // Update inCart state
  useEffect(() => {
    if (product && cartItems) {
      const exists = cartItems.some(item => {
        const cartItemId = item.product?._id?.toString() || item.product?.toString();
        const productId = product._id?.toString();
        return cartItemId === productId;
      });
      setInCart(prev => exists !== prev ? exists : prev);
    }
  }, [cartItems, product]);

  // Check if the product is in wishlist
  useEffect(() => {
    if (product) {
      setIsInUserWishlist(isInWishlist(product._id));
    }
  }, [product, isInWishlist]);

  // Function to determine if all options are selected
  const allOptionsSelected = () => {
    if (!product?.hasVariations) return true;
    
    // Check if all variation types have a selected option
    return product.variationTypes.every(type => 
      selectedOptions[type.name] !== undefined
    );
  };

  // Function to find the matching variation based on selected options
  const findMatchingVariation = () => {
    if (!product?.hasVariations || !allOptionsSelected()) return null;
    
    // Find the variation that matches all selected options
    return product.variations.find(variation => {
      // Check if all option values match
      return Object.entries(selectedOptions).every(([typeName, optionName]) => {
        return variation.optionValues[typeName] === optionName;
      });
    });
  };

  // Update selected variation when options change
  useEffect(() => {
    if (product?.hasVariations) {
      const matchingVariation = findMatchingVariation();
      setSelectedVariation(matchingVariation);
    }
  }, [selectedOptions, product]);

  // Handle option selection
  const handleOptionSelect = (typeName, optionName) => {
    setSelectedOptions(prev => ({
      ...prev,
      [typeName]: optionName
    }));
  };

  // Get available options for a specific variation type
  const getAvailableOptions = (typeName) => {
    if (!product?.hasVariations) return [];
    
    // Find the variation type
    const variationType = product.variationTypes.find(vt => vt.name === typeName);
    if (!variationType) return [];
    
    return variationType.options.map(opt => opt.name);
  };

  // Initialize the product variations when product loads
  useEffect(() => {
    if (product?.hasVariations) {
      // Initialize available variations
      setAvailableVariations(product.variations);
      
      // Clear selected options
      setSelectedOptions({});
      
      // Log initialization
      if (import.meta.env.DEV) {
        // Only log in development
        setSelectedVariation(null);
      }
    }
  }, [product]);

  // Get product price based on selected variation
  const getPrice = () => {
    if (!product) return 0;
    
    // If product has variations and a variation is selected
    if (product.hasVariations && selectedVariation) {
      return selectedVariation.price;
    }
    
    // If product has variations but no variation is selected
    if (product.hasVariations && !selectedVariation) {
      // Find the lowest price among all variations
      const prices = product.variations.map(v => v.price);
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      
      // If prices vary, return a range
      if (lowestPrice !== highestPrice) {
        return { min: lowestPrice, max: highestPrice };
      }
      
      // If all variations have the same price
      return lowestPrice;
    }
    
    // Default to base product price
    return product.price;
  };

  // Get product stock based on selected variation
  const getStock = () => {
    if (!product) return 0;
    
    // If product has variations and a variation is selected
    if (product.hasVariations && selectedVariation) {
      return selectedVariation.stock;
    }
    
    // If product has variations but no variation is selected
    if (product.hasVariations && !selectedVariation) {
      // Get total stock across all variations
      return product.variations.reduce((total, variation) => total + variation.stock, 0);
    }
    
    // Default to base product stock
    return product.stock;
  };

  // Add or remove from cart based on current state
  const handleCartAction = async () => {
    if (!user) {
      toast.error('Please log in to add items to your cart');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }

    // Check if options are selected for product with variations
    if (product.hasVariations && !allOptionsSelected()) {
      toast.error('Please select all options before adding to cart');
      return;
    }

    // Check for email verification if required
    const requireVerification = true; // This could be a config setting
    if (requireVerification && user && !user.emailVerified) {
      toast.error('Please verify your email to add items to cart');
      // Show verify email UI
      setIsEmailVerified(false);
      return;
    }

    try {
      setProcessing(true);
      
      if (inCart) {
        // Find the cart item
        const cartItem = cartItems.find(item => {
          const cartItemId = item.product?._id?.toString() || item.product?.toString();
          const productId = product._id?.toString();
          return cartItemId === productId;
        });
        
        if (cartItem) {
          await removeFromCart(cartItem._id);
          toast.success('Removed from cart');
        }
      } else {
        // Create the payload for adding to cart
        const cartPayload = {
          productId: product._id,
          quantity: quantity
        };
        
        // Add variation selection if applicable
        if (product.hasVariations && selectedVariation) {
          cartPayload.variationId = selectedVariation._id;
        }
        
        await addToCart(cartPayload);
        toast.success('Added to cart');
      }
    } catch (error) {
      toast.error(error.message || 'Error updating cart');
    } finally {
      setProcessing(false);
    }
  };

  // Handle quantity change
  const handleQuantityChange = async (newQuantity) => {
    // Validate against minimum order
    const minOrder = product ? product.minOrder || 1 : 1;
    if (newQuantity < minOrder) {
      toast.error(`Minimum order is ${minOrder}`);
      return;
    }
    
    // Validate against stock
    const stock = getStock();
    if (newQuantity > stock) {
      toast.error(`Maximum available quantity is ${stock}`);
      return;
    }
    
    // Update quantity state
    setQuantity(newQuantity);
    
    // If already in cart, update the cart quantity
    if (inCart) {
      try {
        setProcessing(true);
        // Find the cart item
        const cartItem = cartItems.find(item => {
          const cartItemId = item.product?._id?.toString() || item.product?.toString();
          const productId = product._id?.toString();
          return cartItemId === productId;
        });
        
        if (cartItem) {
          // Update the cart with new quantity
          // This depends on your cart context implementation
        }
      } catch (error) {
        toast.error('Error updating quantity');
      } finally {
        setProcessing(false);
      }
    }
  };

  // Send email verification
  const handleSendVerification = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in first');
      navigate('/login');
      return;
    }
    
    try {
      setSendingVerification(true);
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent');
    } catch (error) {
      toast.error('Error sending verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  // Handle wishlist toggling
  const handleWishlistToggle = () => {
    if (!user) {
      toast.error('Please log in to add items to your wishlist');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    
    toggleWishlist(product);
    setIsInUserWishlist(prev => !prev);
    toast.success(isInUserWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  // Check mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      const portrait = window.innerHeight > window.innerWidth;
      setIsMobile(mobile);
      setIsPortrait(portrait);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mouse move for zoom
  const handleMouseMove = (e) => {
    if (!isZooming || isMobile || !imageContainerRef.current) return;
    
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the container (0 to 1)
    const relativeX = Math.max(0, Math.min(1, (e.clientX - left) / width));
    const relativeY = Math.max(0, Math.min(1, (e.clientY - top) / height));
    
    // Update zoom position
    setZoomPosition({
      x: relativeX,
      y: relativeY
    });
  };

  // Handle touch zoom for mobile
  const handleTouchStart = (e) => {
    if (isMobile && e.touches.length === 1) {
      setIsZooming(true);
    }
  };

  const handleTouchMove = (e) => {
    if (isZooming && isMobile && e.touches.length === 1 && imageContainerRef.current) {
      const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      
      const relativeX = Math.max(0, Math.min(1, (touch.clientX - left) / width));
      const relativeY = Math.max(0, Math.min(1, (touch.clientY - top) / height));
      
      setZoomPosition({ x: relativeX, y: relativeY });
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      setIsZooming(false);
    }
  };

  // Rest of the component implementation
  // ...

  // Function to initialize product variations - no defaults selected
  if (product?.hasVariations && !selectedVariation) {
    // This would be removed in production
  }

  // Rest of the component JSX
  // ...
};

const ExpandableDescription = ({ description }) => {
  const [expanded, setExpanded] = useState(false);
  const MAX_LENGTH = 300; // Characters to show in collapsed state
  
  if (!description || description.length <= MAX_LENGTH) {
    return (
      <div>
        {description && description.split('\n').map((paragraph, index) => (
          paragraph.trim() ? (
            <p key={`desc-para-${index}`} className="text-base leading-relaxed mb-4 break-words">
              {paragraph}
            </p>
          ) : <br key={`desc-break-${index}`} />
        ))}
      </div>
    );
  }
  
  return (
    <div>
      <div 
        className={`transition-all duration-500 ${
          !expanded 
            ? 'max-h-[300px] overflow-hidden relative' 
            : 'max-h-[400px] overflow-auto custom-scrollbar rounded-lg bg-gray-50/50 border border-gray-100 p-4'
        }`}
      >
        {description.split('\n').map((paragraph, index) => (
          paragraph.trim() ? (
            <p key={`desc-para-${index}`} className="text-base leading-relaxed mb-4 break-words">
              {paragraph}
            </p>
          ) : <br key={`desc-break-${index}`} />
        ))}
        
        {!expanded && (
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent"></div>
        )}
      </div>
      
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
      >
        {expanded ? 'Show Less' : 'Read More'}
        <svg className={`ml-1 w-4 h-4 transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #b7b9e0;
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #363a94;
        }

        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #b7b9e0 #f1f1f1;
        }

        /* Ensure padding for browsers with permanent scrollbars */
        .custom-scrollbar {
          padding-right: 10px;
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;