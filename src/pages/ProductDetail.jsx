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

  // Handle going back
  const handleGoBack = () => {
    navigate(-1);
  };

  // Fetch product details (logic unchanged)
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        console.log("Fetching details for product id:", id);
        const url = `${import.meta.env.VITE_API_BASE_URL}/products/${id}`;
        console.log("Fetching from URL:", url);

        let headers = { 'Content-Type': 'application/json' };
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { method: 'GET', headers });
        console.log("Response status:", response.status);

        if (response.status === 404) {
          toast.error('This product is currently not available.');
          navigate('/products');
          return;
        }

        const responseText = await response.text();
        console.log("Raw response:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
          if (response.ok) {
            console.log("Fetched product data:", data);
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
          console.error("Error parsing response:", parseError);
          throw new Error(`Failed to parse server response: ${responseText}`);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching product:", err);
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

  // Fetch recommendations (logic unchanged)
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
        .catch((err) => console.error("Error fetching recommendations:", err));
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

  // Cart functions
  const handleCartAction = async () => {
    setProcessing(true);
    try {
      if (inCart) {
        await removeFromCart(product._id);
        toast.success('Product removed from cart');
      } else {
        await addToCart(product, quantity);
        toast.success('Product added to cart');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle quantity change
  const handleQuantityChange = async (newQuantity) => {
    const minOrder = product?.minOrder || 1;
    const validatedQuantity = Math.max(minOrder, newQuantity);
    setQuantity(validatedQuantity);

    if (inCart) {
      try {
        const token = await user.getIdToken();
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/cart/${product._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ quantity: validatedQuantity }),
        });
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  // Check email verification status
  useEffect(() => {
    if (user) {
      setIsEmailVerified(user.emailVerified);
    }
  }, [user]);

  // Handle sending verification email
  const handleSendVerification = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user || sendingVerification) return;
    
    setSendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      toast.error('Failed to send verification email. Please try again later.');
      console.error('Error sending verification email:', error);
    } finally {
      setSendingVerification(false);
    }
  };

  // Add a function to handle wishlist toggle
  const handleWishlistToggle = () => {
    if (product) {
      toggleWishlist(product._id);
      setIsInUserWishlist(!isInUserWishlist);
      if (!isInUserWishlist) {
        toast.success('Added to wishlist!');
      } else {
        toast.success('Removed from wishlist');
      }
    }
  };

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mouse move for zoom functionality
  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    
    // Use touch coordinates for mobile devices
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    
    // Calculate position as percentage
    const x = Math.max(0, Math.min(1, (clientX - left) / width));
    const y = Math.max(0, Math.min(1, (clientY - top) / height));
    
    setZoomPosition({ x, y });
  };

  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    if (isMobile) {
      setIsZooming(true);
      handleMouseMove(e);
    }
  };
  
  const handleTouchMove = (e) => {
    if (isMobile && isZooming) {
      handleMouseMove(e);
      // Prevent page scrolling while zooming
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = () => {
    if (isMobile) {
      setIsZooming(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center mt-24" >
        <Helmet>
          <title>Loading Product... | Beauty Lab Cosmetic Products</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#363a94] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Helmet>
          <title>Error | Beauty Lab Cosmetic Products</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-red-100 rounded-full">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={handleGoBack}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#363a94] hover:bg-[#2a2d73]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Product not found state
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Helmet>
          <title>Product Not Found | Beauty Lab Cosmetic Products</title>
          <meta name="robots" content="noindex" />
          <meta name="description" content="The requested product could not be found. Browse our complete collection of Korean skincare products." />
        </Helmet>
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-gray-100 rounded-full">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Product not found</h2>
          <p className="mt-2 text-gray-600">We couldn't find the product you're looking for.</p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#363a94] hover:bg-[#2a2d73]"
          >
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  // Render the product detail page
  return (
    <div className="bg-gray-50 min-h-screen" itemScope itemType="https://schema.org/Product">
      <Toaster position="bottom-right" />
      
      <Helmet>
        <title>{`${product.name} | Korean Skincare | Beauty Lab`}</title>
        <meta name="description" content={`${product.description?.substring(0, 160)}...`} />
        <meta name="keywords" content={`${product.name}, ${product.category}, Korean skincare, beauty products, professional skincare`} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://beautylab.ph/products/${product._id}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.name} | Korean Skincare`} />
        <meta property="og:description" content={product.description?.substring(0, 160)} />
        <meta property="og:image" content={product.images?.[0] || product.image} />
        <meta property="og:url" content={`https://beautylab.ph/products/${product._id}`} />
        <meta property="product:price:amount" content={product.price} />
        <meta property="product:price:currency" content="PHP" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | Korean Skincare`} />
        <meta name="twitter:description" content={product.description?.substring(0, 160)} />
        <meta name="twitter:image" content={product.images?.[0] || product.image} />
        
        {/* Product availability */}
        <meta name="product:availability" content={product.stock > 0 ? "in stock" : "out of stock"} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(generateProductSchema(product))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateBreadcrumbSchema(product))}
        </script>
      </Helmet>
      
      {/* Breadcrumb & Navigation - Add pt-16 to create space below the fixed header */}
      <div className="bg-white border-b border-gray-200 pt-16 mt-1 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
            <button 
              onClick={handleGoBack}
              className="inline-flex items-center hover:text-[#363a94] transition-colors font-medium"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <span className="mx-2 text-gray-400">/</span>
            <Link to="/products" className="hover:text-[#363a94] transition-colors">Products</Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link to={`/products?category=${product.category}`} className="hover:text-[#363a94] transition-colors">{product.category}</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="font-medium text-[#363a94] truncate max-w-xs" aria-current="page">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Images */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8 lg:mb-0"
          >
            {/* Main Image with Zoom Functionality */}
            <div 
              ref={imageContainerRef}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 aspect-square mb-4 border border-gray-100 relative"
              onMouseEnter={() => !isMobile && setIsZooming(true)}
              onMouseLeave={() => !isMobile && setIsZooming(false)}
              onMouseMove={!isMobile ? handleMouseMove : undefined}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="wait">
                <motion.div 
                  className="w-full h-full flex items-center justify-center p-4"
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  <motion.img
                    src={
                      Array.isArray(product?.images) && product.images.length > 0
                        ? product.images[selectedImage]
                        : product?.image || 'https://placehold.co/500x500?text=Product+Image'
                    }
                    alt={product?.name}
                    className="w-full h-full object-contain"
                    itemProp="image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/500x500?text=Product+Image';
                    }}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
              </AnimatePresence>
              
              {/* Zoom Lens Overlay */}
              {isZooming && (
                <div 
                  className="absolute inset-0 pointer-events-none bg-white/5"
                  style={{
                    backgroundImage: `url(${Array.isArray(product?.images) && product.images.length > 0
                      ? product.images[selectedImage]
                      : product?.image || 'https://placehold.co/500x500?text=Product+Image'})`,
                    backgroundPosition: `${zoomPosition.x * 100}% ${zoomPosition.y * 100}%`,
                    backgroundSize: `${zoomLevel * 100}%`,
                    backgroundRepeat: "no-repeat"
                  }}
                />
              )}
            </div>

            {/* Zoom hint overlay - Show different messages for mobile/desktop */}
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-sm text-gray-600 text-xs font-medium flex items-center space-x-1.5 opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{isMobile ? "Tap to zoom" : "Hover to zoom"}</span>
            </div>

            {/* Thumbnail Gallery - Only show if there are multiple images */}
            {Array.isArray(product?.images) && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {product.images.map((image, index) => (
                  <motion.button
                    key={`thumb-${index}`}
                    onClick={() => setSelectedImage(index)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative aspect-square rounded-lg overflow-hidden shadow-sm group ${
                      selectedImage === index 
                        ? 'ring-2 ring-[#363a94] ring-offset-1'
                        : 'ring-1 ring-gray-200 hover:ring-[#363a94]/50'
                    }`}
                    initial={{ opacity: 0.8 }}
                    animate={{ 
                      opacity: selectedImage === index ? 1 : 0.8,
                      scale: selectedImage === index ? 1 : 0.95
                    }}
                    transition={{ duration: 0.2 }}
                    aria-label={`View image ${index + 1} of ${product.name}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - View ${index + 1}`}
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        selectedImage === index ? 'scale-105' : 'group-hover:scale-110'
                      }`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/100x100?text=Image';
                      }}
                    />
                    {selectedImage === index && (
                      <motion.div 
                        className="absolute inset-0 bg-[#363a94] bg-opacity-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex justify-end mt-2">
              <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 px-3 py-1.5">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(1.5, prev - 0.5))}
                  className="text-gray-600 hover:text-gray-900 transition-colors p-1"
                  disabled={zoomLevel <= 1.5}
                  aria-label="Decrease zoom level"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-xs font-medium mx-2 text-gray-600">{zoomLevel}x</span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.5))}
                  className="text-gray-600 hover:text-gray-900 transition-colors p-1"
                  disabled={zoomLevel >= 4}
                  aria-label="Increase zoom level"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 lg:mt-0"
          >
            {/* Product Header */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-[#363a94]/10 to-[#5a60c0]/10 text-[#363a94] border border-[#363a94]/10"
                  itemProp="category"
                >
                  {product.category}
                </span>
                {product.active === false || product.status === 'inactive' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1.5"></span>
                    Inactive
                  </span>
                ) : product.stock > 0 ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                    <meta itemProp="availability" content="https://schema.org/InStock" />
                    In Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                    <meta itemProp="availability" content="https://schema.org/OutOfStock" />
                    Out of Stock
                  </span>
                )}
              </div>

              <h1 
                className="text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-4" 
                itemProp="name"
              >
                {product.name}
              </h1>
              
              <div className="mt-6">
                {user && user.emailVerified ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1">Price</span>
                    <span 
                      className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#363a94] to-[#5a60c0] bg-clip-text text-transparent" 
                      itemProp="offers" 
                      itemScope 
                      itemType="https://schema.org/Offer"
                    >
                      <meta itemProp="priceCurrency" content="PHP" />
                      <span itemProp="price" content={product.price}>₱{product.price.toLocaleString()}</span>
                      <link itemProp="availability" href={product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
                    </span>
                  </div>
                ) : (
                  <div className="text-gray-700 bg-gray-50 border border-gray-200 p-5 rounded-lg shadow-sm">
                    <div className="flex items-start mb-3">
                      <FaLock className="mr-2 text-[#363a94] mt-1 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-gray-800">Price hidden</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {user ? 'Verify your email to see wholesale pricing' : 'Login to view wholesale pricing'}
                        </p>
                      </div>
                    </div>
                    {user ? (
                      <button
                        onClick={handleSendVerification}
                        disabled={sendingVerification}
                        className={`w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center transition-all ${
                          sendingVerification 
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-[#363a94] to-[#5a60c0] text-white hover:shadow-md hover:from-[#2a2e75] hover:to-[#444bb0]'
                        }`}
                      >
                        {sendingVerification ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </div>
                        ) : (
                          <>
                            <MdEmail className="mr-2" aria-hidden="true" />
                            Send Verification Email
                          </>
                        )}
                      </button>
                    ) : (
                      <Link 
                        to="/login" 
                        className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-[#363a94] to-[#5a60c0] text-white rounded-lg text-sm font-medium flex items-center justify-center hover:shadow-md hover:from-[#2a2e75] hover:to-[#444bb0] transition-all"
                      >
                        Sign in to View Price
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs for product info */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px space-x-8" role="tablist">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === 'description'
                        ? 'border-[#363a94] text-[#363a94]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'description'}
                    aria-controls="description-panel"
                    id="description-tab"
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab('features')}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === 'features'
                        ? 'border-[#363a94] text-[#363a94]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'features'}
                    aria-controls="features-panel"
                    id="features-tab"
                  >
                    Features
                  </button>
                  <button
                    onClick={() => setActiveTab('market')}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === 'market'
                        ? 'border-[#363a94] text-[#363a94]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'market'}
                    aria-controls="market-panel"
                    id="market-tab"
                  >
                    Target Market
                  </button>
                </nav>
              </div>

              <div className="py-5">
                <AnimatePresence mode="wait">
                  {activeTab === 'description' && (
                    <motion.div
                      key="description"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="prose prose-gray max-w-none text-gray-600 leading-relaxed"
                      id="description-panel"
                      role="tabpanel"
                      aria-labelledby="description-tab"
                      itemProp="description"
                    >
                      <p className="text-base leading-relaxed">{product.description}</p>
                    </motion.div>
                  )}

                  {activeTab === 'features' && (
                    <motion.div
                      key="features"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      id="features-panel"
                      role="tabpanel"
                      aria-labelledby="features-tab"
                      className="rounded-lg bg-gray-50/50 p-5 border border-gray-100"
                    >
                      <ul className="space-y-4 divide-y divide-gray-100" itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                        <meta itemProp="name" content="Product Features" />
                        {(() => {
                          const keyFeatures =
                            Array.isArray(product.targetMarketKeyFeatures) &&
                            product.targetMarketKeyFeatures.length > 0
                              ? product.targetMarketKeyFeatures
                              : Array.isArray(product.features)
                              ? product.features
                              : [];
                          return keyFeatures
                            .filter((feature) => feature && feature.trim() !== '')
                            .map((feature, index) => (
                              <li
                                key={`feature-${index}`}
                                className={`flex items-start gap-3 pt-4 ${index === 0 ? 'pt-0' : ''}`}
                              >
                                <span className="flex-shrink-0 mt-1">
                                  <svg className="h-5 w-5 text-[#5256b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                                <span className="text-gray-700 text-base" itemProp="value">{feature.trim()}</span>
                              </li>
                            ));
                        })()}
                      </ul>
                    </motion.div>
                  )}

                  {activeTab === 'market' && (
                    <motion.div
                      key="market"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      id="market-panel"
                      role="tabpanel"
                      aria-labelledby="market-tab"
                      className="rounded-lg bg-gray-50/50 p-5 border border-gray-100"
                    >
                      <ul className="space-y-3 divide-y divide-gray-100">
                        {product.targetMarket && product.targetMarket.map((market, index) => (
                          <li key={`market-${index}`} className={`flex items-center gap-3 pt-3 ${index === 0 ? 'pt-0' : ''}`}>
                            <span className="flex-shrink-0 p-1 bg-[#363a94]/10 rounded-full">
                              <svg className="h-4 w-4 text-[#363a94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                            <span className="text-gray-700 text-base">{market}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Minimum Order</p>
                  <p className="text-lg font-medium text-gray-900">{product.minOrder} pcs</p>
                </div>
                {user && (
                  <div>
                    <p className="text-sm text-gray-500">Available Stock</p>
                    <p className={`text-lg font-medium ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                      {product.stock || "Out of stock"}
                    </p>
                  </div>
                )}
              </div>

              {user ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-gray-700 font-medium">Quantity:</span>
                    <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden shadow-sm">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= product.minOrder}
                        className="px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 transition-colors text-gray-600 border-r border-gray-200"
                        aria-label="Decrease quantity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </motion.button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || product.minOrder;
                          handleQuantityChange(Math.max(product.minOrder, newValue));
                        }}
                        min={product.minOrder}
                        className="w-16 text-center border-none focus:ring-0 focus:outline-none font-medium"
                        aria-label="Quantity"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 border-l border-gray-200"
                        aria-label="Increase quantity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                        </svg>
                      </motion.button>
                    </div>

                    {user.emailVerified && (
                      <div className="ml-auto text-gray-700 font-medium">
                        Total: 
                        <span className="ml-1 text-[#363a94] font-bold">
                          ₱{(product.price * quantity).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-4 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCartAction}
                      disabled={processing || !isEmailVerified}
                      className={`flex-1 py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2 shadow-sm ${
                        inCart 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white' 
                          : 'bg-gradient-to-r from-[#363a94] to-[#5a60c0] hover:from-[#2a2d73] hover:to-[#4950a3] text-white'
                      } transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#363a94] disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {processing ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{inCart ? 'Removing...' : 'Adding...'}</span>
                        </div>
                      ) : inCart ? (
                        <>
                          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove from Cart
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Add to Cart
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleWishlistToggle}
                      className="flex items-center justify-center p-3 border-2 border-gray-300 rounded-lg hover:border-[#363a94] transition-all bg-white shadow-sm"
                      aria-label={isInUserWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <motion.div
                        animate={isInUserWishlist ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <FaHeart 
                          className={isInUserWishlist ? "text-red-500" : "text-gray-400"} 
                          size={22} 
                        />
                      </motion.div>
                    </motion.button>
                  </div>
                </>
              ) : (
                <div className="text-center bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-700 mb-4">Log in to place orders and access wholesale pricing.</p>
                  <Link to="/login">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 bg-gradient-to-r from-[#363a94] to-[#5a60c0] hover:from-[#2a2d73] hover:to-[#4950a3] text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Log in to Access Wholesale Pricing
                    </motion.button>
                  </Link>
                  <Link to="/signup" className="block mt-3 text-[#363a94] hover:underline text-sm">
                    New customer? Create an account
                  </Link>
                </div>
              )}
            </div>

            {/* Help & Support */}
            <div className="bg-gradient-to-r from-[#363a94]/5 to-[#5a60c0]/5 rounded-lg p-5 flex items-center gap-4 border border-[#363a94]/10">
              <div className="p-2.5 rounded-full bg-[#363a94]/10 flex-shrink-0">
                <svg className="w-5 h-5 text-[#363a94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Need help with this product?</p>
                <div className="mt-1 flex items-center space-x-3">
                  <Link
                    to="/faq"
                    className="text-sm text-[#363a94] hover:text-[#5a60c0] font-medium hover:underline flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View FAQs
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    to="/contact"
                    className="text-sm text-[#363a94] hover:text-[#5a60c0] font-medium hover:underline flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Email Verification Notice - Only show if user is logged in but not verified */}
            {user && !isEmailVerified && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Verify your email</h3>
                    <div className="mt-1 text-sm text-amber-700">
                      <p>To access all features including checkout, please verify your email address.</p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={handleSendVerification}
                        disabled={sendingVerification}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium inline-flex items-center ${
                          sendingVerification 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        } transition-colors`}
                      >
                        {sendingVerification ? (
                          <>
                            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <MdEmail className="mr-1.5" aria-hidden="true" />
                            Send Verification Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Related Products Sections */}
        <div className="mt-12 sm:mt-16 space-y-12 sm:space-y-16">
          {/* People Also Bought */}
          {recommendedProducts.peopleBought.length > 0 && (
            <section aria-labelledby="related-heading">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 id="related-heading" className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <span className="hidden sm:block w-8 h-1 bg-[#363a94] rounded-full mr-3"></span>
                  <span className="block sm:hidden w-4 h-1 bg-[#363a94] rounded-full mr-2"></span>
                  Frequently Bought Together
                </h2>
                <Link to="/products" className="text-sm font-medium text-[#363a94] hover:text-[#5a60c0] hover:underline flex items-center">
                  View all 
                  <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-x-6 sm:gap-y-10">
                {recommendedProducts.peopleBought.map((prod) => (
                  <motion.div
                    key={prod._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5, transition: { duration: 0.3 } }}
                    className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    itemScope
                    itemType="https://schema.org/Product"
                    itemProp="isRelatedTo"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={prod.image}
                        alt={`${prod.name} - related product`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        itemProp="image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300x300?text=Product';
                        }}
                      />
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="text-sm sm:text-lg font-medium text-gray-900 line-clamp-2 min-h-[2.5rem] sm:min-h-[3.5rem]">
                        <Link to={`/products/${prod._id}`} aria-label={`View details for ${prod.name}`}>
                          <span className="absolute inset-0" aria-hidden="true" />
                          <span itemProp="name">{prod.name}</span>
                        </Link>
                      </h3>
                      <div className="mt-2">
                        {user ? (
                          <p className="text-[#363a94] font-semibold bg-[#363a94]/5 inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                            <meta itemProp="priceCurrency" content="PHP" />
                            <span itemProp="price" content={prod.price}>₱{prod.price.toLocaleString()}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-gray-500 text-xs sm:text-sm italic">
                            Login for wholesale pricing
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* You Might Like */}
          {recommendedProducts.mightLike.length > 0 && (
            <section aria-labelledby="suggestions-heading">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 id="suggestions-heading" className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <span className="hidden sm:block w-8 h-1 bg-[#363a94] rounded-full mr-3"></span>
                  <span className="block sm:hidden w-4 h-1 bg-[#363a94] rounded-full mr-2"></span>
                  You Might Also Like
                </h2>
                <Link to="/products" className="text-sm font-medium text-[#363a94] hover:text-[#5a60c0] hover:underline flex items-center">
                  View all 
                  <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-x-6 sm:gap-y-10">
                {recommendedProducts.mightLike.map((prod) => (
                  <motion.div
                    key={prod._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5, transition: { duration: 0.3 } }}
                    className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    itemScope
                    itemType="https://schema.org/Product"
                    itemProp="isRelatedTo"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={prod.image}
                        alt={`${prod.name} - suggested product`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        itemProp="image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300x300?text=Product';
                        }}
                      />
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="text-sm sm:text-lg font-medium text-gray-900 line-clamp-2 min-h-[2.5rem] sm:min-h-[3.5rem]">
                        <Link to={`/products/${prod._id}`} aria-label={`View details for ${prod.name}`}>
                          <span className="absolute inset-0" aria-hidden="true" />
                          <span itemProp="name">{prod.name}</span>
                        </Link>
                      </h3>
                      <div className="mt-2">
                        {user ? (
                          <p className="text-[#363a94] font-semibold bg-[#363a94]/5 inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                            <meta itemProp="priceCurrency" content="PHP" />
                            <span itemProp="price" content={prod.price}>₱{prod.price.toLocaleString()}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-gray-500 text-xs sm:text-sm italic">
                            Login for wholesale pricing
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;