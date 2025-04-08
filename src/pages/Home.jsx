import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ParallaxProvider, Parallax, useParallax } from 'react-scroll-parallax';
import { Helmet } from 'react-helmet-async';
import heroBackground from '../assets/hero1.jpg';
import cellRepairBoost from '../assets/90_120 CELL REPAIR BOOST.jpg';
import oxyjetTreatment from '../assets/500_500 OXYJET TREATMENT.jpg';
import hero2 from '../assets/hero2.jpg';
import hero3 from '../assets/hero3.jpg';
import hero4 from '../assets/hero4.jpg';
import hero5 from '../assets/hero5.jpg';
import hempPeak from '../assets/90_120 PDRN THERAPY (1).jpg';
import api from '../api/client';
import { fetchHeroSlides } from '../api/heroSlides';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import BackToTop from '../components/common/BackToTop';
import ImageLoader from '../components/common/ImageLoader';
import SkeletonLoader, { 
  ProductCardSkeleton, 
  TestimonialSkeleton, 
  FeatureBoxSkeleton, 
  HeroSkeleton 
} from '../components/common/SkeletonLoader';
import { FaShoppingCart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const serviceImages = {
  oem: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1974',
  fda: 'https://www.fda.gov.ph/wp-content/uploads/2022/06/20-July-LS-D-1.png',
  private: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=1974'
};
const aboutImage = '../assets/90_120 CELL REPAIR BOOST.jpg';

// Default hero slides as fallback
const defaultHeroSlides = [
  {
    image: heroBackground,
    title: "Korean Skincare Excellence",
    subtitle: "Premium beauty solutions from South Korea's leading manufacturers",
    cta: "Discover Our Range",
    link: "/products"
  },
  {
    image: hero2,
    title: "Professional OEM Solutions",
    subtitle: "Custom formulations and white-label beauty products for your brand",
    cta: "Partner With Us",
    link: "/services/oem"
  },
  {
    image: hero3,
    title: "Salon & Spa Essentials",
    subtitle: "Professional-grade treatments delivering exceptional results",
    cta: "Shop Professional",
    link: "/products?category=professional"
  },
  {
    image: hero4, 
    title: "FDA-Approved Excellence",
    subtitle: "Discover treatments meeting strict quality and safety standards",
    cta: "Explore FDA Products",
    link: "/products?category=fda"
  },
  {
    image: hero5,
    title: "Private Label Partnerships",
    subtitle: "Launch your own branded skincare line with our expertise",
    cta: "Start Private Labeling",
    link: "/services/private-label"
  }
];

// Partner logos - replace with real brands including Hyunjin
const partners = [
  { 
    name: 'Hyunjin Cosmetics', 
    logo: 'https://oemfile.informamarkets-info.com/FileUpload/2024VBV_37198/20240502125304456.png' 
  },
  { 
    name: 'Innisfree', 
    logo: 'https://1000logos.net/wp-content/uploads/2023/11/Innisfree-Logo.png' 
  },
  { 
    name: 'Etude House', 
    logo: 'https://1000logos.net/wp-content/uploads/2023/11/Etude-House-Logo.jpg' 
  },
  { 
    name: 'The Face Shop', 
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/The_Face_Shop_logo.svg/1200px-The_Face_Shop_logo.svg.png' 
  },
  { 
    name: 'Laneige', 
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2d/Laneige_Logo.svg/2560px-Laneige_Logo.svg.png' 
  },
  { 
    name: 'Missha', 
    logo: 'https://logos-download.com/wp-content/uploads/2016/06/Missha_logo.png' 
  }
];

// Product structured data for SEO
const productStructuredData = (products) => {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "image": product.image,
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "PHP",
          "availability": "https://schema.org/InStock"
        }
      }
    }))
  };
};

// Organization structured data for SEO
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Beauty Lab Cosmetic Products",
  "url": "https://beautylab.ph",
  "logo": "https://beautylab.ph/logo.png",
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61567515650606",
    "https://www.instagram.com/blcpcorp",
    "https://www.linkedin.com/company/beauty-lab-cosmetic-products/",
    "https://www.tiktok.com/@blcpcorp"
  ],
  "description": "Premium Korean cosmetic products and beauty solutions for professionals and enthusiasts",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+63-XXX-XXXX",
    "contactType": "customer service"
  }
};

// Add specific styles for the Swiper navigation
const heroSliderStyles = `
  .hero-slider .swiper-button-next,
  .hero-slider .swiper-button-prev {
    color: white;
    background: rgba(0, 0, 0, 0.3);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    --swiper-navigation-size: 24px;
  }
  
  .hero-slider .swiper-button-next:hover,
  .hero-slider .swiper-button-prev:hover {
    background: rgba(0, 0, 0, 0.5);
  }
  
  .hero-slider .swiper-pagination-bullet {
    background: white;
    opacity: 0.7;
  }
  
  .hero-slider .swiper-pagination-bullet-active {
    background: white;
    opacity: 1;
  }
`;

// Featured Products Section
const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/products');
        const activeProducts = response.data
          .filter(product => product.status === 'active')
          .slice(0, 3);
        
        setProducts(activeProducts);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-blcp-blue mb-4">Featured Products</h2>
          <p className="text-xl text-gray-600">Discover our premium Korean cosmetics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((product) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl 
                        transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="h-64 relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="text-sm text-blcp-blue font-semibold mb-2">{product.category}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blcp-blue">
                    ₱{product.price.toLocaleString()}
                  </span>
                  <Link
                    to={`/products/${product._id}`}
                    className="text-blcp-blue hover:text-blcp-blue/80 font-semibold"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link
            to="/products"
            className="inline-block px-8 py-3 border-2 border-blcp-blue text-blcp-blue 
                       font-bold rounded-full hover:bg-blcp-blue hover:text-white 
                       transition-colors duration-300"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  
  // Hero slides state
  const [heroSlides, setHeroSlides] = useState([]);
  const [loadingHeroSlides, setLoadingHeroSlides] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageSrc, setHeroImageSrc] = useState({}); // Store image sources for each slide
  
  // Create parallax references for various sections
  const heroRef = useRef(null);
  const productsRef = useRef(null);
  const partnersRef = useRef(null);
  
  // Effect to handle screen resize and set mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 640;
      setIsMobile(mobile);
      
      // Update image sources when screen size changes
      updateImageSources(mobile);
    };
    
    // Function to update image sources based on screen size
    const updateImageSources = (mobile) => {
      if (!heroSlides || heroSlides.length === 0) return;
      
      const newImageSrc = {};
      heroSlides.forEach(slide => {
        const slideId = slide._id || slide.id || Math.random().toString();
        if (mobile && slide.mobileImage) {
          newImageSrc[slideId] = slide.mobileImage;
        } else {
          newImageSrc[slideId] = slide.image;
        }
      });
      
      setHeroImageSrc(newImageSrc);
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [heroSlides]); // Add heroSlides as dependency to update when slides change
  
  // Fetch hero slides from MongoDB API
  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const slides = await fetchHeroSlides();
        if (slides && slides.length > 0) {
          setHeroSlides(slides);
        } else {
          setHeroSlides(defaultHeroSlides);
        }
      } catch (error) {
        setHeroSlides(defaultHeroSlides);
      } finally {
        setLoadingHeroSlides(false);
      }
    };

    fetchHeroData();
  }, []);

  // Product categories
  const categoryList = [
    { name: "Cell Repair", icon: cellRepairBoost, link: "/products?category=cell-repair" },
    { name: "OxyJet", icon: oxyjetTreatment, link: "/products?category=oxyjet" },
    { name: "PDRN Therapy", icon: hempPeak, link: "/products?category=pdrn" },
    { name: "Skincare", icon: heroBackground, link: "/products?category=skincare" }
  ];

  // Improve product data loading and error handling
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/products');
        
        // Filter active products and ensure they have valid IDs
        const activeProducts = response.data
          .filter(product => product.status === 'active' && product._id)
          .map(product => ({
            ...product,
            id: product._id || product.id // Ensure id is available (MongoDB uses _id)
          }));
        
        setFeaturedProducts(activeProducts);
      } catch (error) {
        // Set empty array to prevent undefined errors
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    try {
      setSubmittingNewsletter(true);
      await api.post('/newsletter/subscribe', { email });
      setEmail('');
      toast.success('Thank you for subscribing to our newsletter!');
    } catch (error) {
      toast.error('Failed to subscribe. Please try again later.');
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  // Shuffle partner logos on mount
  const shuffledPartnerLogos = useMemo(
    () => [...partners].sort(() => Math.random() - 0.5),
    []
  );

  // Update the hero section styling to add parallax effect and use dark transitions
  const heroStyles = {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed', // Add this for parallax effect
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Change to dark background
    minHeight: '80vh',
  };

  const { user } = useAuth();
  const isEmailVerified = user ? user.emailVerified : false;

  const [expandedImage, setExpandedImage] = useState(null);

  return (
    <ParallaxProvider>
      <Helmet>
        <title>Beauty Lab Cosmetic Products | Premium Korean Skincare Solutions</title>
        <meta name="description" content="Discover professional-grade Korean skincare and beauty products. FDA-approved treatments, OEM solutions, and private labeling services for salons and spas." />
        <meta name="keywords" content="Korean skincare, cosmetics, beauty products, salon treatments, OEM, private label, FDA approved, professional skincare" />
        <meta property="og:title" content="Beauty Lab Cosmetic Products | Premium Korean Skincare" />
        <meta property="og:description" content="Professional Korean skincare and beauty solutions. FDA-approved treatments for salons, spas and beauty enthusiasts." />
        <meta property="og:image" content={heroBackground} />
        <meta property="og:url" content="https://beautylab.ph" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Beauty Lab Cosmetic Products | Premium Korean Skincare" />
        <meta name="twitter:description" content="Professional Korean skincare and beauty solutions. FDA-approved treatments for salons and spas." />
        <meta name="twitter:image" content={heroBackground} />
        <link rel="canonical" href="https://beautylab.ph" />
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        {featuredProducts.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(productStructuredData(featuredProducts))}
          </script>
        )}
      </Helmet>
      <div className="min-h-screen" itemScope itemType="https://schema.org/WebPage">
        {/* Add BackToTop button */}
        <BackToTop threshold={300} right={4} bottom={4} />
        
        {/* Hero Section with improved responsive design */}
        <section ref={heroRef} className="relative overflow-hidden bg-white p-4 pt-12 sm:p-6 sm:pt-16 md:p-10 md:pt-20">
          {/* Hero slider with responsive height */}
          <style>{`
            ${heroSliderStyles}
            
            /* Mobile-optimized hero styles */
            .hero-slider {
              height: 85vh; /* Adjusted height for mobile */
            }
            
            @media (min-width: 640px) {
              .hero-slider {
                height: 70vh; /* Unchanged for tablets */
              }
            }
            
            @media (min-width: 1024px) {
              .hero-slider {
                height: 80vh; /* Unchanged for desktop */
              }
            }
            
            /* Mobile-optimized text styling */
            @media (max-width: 639px) {
              .hero-title {
                font-size: 2rem !important;
                line-height: 1.2 !important;
                margin-bottom: 0.5rem !important;
              }
              
              .hero-subtitle {
                font-size: 1rem !important;
                line-height: 1.4 !important;
                margin-bottom: 1rem !important;
              }
              
              /* Better positioning for mobile */
              .hero-text-container {
                padding-top: 3.5rem !important;
                margin-top: 0 !important;
              }
              
              /* Improved gradient overlay for text readability */
              .hero-gradient-overlay {
                background: linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0, 0, 0, 0.06) 60%, hsla(0, 0.00%, 0.00%, 0.03) 100%) !important;
              }
            }
            
            /* Hero CTA buttons styling for mobile */
            @media (max-width: 639px) {
              .hero-cta-container {
                bottom: 5rem !important;
                width: 90% !important;
                padding: 0 1rem !important;
              }
              
              .hero-cta-button {
                padding: 0.75rem 1rem !important;
                font-size: 0.875rem !important;
              }
            }
          `}</style>
          
          <div className="rounded-2xl overflow-hidden">
            <Swiper
              modules={[Autoplay, Navigation, Pagination, EffectFade]}
              navigation={true}
              pagination={{ clickable: true }}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              loop={true}
              effect="fade"
              fadeEffect={{ crossFade: true }}
              className="hero-slider"
            >
              {loadingHeroSlides ? (
                // Loading skeleton for hero slider
                <SwiperSlide>
                  <HeroSkeleton />
                </SwiperSlide>
              ) : (
                // Map through hero slides
                heroSlides.map((slide, index) => {
                  const slideId = slide._id || slide.id || index;
                  const currentImageSrc = heroImageSrc[slideId] || slide.image;
                  
                  return (
                    <SwiperSlide key={slideId}>
                      <div className="relative h-full">
                        {/* Background image with parallax effect */}
                        <Parallax
                          speed={-20}
                          className="absolute inset-0"
                        >
                          <div className="absolute inset-0">
                            {/* Use direct image src selection based on screen size */}
                            <ImageLoader
                              src={currentImageSrc}
                              alt={slide.title || "Hero image"}
                              className="w-full h-full"
                              objectFit="cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent hero-gradient-overlay"></div>
                          </div>
                        </Parallax>
                        
                        {/* Improved positioning for text container */}
                        <div className="absolute inset-0 flex items-start sm:items-center justify-start">
                          <div className="container mx-auto px-4 md:px-12 pt-12 sm:pt-0">
                            <div className="max-w-xl hero-text-container">
                              {/* Modern minimalist text design with accent line */}
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.7 }}
                                className="relative inline-block"
                              >
                                {slide.title && (
                                  <div className="mb-4 relative">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: "60px" }}
                                      transition={{ duration: 0.6, delay: 0.3 }}
                                      className="h-1 bg-white mb-4"
                                    />
                                    <motion.h2
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      transition={{ duration: 0.7, delay: 0.1 }}
                                      className="text-4xl md:text-5xl font-bold text-white leading-tight hero-title"
                                      style={{ 
                                        textShadow: "0 3px 8px rgba(0,0,0,0.4)"
                                      }}
                                    >
                                      {slide.title}
                                    </motion.h2>
                                  </div>
                                )}
                                
                                {slide.subtitle && (
                                  <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ duration: 0.7, delay: 0.2 }}
                                    className="text-lg md:text-xl font-normal text-white/95 max-w-lg mb-8 hero-subtitle"
                                    style={{ 
                                      textShadow: "0 2px 4px rgba(0,0,0,0.5)"
                                    }}
                                  >
                                    {slide.subtitle}
                                  </motion.p>
                                )}
                                
                                {slide.cta && slide.link && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.4, delay: 0.4 }}
                                  >
                                    <Link 
                                      to={slide.link} 
                                      className="inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-sm hover:bg-white/30 transition-all duration-300 group"
                                    >
                                      <span className="font-medium tracking-wide">{slide.cta}</span>
                                      <motion.svg 
                                        className="w-4 h-4 ml-3" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                        initial={{ x: 0 }}
                                        whileHover={{ x: 3 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                                      </motion.svg>
                                    </Link>
                                  </motion.div>
                                )}
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  );
                })
              )}
            </Swiper>
          </div>
          
          {/* Hero CTA buttons positioned higher on mobile */}
          <div className="absolute bottom-32 sm:bottom-24 md:bottom-32 left-1/2 transform -translate-x-1/2 z-30 w-auto px-4 sm:px-0 hero-cta-container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-row items-center justify-center space-x-4 sm:space-x-6"
            >
              {/* Shop Now button */}
              <Link 
                to="/products"
                className="flex-1 sm:flex-initial flex items-center justify-center px-5 sm:px-7 py-2.5 sm:py-3 bg-white text-[#363a94] font-bold rounded-full shadow-md hover:bg-gray-100 transition-all duration-300 hero-cta-button"
                aria-label="Browse our product catalog"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Shop Now
              </Link>
              
              {/* Book a Consultation button */}
              <Link 
                to="/schedule"
                className="flex-1 sm:flex-initial flex items-center justify-center px-5 sm:px-7 py-2.5 sm:py-3 bg-[#363a94] text-white font-bold rounded-full shadow-md hover:bg-[#2a2d73] transition-all duration-300 hero-cta-button"
                aria-label="Schedule a free beauty consultation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                Book a Consultation
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Enhanced slider navigation styles */}
        <style>{`
          ${heroSliderStyles}
          
          /* Redesigned slider navigation buttons */
          .hero-slider .swiper-button-next,
          .hero-slider .swiper-button-prev {
            color: #363a94;
            background: rgba(255, 255, 255, 0.85);
            width: 46px;
            height: 46px;
            border-radius: 50%;
            --swiper-navigation-size: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            opacity: 0.9;
          }
          
          .hero-slider .swiper-button-next:hover,
          .hero-slider .swiper-button-prev:hover {
            background: rgba(255, 255, 255, 1);
            transform: scale(1.05);
            opacity: 1;
          }
          
          .hero-slider .swiper-pagination-bullet {
            width: 10px;
            height: 10px;
            background: white;
            opacity: 0.7;
            transition: all 0.3s ease;
          }
          
          .hero-slider .swiper-pagination-bullet-active {
            background: white;
            opacity: 1;
            width: 20px;
            border-radius: 5px;
          }
        `}</style>

        {/* Featured Products Slider */}
        <section ref={productsRef} className="py-12 bg-gradient-to-b from-white to-gray-50" aria-labelledby="featured-products-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <Parallax speed={5}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                  <h2 id="featured-products-heading" className="text-3xl font-bold text-gray-900">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#363a94] to-indigo-600">
                    Featured Products
                  </span>
                </h2>
              </motion.div>
              </Parallax>
            </div>
            
            {isLoading ? (
              // Loading skeleton for slider using ProductCardSkeleton
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(5)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {/* Products Slider with infinite loop */}
                <div className="relative">
                  <Swiper
                    modules={[Navigation, Pagination, Autoplay]}
                    navigation={true}
                    pagination={{ clickable: true }}
                    autoplay={{ 
                      delay: 3000,
                      disableOnInteraction: false,
                    }}
                    loop={true}
                    loopFillGroupWithBlank={true}
                    spaceBetween={20}
                    slidesPerView={1}
                    breakpoints={{
                      // For smaller screens
                      640: {
                        slidesPerView: 2,
                        spaceBetween: 20,
                      },
                      // For medium screens
                      768: {
                        slidesPerView: 3,
                        spaceBetween: 20,
                      },
                      // For large screens
                      1024: {
                        slidesPerView: 4,
                        spaceBetween: 20,
                      },
                      // For extra large screens
                      1280: {
                        slidesPerView: 5,
                        spaceBetween: 20,
                      },
                    }}
                    className="product-slider px-1 py-4"
                  >
                    {/* Make sure we always have valid products and IDs */}
                    {(featuredProducts || [])
                      .filter(product => product && (product.id || product._id)) 
                      .slice(0, 10)
                      .map((product, index) => (
                        <SwiperSlide key={product.id || product._id || `product-${Math.random()}`}>
                          <motion.div
                            className="group bg-white rounded-xl overflow-hidden shadow-md transition-all hover:shadow-lg border border-gray-100"
                            whileHover={{ 
                              y: -5,
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                          >
                            <Link to={`/products/${product.id || product._id}`}>
                              <div className="h-48 overflow-hidden">
                                <ImageLoader 
                                  src={product.image || '/images/placeholder-product.jpg'}
                                  alt={product.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  objectFit="cover"
                                />
                              </div>
                              <div className="p-4 flex-grow flex flex-col justify-between">
                                <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                                <div className="flex items-center justify-between mt-3">
                                  {user && isEmailVerified ? (
                                    /* For logged in users with verified email */
                                    <p className="text-lg font-bold text-[#363a94]">
                                      {product.discount > 0 ? (
                                        <>
                                          <span className="text-red-500">₱{((1 - product.discount / 100) * product.price).toLocaleString()}</span>
                                          <span className="text-gray-400 text-sm line-through ml-2">₱{product.price.toLocaleString()}</span>
                                        </>
                                      ) : (
                                        <span>₱{product.price.toLocaleString()}</span>
                                      )}
                                    </p>
                                  ) : (
                                    /* For non-registered users or non-verified users */
                                    <div className="flex flex-col">
                                      <div className="flex items-center text-gray-500">
                                        <svg className="mr-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <span className="font-medium"> Hidden</span>
                                      </div>
                                      {!user ? (
                                        <Link to="/login" className="text-xs text-[#363a94] hover:text-[#2a2e75] underline mt-0.5">
                                          Login to see price
                                        </Link>
                                      ) : (
                                        <span className="text-xs text-[#363a94] mt-0.5">Verify email to see price</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Add to Cart button */}
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.preventDefault(); // Prevent Link navigation
                                      user ? handleAddToCart(product) : navigate('/login');
                                    }}
                                    className="px-3 py-1 bg-[#363a94] text-white rounded-lg text-sm hover:bg-[#2a2d73] transition-colors flex items-center"
                                    disabled={!user || !isEmailVerified}
                                  >
                                    <FaShoppingCart className="mr-1" />
                                    {user && isEmailVerified ? 'Add' : 'Login'}
                                  </motion.button>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        </SwiperSlide>
                      ))}
                  </Swiper>
                </div>
                
                {/* Slider navigation styles */}
                <style>{`
                  .product-slider .swiper-button-next,
                  .product-slider .swiper-button-prev {
                    color: #363a94;
                    background: rgba(255, 255, 255, 0.85);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    --swiper-navigation-size: 18px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    opacity: 0;
                    transition: all 0.3s ease;
                  }
                  
                  .product-slider:hover .swiper-button-next,
                  .product-slider:hover .swiper-button-prev {
                    opacity: 1;
                  }
                  
                  .product-slider .swiper-button-next:hover,
                  .product-slider .swiper-button-prev:hover {
                    background: rgba(255, 255, 255, 1);
                    transform: scale(1.1);
                  }
                  
                  .product-slider .swiper-pagination {
                    bottom: -5px;
                  }
                  
                  .product-slider .swiper-pagination-bullet {
                    background: #363a94;
                    opacity: 0.5;
                    transition: all 0.3s ease;
                  }
                  
                  .product-slider .swiper-pagination-bullet-active {
                    opacity: 1;
                    width: 20px;
                    border-radius: 5px;
                  }
                `}</style>
                
                <div className="text-center mt-12">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                  <Link 
                    to="/products"
                      className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-[#363a94] to-indigo-600 text-white 
                             font-bold rounded-full hover:shadow-lg transform hover:-translate-y-0.5 
                                transition-all duration-300 relative overflow-hidden group"
                    aria-label="View our complete product catalog"
                  >
                      <span className="relative z-10">Explore All Products</span>
                      <motion.svg 
                        className="w-4 h-4 ml-2 relative z-10" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        aria-hidden="true"
                        animate={{ x: [0, 3, 0] }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          repeatType: "loop",
                          ease: "easeInOut",
                          times: [0, 0.5, 1]
                        }}
                      >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </motion.svg>
                      
                      {/* Gradient background that moves on hover */}
                      <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-[#363a94] group-hover:translate-x-full transition-transform duration-500 ease-out origin-left"></span>
                      <span className="absolute inset-0 bg-gradient-to-r from-[#363a94] to-indigo-600 group-hover:translate-x-0 transition-transform duration-500 ease-out origin-right"></span>
                  </Link>
                  </motion.div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Partner Logos 
        <section ref={partnersRef} className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Parallax speed={-5}>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Trusted By Leading Partners</h2>
            </Parallax>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {shuffledPartnerLogos.map((partner, index) => (
                <Parallax speed={index % 2 === 0 ? 5 : -5} key={index}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "rgba(255, 255, 255, 1)"
                    }}
                  className="flex items-center justify-center hover:opacity-100 opacity-80
                             transition-all duration-300 bg-white p-4 rounded-lg shadow-sm"
                >
                    <ImageLoader
                    src={partner.logo} 
                    alt={partner.name}
                    className="h-16 object-contain" 
                      objectFit="contain"
                  />
                </motion.div>
                </Parallax>
              ))}
            </div>
          </div>
        </section>
*/}
        {/* How It Works */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Parallax speed={10}>
                <motion.h2 
                  className="text-3xl font-bold text-[#363a94] mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  Expert Beauty Solutions
                </motion.h2>
                <motion.p 
                  className="text-xl text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Premium Korean skincare for professionals and enthusiasts
                </motion.p>
              </Parallax>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                // Loading skeleton for feature boxes
                <>
                  {[...Array(3)].map((_, i) => (
                    <FeatureBoxSkeleton key={i} />
                  ))}
                </>
              ) : (
                <>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-xl shadow-md text-center"
                    whileHover={{ 
                      y: -10,
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-[#363a94]/10 text-[#363a94] flex items-center justify-center text-2xl mx-auto mb-6"
                      whileHover={{ rotate: 360 }}
                      transition={{ type: "spring", stiffness: 100, damping: 10 }}
                    >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6h-3V5c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v1H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-9-1h4v1h-4V5zm11 15H4V8h16v12z"/>
                    <path d="M12 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                    </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Professional Grade</h3>
                <p className="text-gray-600">
                  Our products are formulated to meet the high standards of beauty professionals and clinics, ensuring superior results.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white p-8 rounded-xl shadow-md text-center"
                    whileHover={{ 
                      y: -10,
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-[#363a94]/10 text-[#363a94] flex items-center justify-center text-2xl mx-auto mb-6"
                      whileHover={{ rotate: 360 }}
                      transition={{ type: "spring", stiffness: 100, damping: 10 }}
                    >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2c-5.33 0-9.33 3.53-10 8h20c-.67-4.47-4.67-8-10-8zm-10 10v1h20v-1h-20zm10 10c5.33 0 9.33-3.53 10-8h-20c.67 4.47 4.67 8 10 8z"/>
                  </svg>
                    </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Korean Innovation</h3>
                <p className="text-gray-600">
                  Combining Korean skincare technology with advanced science for cutting-edge formulations and treatments.
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white p-8 rounded-xl shadow-md text-center"
                    whileHover={{ 
                      y: -10,
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-[#363a94]/10 text-[#363a94] flex items-center justify-center text-2xl mx-auto mb-6"
                      whileHover={{ rotate: 360 }}
                      transition={{ type: "spring", stiffness: 100, damping: 10 }}
                    >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.41-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                    </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Customized Solutions</h3>
                <p className="text-gray-600">
                  Tailored treatment systems for spas, clinics and personal care, adaptable to your specific needs.
                </p>
              </motion.div>
                </>
              )}
            </div>
          </div>
        </section>


        {/* Benefits Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="md:flex items-center justify-center">
              <div className="w-full">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold text-[#363a94] mb-6 text-center">Why Choose BLCP Solutions?</h2>
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-6 h-6 rounded-full bg-[#363a94] flex items-center justify-center text-white text-xs font-bold">1</div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">FDA Registered Products</h3>
                        <p className="text-gray-600">All products are registered with the FDA, ensuring safety and compliance with international standards.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-6 h-6 rounded-full bg-[#363a94] flex items-center justify-center text-white text-xs font-bold">2</div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Korean Technology</h3>
                        <p className="text-gray-600">Partnering with leading Korean laboratories to bring cutting-edge beauty innovations to professionals.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-6 h-6 rounded-full bg-[#363a94] flex items-center justify-center text-white text-xs font-bold">3</div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Business Support</h3>
                        <p className="text-gray-600">Comprehensive training, marketing materials, and ongoing support for salon and spa partners.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Product Lines Section */}
        <section className="py-24 w-full left-28 bg-white relative overflow-hidden">
          <div className="max-w-7x5 mx-auto px-4 sm:px-6 lg:px-8 relative flex flex-col items-center">
            <div className="text-center mb-8 w-full">
              <motion.h2  
                className="text-3xl md:text-3xl font-bold text-gray-900 mb-4 right-14"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Featured Product Lines
              </motion.h2>
            </div>
            
            {/* Enhanced Mosaic/Bento Grid Layout */}
            <div className="grid  sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8 w-full max-w-7xl mx-auto left-28">
              {/* Row 1 */}
              {/* Large Featured Product - First Row Span 2 */}
                <motion.div
                className="col-span-2 row-span-2 rounded-lg shadow-sm overflow-hidden bg-red-500 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://d3jmn01ri1fzgl.cloudfront.net/photoadking/webp_thumbnail/we-peep-and-hibiscus-beauty-product-cosmetics-ad-template-0srugaa126f192.webp",
                  alt: "OxyJet Professional Series"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://d3jmn01ri1fzgl.cloudfront.net/photoadking/webp_thumbnail/we-peep-and-hibiscus-beauty-product-cosmetics-ad-template-0srugaa126f192.webp" 
                    alt="OxyJet Professional Series" 
                    className="w-full h-full object-cover"
                  />
                </div>
                </motion.div>
              
              {/* Cell Repair - First Row */}
              <motion.div 
                className="col-span-1 row-span-1 rounded-lg shadow-sm overflow-hidden bg-gray-200 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://i.pinimg.com/736x/f1/48/a0/f148a004dc4ec95e9db97fd7ba6f97b1.jpg",
                  alt: "Cell Repair Boost"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://i.pinimg.com/736x/f1/48/a0/f148a004dc4ec95e9db97fd7ba6f97b1.jpg"
                    alt="Cell Repair Boost" 
                    className="w-full h-full object-cover"
                  />
              </div>
              </motion.div>
              
              {/* PDRN Therapy - First Row */}
              <motion.div 
                className="col-span-1 row-span-1 rounded-lg shadow-sm overflow-hidden bg-gray-600 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://roiminds-1e808.kxcdn.com/wp-content/uploads/2023/05/Lancome.png",
                  alt: "PDRN Therapy"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://roiminds-1e808.kxcdn.com/wp-content/uploads/2023/05/Lancome.png" 
                    alt="PDRN Therapy" 
                    className="w-full h-full object-cover"
                  />
            </div>
              </motion.div>
              
              {/* Row 2 - Additional Elements */}
              
              {/* Skincare - Start of Row 2 */}
              <motion.div 
                className="col-span-1 row-span-1 rounded-lg shadow-sm overflow-hidden bg-blue-500 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://png.pngtree.com/png-clipart/20200226/original/pngtree-cosmetics-product-ads-poster-template-beauty-cosmetic-png-image_5313505.jpg",
                  alt: "Skincare Collection"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://png.pngtree.com/png-clipart/20200226/original/pngtree-cosmetics-product-ads-poster-template-beauty-cosmetic-png-image_5313505.jpg" 
                    alt="Skincare Collection" 
                    className="w-full h-full object-cover"
                  />
          </div>
              </motion.div>
              
              {/* 2x1 Horizontal - Spans across Row 2 */}
              <motion.div 
                className="col-span-2 row-span-1 rounded-lg shadow-sm overflow-hidden bg-amber-100 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://brentonway.com/wp-content/uploads/2024/02/image-26.png",
                  alt: "Professional Products"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://brentonway.com/wp-content/uploads/2024/02/image-26.png"
                    alt="Professional Products" 
              className="w-full h-full object-cover"
            />
          </div>
              </motion.div>
              
              {/* Row 3 */}
              
              {/* Small Box - Row 3 */}
              <motion.div 
                className="col-span-1 row-span-1 rounded-lg shadow-sm overflow-hidden bg-indigo-100 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://cdn.confect.io/uploads/media/271855174_1031068707751720_4161178570420835579_n%20-%20Copy.jpg",
                  alt: "Essential Products"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://cdn.confect.io/uploads/media/271855174_1031068707751720_4161178570420835579_n%20-%20Copy.jpg"
                    alt="Essential Products" 
                    className="w-full h-full object-cover"
                  />
              </div>
              </motion.div>
              
              {/* Medium Box - Row 3 */}
              <motion.div 
                className="col-span-2 row-span-1 rounded-lg shadow-sm overflow-hidden bg-gray-800 sm:hidden md:block cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/luxury-beauty-product-template-design-802d996d24722d52590b6fba98a4bc66_screen.jpg?ts=1645416275",
                  alt: "Spa Treatments"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://d1csarkz8obe9u.cloudfront.net/posterpreviews/luxury-beauty-product-template-design-802d996d24722d52590b6fba98a4bc66_screen.jpg?ts=1645416275"
                    alt="Spa Treatments" 
                    className="w-full h-full object-cover"
                />
              </div>
              </motion.div>
              
              {/* Large Box - Spans Rows 3-4 */}
              <motion.div 
                className="col-span-2 row-span-2 rounded-lg shadow-sm overflow-hidden bg-amber-700 hidden md:block cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://d3jmn01ri1fzgl.cloudfront.net/photoadking/webp_thumbnail/kobi-and-jazzberry-jam-skin-care-ad-template-zp0mrfa126f192.webp",
                  alt: "Skincare Sets"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://d3jmn01ri1fzgl.cloudfront.net/photoadking/webp_thumbnail/kobi-and-jazzberry-jam-skin-care-ad-template-zp0mrfa126f192.webp" 
                    alt="Skincare Sets" 
                    className="w-full h-full object-cover"
                  />
            </div>
              </motion.div>
              
              {/* New Box - Vertical Rectangle */}
              <motion.div 
                className="col-span-1 row-span-2 rounded-lg shadow-sm overflow-hidden bg-purple-100 hidden md:block cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.85 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: "https://marketplace.canva.com/EAF3o7BdLno/2/0/1131w/canva-white-and-pink-skincare-product-flyer-Zq-VceMZmOw.jpg",
                  alt: "Premium Collection"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src="https://marketplace.canva.com/EAF3o7BdLno/2/0/1131w/canva-white-and-pink-skincare-product-flyer-Zq-VceMZmOw.jpg"
                    alt="Premium Collection" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              
              {/* Row 4 - mobile only */}
              <motion.div 
                className="col-span-1 rounded-lg shadow-sm overflow-hidden bg-gray-300 sm:block md:hidden cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: hero5,
                  alt: "Natural Products"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src={hero5} 
                    alt="Natural Products" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              
              <motion.div 
                className="col-span-1 rounded-lg shadow-sm overflow-hidden bg-gray-300 sm:block md:hidden cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.0 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                onClick={() => setExpandedImage({
                  src: hero4,
                  alt: "Beauty Kits"
                })}
              >
                <div className="relative h-full">
                  <img 
                    src={hero4} 
                    alt="Beauty Kits" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
            
            <div className="text-center mt-8">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to="/products"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#363a94] to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg transition-all duration-300 shadow-md"
                >
                  Explore All Products
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </Link>
              </motion.div>
            </div>
          </div>
          
          {/* Image Expansion Modal */}
          {expandedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setExpandedImage(null)}
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the content
              >
                <button 
                  onClick={() => setExpandedImage(null)}
                  className="absolute top-0 right-0 bg-white rounded-full p-2 shadow-lg transform translate-x-1/2 -translate-y-1/2 z-10 hover:bg-gray-100 transition-colors"
                  aria-label="Close image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img 
                  src={expandedImage.src} 
                  alt={expandedImage.alt} 
                  className="max-h-[85vh] max-w-full w-auto h-auto rounded-lg shadow-2xl object-contain bg-white p-1"
                />
              </motion.div>
            </motion.div>
          )}
        </section>
{/* Schedule Consultation Banner */}
<section className="py-12 px-4 sm:px-6 lg:px-8 bg-[#363a94] text-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Ready for a Beauty Consultation?</h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
                Get personalized product recommendations from our beauty experts
              </p>
              <Link 
                to="/schedule" 
                className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-lg text-[#363a94] bg-white hover:bg-gray-100 shadow-lg transition-colors duration-300"
              >
                Schedule Your Consultation
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 ml-2" 
                  viewBox="0 0 20 20" 
                  fill="#363a94"
                >
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-12 border-t border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: "🇰🇷", title: "Authentic Korean", desc: "Directly imported from Korea" },
                { icon: "🧪", title: "FDA Approved", desc: "All products are FDA registered" },
                { icon: "🚚", title: "Fast Shipping", desc: "2-3 day delivery nationwide" },
                { icon: "✅", title: "Quality Guaranteed", desc: "100% satisfaction or refund" }
              ].map((badge, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{badge.title}</h3>
                  <p className="text-sm text-gray-600">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials 
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Parallax speed={10}>
              <motion.h2 
                className="text-3xl font-bold text-center text-gray-900 mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                What Our Customers Say
              </motion.h2>
            </Parallax>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                // Loading skeleton for testimonials
                <>
                  {[...Array(3)].map((_, i) => (
                    <TestimonialSkeleton key={i} />
                  ))}
                </>
              ) : (
                [
                {
                  name: "Maria Santos",
                  role: "Beauty Salon Owner",
                  image: cellRepairBoost,
                  quote: "The Cell Repair Boost products have been a game-changer for our salon treatments. Our clients love the results!"
                },
                {
                  name: "John Reyes",
                  role: "Dermatologist",
                  image: hempPeak,
                  quote: "I recommend BLCP's PDRN products to my patients. The quality and efficacy are consistently excellent."
                },
                {
                  name: "Sophia Cruz",
                  role: "Spa Manager",
                  image: oxyjetTreatment,
                  quote: "OxyJet has become our most requested treatment. The products deliver professional results and our customers keep coming back."
                }
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ 
                      y: -5,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                    }}
                  className="bg-white p-6 rounded-xl shadow-sm"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                        <ImageLoader 
                        src={testimonial.image} 
                        alt={testimonial.name}
                          className="w-full h-full" 
                          objectFit="cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{testimonial.name}</h3>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                    <motion.div 
                      initial={{ width: "0%" }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      className="mb-4 h-0.5 bg-gray-100"
                    ></motion.div>
                  <div className="mb-4 text-yellow-400 flex">
                    {[...Array(5)].map((_, i) => (
                        <motion.svg 
                          key={i} 
                          className="w-5 h-5" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + (i * 0.1) }}
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.32c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.414-1.414L2.98 8.87c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </motion.svg>
                    ))}
                  </div>
                    <p className="text-gray-600 italic relative">
                      <motion.span
                        className="absolute -left-2 -top-2 text-4xl text-gray-200"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                      >
                        "
                      </motion.span>
                      <span className="relative">{testimonial.quote}</span>
                    </p>
                </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
*/}
    
      </div>
    </ParallaxProvider>
  );
};

export default Home; 