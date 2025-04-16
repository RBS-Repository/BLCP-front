import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import SiteLoader from './components/common/SiteLoader';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { products } from './data/products';
import { HelmetProvider } from 'react-helmet-async';

import Cart from './pages/Shop/Cart';
import Checkout from './pages/Shop/Checkout';
import Schedule from './pages/Schedule';
import FAQ from './pages/FAQ';
import AboutIndex from './pages/About/index';
import FDA from './pages/Services/FDA';
import OEM from './pages/Services/OEM';
import PrivateLabel from './pages/Services/PrivateLabel';
import ArticlesIndex from './pages/Articles/index';
import ArticleDetail from './pages/Articles/ArticleDetail';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminCustomers from './pages/admin/Customers';
import AdminAnalytics from './pages/admin/Analytics';
import ForgotPassword from './pages/auth/ForgotPassword';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/auth/ChangePassword';
import ProfileSettings from './pages/ProfileSettings';
import VerifyEmail from './pages/auth/VerifyEmail';
import { useAuth } from './context/AuthContext';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import { CartProvider } from './context/CartContext';
import CreateProduct from './pages/admin/CreateProduct';
import EditProduct from './pages/admin/EditProduct';
import AdminSchedules from './pages/admin/AdminSchedules';

import OrderDetails from './pages/admin/OrderDetails';
import ProcessOrder from './pages/admin/ProcessOrder';
import NotificationDetails from './pages/NotificationDetails';
import { AuthProvider } from './context/AuthContext';
import OrderHistory from './pages/User/OrderHistory';
import OrderConfirmation from './pages/Shop/OrderConfirmation';
import BestSellers from './pages/BestSellers';
import Referrals from './pages/Referrals';
import ContentManager from './pages/admin/ContentManager';
import FaqManager from './pages/admin/FaqManager';
import ArticlesManager from './pages/admin/ArticlesManager';
import ReferralManager from './pages/admin/ReferralManager';
import HeroSliderManager from './pages/admin/HeroSliderManager';
import ResourcesPage from './pages/Resources/index';
import { ParallaxProvider } from 'react-scroll-parallax';
import { Toaster } from 'react-hot-toast';
import DeveloperEnd from './pages/admin/DeveloperEnd';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Wishlist from './pages/Wishlist';
import { WishlistProvider } from './context/WishlistContext';
import ContactManager from './pages/admin/ContactManager';
import ProductSpotlightManager from './pages/admin/ProductSpotlightManager';

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

  useEffect(() => {
    // Add event listener for when the window loads
    const handleLoad = () => {
      // Set a small timeout to ensure smooth animation
      setTimeout(() => {
        setIsLoading(false);
      }, 1500); // Increased to 1.5 seconds to make the loader more visible
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
                      <Route path="/products" element={<Products products={products} />} />
                      <Route path="/products/:id" element={<ProductDetail products={products} />} />
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
                  </main>
                  <Footer />
                </div>
                <Toaster position="bottom-right" />
              </Router>
            </ParallaxProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;