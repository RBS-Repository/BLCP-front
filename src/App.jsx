import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import SiteLoader from './components/common/SiteLoader';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { ParallaxProvider } from 'react-scroll-parallax';
import { Toaster } from 'react-hot-toast';
import { initBfCacheOptimizer } from './utils/bfcacheOptimizer';
import performanceOptimizer from './utils/performanceOptimizer';
import lcpOptimizer from './utils/lcpOptimizer';

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Implement lazy loading with better error handling for chunks
const lazyWithPreload = (factory) => {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
};

// Implement lazy loading for all routes with prefetching logic
// This will split the bundle into smaller chunks
const Home = lazyWithPreload(() => import('./pages/Home'));
const Products = lazyWithPreload(() => import('./pages/Products'));
const ProductDetail = lazyWithPreload(() => import('./pages/ProductDetail'));
const Cart = lazyWithPreload(() => import('./pages/Shop/Cart'));
const Checkout = lazyWithPreload(() => import('./pages/Shop/Checkout'));
const Schedule = lazyWithPreload(() => import('./pages/Schedule'));
const FAQ = lazyWithPreload(() => import('./pages/FAQ'));
const AboutIndex = lazyWithPreload(() => import('./pages/About/index'));
const FDA = lazyWithPreload(() => import('./pages/Services/FDA'));
const OEM = lazyWithPreload(() => import('./pages/Services/OEM'));
const PrivateLabel = lazyWithPreload(() => import('./pages/Services/PrivateLabel'));
const ArticlesIndex = lazyWithPreload(() => import('./pages/Articles/index'));
const ArticleDetail = lazyWithPreload(() => import('./pages/Articles/ArticleDetail'));
const Login = lazyWithPreload(() => import('./pages/auth/Login'));
const Signup = lazyWithPreload(() => import('./pages/auth/Signup'));
const Dashboard = lazyWithPreload(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazyWithPreload(() => import('./pages/admin/Products'));
const AdminOrders = lazyWithPreload(() => import('./pages/admin/Orders'));
const AdminCustomers = lazyWithPreload(() => import('./pages/admin/Customers'));
const AdminAnalytics = lazyWithPreload(() => import('./pages/admin/Analytics'));
const ForgotPassword = lazyWithPreload(() => import('./pages/auth/ForgotPassword'));
const Profile = lazyWithPreload(() => import('./pages/Profile'));
const EditProfile = lazyWithPreload(() => import('./pages/EditProfile'));
const ChangePassword = lazyWithPreload(() => import('./pages/auth/ChangePassword'));
const ProfileSettings = lazyWithPreload(() => import('./pages/ProfileSettings'));
const VerifyEmail = lazyWithPreload(() => import('./pages/auth/VerifyEmail'));
const Contact = lazyWithPreload(() => import('./pages/Contact'));
const NotFound = lazyWithPreload(() => import('./pages/NotFound'));
const CreateProduct = lazyWithPreload(() => import('./pages/admin/CreateProduct'));
const EditProduct = lazyWithPreload(() => import('./pages/admin/EditProduct'));
const AdminSchedules = lazyWithPreload(() => import('./pages/admin/AdminSchedules'));
const OrderDetails = lazyWithPreload(() => import('./pages/admin/OrderDetails'));
const ProcessOrder = lazyWithPreload(() => import('./pages/admin/ProcessOrder'));
const NotificationDetails = lazyWithPreload(() => import('./pages/NotificationDetails'));
const OrderHistory = lazyWithPreload(() => import('./pages/User/OrderHistory'));
const OrderConfirmation = lazyWithPreload(() => import('./pages/Shop/OrderConfirmation'));
const BestSellers = lazyWithPreload(() => import('./pages/BestSellers'));
const Referrals = lazyWithPreload(() => import('./pages/Referrals'));
const ContentManager = lazyWithPreload(() => import('./pages/admin/ContentManager'));
const FaqManager = lazyWithPreload(() => import('./pages/admin/FaqManager'));
const ArticlesManager = lazyWithPreload(() => import('./pages/admin/ArticlesManager'));
const ReferralManager = lazyWithPreload(() => import('./pages/admin/ReferralManager'));
const HeroSliderManager = lazyWithPreload(() => import('./pages/admin/HeroSliderManager'));
const ResourcesPage = lazyWithPreload(() => import('./pages/Resources/index'));
const DeveloperEnd = lazyWithPreload(() => import('./pages/admin/DeveloperEnd'));
const Terms = lazyWithPreload(() => import('./pages/Terms'));
const Privacy = lazyWithPreload(() => import('./pages/Privacy'));
const Wishlist = lazyWithPreload(() => import('./pages/Wishlist'));
const ContactManager = lazyWithPreload(() => import('./pages/admin/ContactManager'));
const ProductSpotlightManager = lazyWithPreload(() => import('./pages/admin/ProductSpotlightManager'));

// Dynamically import products data to avoid main thread blocking
const loadProductsData = () => import('./data/products').then(module => module.products);

// Redirect authenticated users away from auth pages
const AuthRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
};

// Protect routes that require authentication
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user && user.admin ? children : <Navigate to="/" replace />;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [productsData, setProductsData] = useState([]);

  // Initialize performance monitoring
  useEffect(() => {
    // Monitor LCP (Largest Contentful Paint)
    lcpOptimizer.monitorLCP();
    
    // Optimize font display
    lcpOptimizer.optimizeFontDisplay();
    
    // Preload hero image (commonly the LCP element)
    lcpOptimizer.preloadLCPImage('/src/assets/hero1.jpg');
    
    // Apply bfcache optimizations
    initBfCacheOptimizer();
    
    // Measure DOM size in development
    if (process.env.NODE_ENV !== 'production') {
      performanceOptimizer.measureDomSize();
    }
    
    // Load critical data
    loadProductsData().then(products => {
      setProductsData(products);
    });
    
    // Prefetch important routes
    performanceOptimizer.runWhenIdle(() => {
      // Prefetch common routes after main content loads
      Home.preload();
      Products.preload();
      
      // Monitor performance metrics
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navEntry = performance.getEntriesByType('navigation')[0];
        if (navEntry && navEntry.domComplete > 5000) {
          console.warn('Page load performance is poor. DOMComplete:', navEntry.domComplete);
        }
      }
    });
  }, []);

  useEffect(() => {
    // Add event listener for when the window loads
    const handleLoad = () => {
      // Set a small timeout to ensure smooth animation
      performanceOptimizer.batchDomUpdates(() => {
        setTimeout(() => {
          setIsLoading(false);
        }, 1500); // Increased to 1.5 seconds to make the loader more visible
      });
    };

    // Check if page is already loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    // Set a maximum loading time (in case load event never fires)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000); // 4 seconds maximum loading time (increased for better experience)

    return () => {
      window.removeEventListener('load', handleLoad);
      clearTimeout(timer);
    };
  }, []);

  return (
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ParallaxProvider>
              {/* SiteLoader handles its own AnimatePresence */}
              <SiteLoader isLoading={isLoading} />
              <Router>
                <div className={`flex flex-col min-h-screen ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
                  <ScrollToTop />
                  <Header />
                  <main className="flex-grow">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Home />} />
                        
                        {/* Wishlist Route */}
                        <Route path="/wishlist" element={
                          <ProtectedRoute>
                            <Wishlist />
                          </ProtectedRoute>
                        } />

                        <Route path="/about" element={<AboutIndex />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/products" element={<Products products={productsData} />} />
                        <Route path="/products/:id" element={<ProductDetail products={productsData} />} />
                        <Route path="/best-sellers" element={<BestSellers />} />

                        {/* Auth-protected routes */}
                        <Route path="/login" element={
                          <AuthRoute>
                            <Login />
                          </AuthRoute>
                        } />
                        <Route path="/signup" element={
                          <AuthRoute>
                            <Signup />
                          </AuthRoute>
                        } />

                        {/* Forgot Password Route */}
                        <Route path="/forgot-password" element={
                          <AuthRoute>
                            <ForgotPassword />
                          </AuthRoute>
                        } />

                        {/* Authenticated-user-only routes */}
                        <Route path="/profile" element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        } />
                        <Route path="/profile/edit" element={
                          <ProtectedRoute>
                            <EditProfile />
                          </ProtectedRoute>
                        } />
                        <Route path="/change-password" element={
                          <ProtectedRoute>
                            <ChangePassword />
                          </ProtectedRoute>
                        } />
                        <Route path="/profile/settings" element={
                          <ProtectedRoute>
                            <ProfileSettings />
                          </ProtectedRoute>
                        } />

                        {/* Verify Email route */}
                        <Route path="/verify-email" element={<VerifyEmail />} />

                        {/* Services Routes */}
                    
                        <Route path="/services/fda" element={<FDA />} />
                        <Route path="/services/oem" element={<OEM />} />
                        <Route path="/services/private-label" element={<PrivateLabel />} />

                        {/* FAQ Route */}
                        <Route path="/faq" element={<FAQ />} />

                        {/* Articles Routes */}
                        <Route path="/articles" element={<ArticlesIndex />} />
                        <Route path="/articles/:id" element={<ArticleDetail />} />

                        {/* Cart Route */}
                        <Route path="/cart" element={<Cart />} />

                        {/* Checkout Route */}
                        <Route path="/checkout" element={<Checkout />} />

                        {/* Schedule Route */}
                        <Route path="/schedule" element={<Schedule />} />

                        {/* Notification Details Route */}
                        <Route 
                          path="/notifications/:id" 
                          element={
                            <ProtectedRoute>
                              <NotificationDetails />
                            </ProtectedRoute>
                          }
                        />

                        {/* Admin Dashboard */}
                        <Route path="/admin/dashboard" element={
                          <AdminRoute>
                            <Dashboard />
                          </AdminRoute>  
                        } />

                        {/* Admin Products */}
                        <Route path="/admin/products" element={
                          <AdminRoute>
                            <AdminProducts />
                          </AdminRoute>
                        } />

                        {/* Admin Orders */}
                        <Route path="/admin/orders" element={
                          <AdminRoute>
                            <AdminOrders />
                          </AdminRoute>
                        } />

                        {/* Admin Customers */}
                        <Route path="/admin/customers" element={
                          <AdminRoute>
                            <AdminCustomers />
                          </AdminRoute>
                        } />

                        {/* Admin Analytics */}
                        <Route path="/admin/analytics" element={
                          <AdminRoute>
                            <AdminAnalytics />
                          </AdminRoute>
                        } />

                        {/* Create Product */}
                        <Route path="/admin/products/new" element={
                          <AdminRoute>
                            <CreateProduct />
                          </AdminRoute>
                        } />

                        {/* Edit Product */}
                        <Route path="/admin/products/edit/:id" element={
                          <AdminRoute>
                            <EditProduct />
                          </AdminRoute>
                        } />

                        {/* Admin Schedules */}
                        <Route path="/admin/schedules" element={
                          <AdminRoute>
                            <AdminSchedules />
                          </AdminRoute>
                        } />

                        {/* Order Details */}
                        <Route path="/admin/orders/:id" element={
                          <AdminRoute>
                            <OrderDetails />
                          </AdminRoute>
                        } />

                        {/* Process Order */}
                        <Route path="/admin/orders/process/:id" element={
                          <AdminRoute>
                            <ProcessOrder />
                          </AdminRoute>
                        } />

                        {/* Developer End */}
                        <Route path="/admin/developer-end" element={
                          <AdminRoute>
                            <DeveloperEnd />
                          </AdminRoute>
                        } />

                        {/* Order History */}
                        <Route 
                          path="/order-history" 
                          element={
                            <ProtectedRoute>
                              <OrderHistory />
                            </ProtectedRoute>
                          }
                        />

                        {/* Order Confirmation */}
                        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

                        {/* Referrals Route */}
                        <Route path="/referrals" element={
                          <ProtectedRoute>
                            <Referrals />
                          </ProtectedRoute>
                        } />

                        {/* Content Manager */}
                        <Route path="/admin/content/:pageId" element={
                          <AdminRoute>
                            <ContentManager />
                          </AdminRoute>
                        } />

                        {/* Faq Manager */}
                        <Route path="/admin/faq" element={
                          <AdminRoute>
                            <FaqManager />
                          </AdminRoute>
                        } />

                        {/* Articles Manager */}
                        <Route path="/admin/articles" element={
                          <AdminRoute>
                            <ArticlesManager />
                          </AdminRoute>
                        } />

                        {/* Referral Manager */}
                        <Route path="/admin/referrals" element={
                          <AdminRoute>
                            <ReferralManager />
                          </AdminRoute>
                        } />

                        {/* Hero Slider Manager */}
                        <Route path="/admin/hero-slider" element={
                          <AdminRoute>
                            <HeroSliderManager />
                          </AdminRoute>
                        } />

                        {/* Product Spotlight Manager */}
                        <Route path="/admin/product-spotlight" element={
                          <AdminRoute>
                            <ProductSpotlightManager />
                          </AdminRoute>
                        } />

                        {/* Contact Manager */}
                        <Route path="/admin/contact-manager" element={
                          <AdminRoute>
                            <ContactManager />
                          </AdminRoute>
                        } />

                        {/* Resources Route */}
                        <Route path="/resources" element={<ResourcesPage />} />

                        {/* Terms Route */}
                        <Route path="/terms" element={<Terms />} />

                        {/* Privacy Route */}
                        <Route path="/privacy" element={<Privacy />} />

                        {/* 404 Page */}
                        <Route path="/home" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Footer />
                  <Toaster 
                    position="top-center" 
                    toastOptions={{
                      // Reduced re-renders for toast notifications
                      duration: 4000,
                      style: {
                        background: '#fff',
                        color: '#363636',
                      },
                    }}
                  />
                </div>
              </Router>
            </ParallaxProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;