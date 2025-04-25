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

  // Function to determine if all options are selected
  const allOptionsSelected = () => {
    if (!product?.hasVariations) return true;
    
    // Check if all variation types have a selected option
    return product.variationTypes.every(type => 
      selectedOptions[type.name] !== undefined
    );
  };

  // Function to find matching variation based on selected options
  const findMatchingVariation = () => {
    if (!product?.hasVariations || !allOptionsSelected()) return null;
    
    // Find a variation that matches all selected options
    return product.variations.find(variation => {
      // Make sure we handle both Map and plain object formats for optionValues
      for (const [typeName, optionName] of Object.entries(selectedOptions)) {
        const optionValues = variation.optionValues || {};
        const varOptionValue = optionValues[typeName];
        
        // If any option doesn't match, this isn't the right variation
        if (varOptionValue !== optionName) {
          return false;
        }
      }
      
      // All options matched
      return true;
    });
  };

  // Handle option selection
  const handleOptionSelect = (typeName, optionName) => {
    console.log(`Selecting ${typeName}: ${optionName}`);
    
    // Update selected options
    setSelectedOptions(prev => {
      const newOptions = { ...prev, [typeName]: optionName };
      console.log('New selected options:', newOptions);
      return newOptions;
    });
  };

  // Get available options for a specific variation type based on current selections
  const getAvailableOptions = (typeName) => {
    if (!product?.hasVariations) return [];
    
    // Create a copy of all variations to work with
    const variations = [...product.variations];
    
    // Filter variations that match current selections (excluding the current type)
    const compatibleVariations = variations.filter(variation => {
      // For each selected option (except the one we're finding options for)
      for (const [currentTypeName, selectedOption] of Object.entries(selectedOptions)) {
        // Skip the type we're currently finding options for
        if (currentTypeName === typeName) continue;
        
        // Get the option value from this variation
        const optionValues = variation.optionValues || {};
        const varOptionValue = optionValues[currentTypeName];
        
        // If this variation doesn't match our current selection, exclude it
        if (varOptionValue !== selectedOption) {
          return false;
        }
      }
      return true;
    });
    
    // Extract all available options for this type from compatible variations
    const availableOptions = new Set();
    
    compatibleVariations.forEach(variation => {
      const optionValues = variation.optionValues || {};
      const optionValue = optionValues[typeName];
      
      if (optionValue) {
        availableOptions.add(optionValue);
      }
    });
    
    return Array.from(availableOptions);
  };

  // Modified price getter to account for variations and partial selections
  const getPrice = () => {
    if (product?.hasVariations) {
      // If all options are selected, try to find an exact matching variation
      if (allOptionsSelected()) {
        const matchingVariation = findMatchingVariation();
        if (matchingVariation) {
          return matchingVariation.price;
        }
      }
      
      // If no exact match or incomplete selection, calculate price adjustments
      if (Object.keys(selectedOptions).length > 0 && product.variationTypes) {
        let adjustedPrice = product.price;
        
        // Add price adjustments for each selected option
        Object.entries(selectedOptions).forEach(([typeName, optionName]) => {
          // Find the variation type
          const variationType = product.variationTypes.find(type => type.name === typeName);
          if (variationType) {
            // Find the selected option
            const option = variationType.options.find(opt => opt.name === optionName);
            if (option && option.priceAdjustment) {
              adjustedPrice += option.priceAdjustment;
            }
          }
        });
        
        return adjustedPrice;
      }
      
      // Default to base price if no selections or adjustments
      return product.price;
    }
    return product?.price || 0;
  };

  const getStock = () => {
    if (product?.hasVariations && selectedVariation) {
      return selectedVariation.stock;
    }
    return product?.stock || 0;
  };

  // Modified useEffect to update selected variation when options change
  useEffect(() => {
    if (product?.hasVariations) {
      const matchingVariation = findMatchingVariation();
      setSelectedVariation(matchingVariation);
      
      // If we have a selected variation and it has its own image, show it
      if (matchingVariation && matchingVariation.image) {
        // Find the index of this image in the product images array
        const imageIndex = product.images.findIndex(img => img === matchingVariation.image);
        if (imageIndex >= 0) {
          setSelectedImage(imageIndex);
        }
      }
    }
  }, [selectedOptions, product]);

  // Initialize selectedOptions when product loads
  useEffect(() => {
    if (!product?.hasVariations || !product.variationTypes?.length) return;
    
    console.log('Initializing product variations - no defaults selected');
    
    // Reset selected options to empty state
    setSelectedOptions({});
    setSelectedVariation(null);
    
    // No default selection - user must select options manually
  }, [product]);

  // Modified handleCartAction to include variation data but allow base product
  const handleCartAction = async () => {
    if (!user) {
      toast.error('Please log in to add items to your cart');
      navigate('/login');
      return;
    }

    // For products with variations, use the selected variations if complete, 
    // otherwise use the base product
    let currentVariation = null;
    if (product?.hasVariations && allOptionsSelected()) {
      currentVariation = findMatchingVariation();
    }

    // Check stock based on variation or base product
    const relevantStock = currentVariation ? currentVariation.stock : product.stock;
    if (relevantStock < quantity) {
      toast.error(`Sorry, only ${relevantStock} items are available`);
      return;
    }

    setProcessing(true);
    try {
      if (inCart) {
        // If removing from cart, pass the variation SKU if applicable
        const variationSku = currentVariation ? currentVariation.sku : null;
        await removeFromCart(product._id, variationSku);
        toast.success(`${product.name} removed from cart`);
        setInCart(false);
      } else {
        // If adding to cart, include all necessary variation data if a complete set is selected
        const cartItem = {
          productId: product._id,
          quantity,
          name: product.name,
          price: getPrice(),
          image: product.images[0] || product.image || '/placeholder.jpg'
        };

        // Add variation data if all variation options are selected
        if (product?.hasVariations && allOptionsSelected()) {
          // If we have a complete variation match, use its SKU and price
          if (currentVariation) {
            cartItem.variationSku = currentVariation.sku;
            // Use the complete variation's exact price
            cartItem.price = currentVariation.price;
            
            // Include the selected options
            cartItem.variationOptions = { ...selectedOptions }; 
            
            // Generate a descriptive display name for the variation that includes types
            const variantName = Object.entries(selectedOptions)
              .map(([type, value]) => `${type}: ${value}`)
              .join(' | ');
              
            cartItem.variationDisplay = variantName;
          }
        } else if (product?.hasVariations && Object.keys(selectedOptions).length > 0) {
          // If partial selection, show a warning but still allow adding to cart
          toast.info('Adding base product without complete variation selection');
        }

        await addToCart(cartItem);
        toast.success(`${product.name} added to cart!`);
        setInCart(true);
      }
    } catch (err) {
      console.error('Cart operation failed:', err);
      toast.error(err.message || 'Failed to update cart. Please try again.');
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
                    {product?.hasVariations && Object.keys(selectedOptions).length > 0 && !allOptionsSelected() ? (
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#363a94] to-[#5a60c0] bg-clip-text text-transparent">
                          ₱{getPrice().toLocaleString()}
                        </span>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">Base price:</span> ₱{product.price.toLocaleString()}
                          {Object.entries(selectedOptions).map(([typeName, optionName]) => {
                            // Find the variation type
                            const variationType = product.variationTypes.find(type => type.name === typeName);
                            if (variationType) {
                              // Find the selected option
                              const option = variationType.options.find(opt => opt.name === optionName);
                              if (option && option.priceAdjustment) {
                                const adjustmentSign = option.priceAdjustment > 0 ? '+' : '';
                                return (
                                  <div key={typeName} className="flex items-center mt-1">
                                    <span className="text-gray-600">{typeName}: {optionName}</span>
                                    <span className={`ml-1 ${option.priceAdjustment > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      ({adjustmentSign}₱{option.priceAdjustment.toLocaleString()})
                                    </span>
                                  </div>
                                );
                              }
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    ) : (
                    <span 
                      className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#363a94] to-[#5a60c0] bg-clip-text text-transparent" 
                      itemProp="offers" 
                      itemScope 
                      itemType="https://schema.org/Offer"
                    >
                      <meta itemProp="priceCurrency" content="PHP" />
                        <span itemProp="price" content={getPrice()}>₱{getPrice().toLocaleString()}</span>
                      <link itemProp="availability" href={product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
                    </span>
                    )}
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
                      <div className="description-content p-2">
                        <ExpandableDescription description={product.description} />
                      </div>
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
                      <ul className="space-y-4 divide-y divide-gray-100 overflow-auto max-h-[400px]" itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
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
                                <span className="text-gray-700 text-base break-words" itemProp="value">{feature.trim()}</span>
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
                      <ul className="space-y-3 divide-y divide-gray-100 overflow-auto max-h-[400px]">
                        {product.targetMarket && product.targetMarket.map((market, index) => (
                          <li key={`market-${index}`} className={`flex items-start gap-3 pt-3 ${index === 0 ? 'pt-0' : ''}`}>
                            <span className="flex-shrink-0 p-1 bg-[#363a94]/10 rounded-full mt-1">
                              <svg className="h-4 w-4 text-[#363a94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                            <span className="text-gray-700 text-base break-words">{market}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Product Variations */}
            {product?.hasVariations && (
              <div className={`product-variations mt-6 space-y-4 p-4 rounded-lg ${!allOptionsSelected() ? 'bg-blue-50/50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Available Options
                    <span className="text-xs font-normal text-blue-600 ml-1">(optional)</span>
                  </span>
                  
                  <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                    {Object.keys(selectedOptions).length} of {product.variationTypes.length} selected
                  </span>
                </h3>
                
                {product.variationTypes.map((type) => (
                  <div key={type.name} className={`variation-type mb-5 ${selectedOptions[type.name] ? '' : 'pb-2 border-b border-blue-100/50'}`}>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <span className={`${selectedOptions[type.name] ? 'text-gray-700' : 'text-blue-700'}`}>
                        {type.name}
                      </span>
                      {!selectedOptions[type.name] && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/50 text-blue-700">
                          Select
                        </span>
                      )}
                      {selectedOptions[type.name] && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {selectedOptions[type.name]}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {type.options.map((option) => {
                        // Check if this option is available based on other selections
                        const availableOptions = getAvailableOptions(type.name);
                        const isAvailable = availableOptions.includes(option.name);
                        const isSelected = selectedOptions[type.name] === option.name;

                        // Determine if this is a color/shade option
                        const isColorOption = type.name.toLowerCase().includes('color') || 
                                            type.name.toLowerCase().includes('shade') ||
                                            type.name.toLowerCase().includes('tone');

                        // For color options, create color swatches
                        if (isColorOption) {
                          // Try to determine a color value from the option name
                          // This is a simple implementation - in production you'd want to map specific names to specific colors
                          const getColorFromName = (name) => {
                            const lowerName = name.toLowerCase();
                            if (lowerName.includes('light')) return '#FFE4C4'; // Light beige
                            if (lowerName.includes('medium')) return '#D2B48C'; // Medium beige/tan
                            if (lowerName.includes('dark')) return '#8B4513'; // Dark brown
                            if (lowerName.includes('fair')) return '#FFDAB9'; // Fair skin
                            if (lowerName.includes('tan')) return '#D2B48C'; // Tan
                            if (lowerName.includes('deep')) return '#8B4513'; // Deep brown
                            // Colors
                            if (lowerName.includes('red')) return '#FF0000';
                            if (lowerName.includes('pink')) return '#FFC0CB';
                            if (lowerName.includes('coral')) return '#FF7F50';
                            if (lowerName.includes('nude')) return '#E3BC9A';
                            if (lowerName.includes('natural')) return '#D2B48C';
                            
                            // Default color for unmatched shade names
                            return '#CCCCCC';
                          };
                          
                          const colorValue = getColorFromName(option.name);
                          
                          return (
                            <button
                              key={option.name}
                              type="button"
                              aria-pressed={isSelected}
                              className={`color-swatch w-8 h-8 rounded-full relative border transition-all duration-200 ${
                                isSelected 
                                  ? 'ring-2 ring-offset-2 ring-indigo-600 border-indigo-600 scale-110'
                                  : 'border-gray-300'
                              } ${
                                !isAvailable 
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95'
                              }`}
                              style={{ backgroundColor: colorValue }}
                              onClick={() => {
                                if (isAvailable) {
                                  if (isSelected) {
                                    // If already selected, unselect it by removing it from selectedOptions
                                    setSelectedOptions(prev => {
                                      const newOptions = { ...prev };
                                      delete newOptions[type.name];
                                      return newOptions;
                                    });
                                  } else {
                                    // If not selected and available, select it
                                    handleOptionSelect(type.name, option.name);
                                  }
                                }
                              }}
                              disabled={!isAvailable}
                              title={`${option.name}${!isAvailable ? ' (Not available with current selection)' : ''}`}
                              aria-label={`${type.name}: ${option.name}${!isAvailable ? ' (Not available with current selection)' : ''}`}
                            >
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white drop-shadow-md" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          );
                        }
                        
                        // For size options
                        if (type.name.toLowerCase().includes('size') || type.name.toLowerCase().includes('volume')) {
                          return (
                            <button
                              key={option.name}
                              type="button"
                              aria-pressed={isSelected}
                              className={`relative px-3 py-2 min-w-[60px] rounded-md text-sm font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white scale-105 shadow-md'
                                  : isAvailable
                                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm hover:scale-105 active:scale-95'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              onClick={() => {
                                if (isAvailable) {
                                  if (isSelected) {
                                    // If already selected, unselect it by removing it from selectedOptions
                                    setSelectedOptions(prev => {
                                      const newOptions = { ...prev };
                                      delete newOptions[type.name];
                                      return newOptions;
                                    });
                                  } else {
                                    // If not selected and available, select it
                                    handleOptionSelect(type.name, option.name);
                                  }
                                }
                              }}
                              disabled={!isAvailable}
                              title={`${option.name}${!isAvailable ? ' (Not available with current selection)' : ''}`}
                            >
                              {option.name}
                              {option.priceAdjustment !== 0 && (
                                <span className={`ml-1 text-xs font-normal ${option.priceAdjustment > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {option.priceAdjustment > 0 ? `+₱${option.priceAdjustment}` : `-₱${Math.abs(option.priceAdjustment)}`}
                                </span>
                              )}
                            </button>
                          );
                        }
                        
                        // Default style for other types of options
                        return (
                          <button
                            key={option.name}
                            type="button"
                            aria-pressed={isSelected}
                            className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-indigo-600 text-white scale-105 shadow-md'
                                : isAvailable
                                  ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm hover:scale-105 active:scale-95'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            onClick={() => {
                              if (isAvailable) {
                                if (isSelected) {
                                  // If already selected, unselect it by removing it from selectedOptions
                                  setSelectedOptions(prev => {
                                    const newOptions = { ...prev };
                                    delete newOptions[type.name];
                                    return newOptions;
                                  });
                                } else {
                                  // If not selected and available, select it
                                  handleOptionSelect(type.name, option.name);
                                }
                              }
                            }}
                            disabled={!isAvailable}
                            title={`${option.name}${!isAvailable ? ' (Not available with current selection)' : ''}`}
                          >
                            {option.name}
                            {option.priceAdjustment !== 0 && (
                              <span className={`ml-1 text-xs font-normal ${option.priceAdjustment > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {option.priceAdjustment > 0 ? `+₱${option.priceAdjustment}` : `-₱${Math.abs(option.priceAdjustment)}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="quantity-selector mt-6">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  className="bg-gray-200 text-gray-600 p-2 rounded-l-md hover:bg-gray-300"
                  onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                      <input
                        type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  max={getStock()}
                        value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                  className="w-16 text-center border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  className="bg-gray-200 text-gray-600 p-2 rounded-r-md hover:bg-gray-300"
                        onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= getStock()}
                >
                  +
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {getStock()} available
                        </span>
                      </div>
                  </div>

            {/* Add to Cart / Wishlist Buttons */}
            <div className="actions-container mt-6 space-y-4">
              <button
                type="button"
                className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium ${
                        inCart 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : getStock() > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleCartAction}
                disabled={processing || getStock() === 0}
                    >
                      {processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                    Processing...
                  </>
                ) : inCart ? (
                  'Remove from Cart'
                ) : getStock() > 0 ? (
                  product?.hasVariations && !allOptionsSelected() ? (
                    'Add Base Product to Cart'
                  ) : (
                    'Add to Cart'
                  )
                ) : (
                  'Out of Stock'
                )}
              </button>
              
              {/* Information message for variations */}
              {product?.hasVariations && !allOptionsSelected() && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                  <div className="flex">
                    <svg className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                    <div>
                      <p className="font-medium">You're adding the standard version without selecting any options.</p>
                      <p className="mt-1">Select your preferred options for a customized product:</p>
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {product.variationTypes.map(type => (
                          !selectedOptions[type.name] && (
                            <li key={type.name}>{type.name}</li>
                          )
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
                    
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