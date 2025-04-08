import { useState, useEffect } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, Box, IconButton, Divider, Collapse } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ProductsIcon from '@mui/icons-material/Inventory';
import OrdersIcon from '@mui/icons-material/Receipt';
import CustomersIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ScheduleIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ArticleIcon from '@mui/icons-material/Article';
import RedeemIcon from '@mui/icons-material/Redeem';
import CodeIcon from '@mui/icons-material/Code';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ContentIcon from '@mui/icons-material/LibraryBooks';
import ImageIcon from '@mui/icons-material/Image';
import ContactsIcon from '@mui/icons-material/Contacts';
import { uploadImage } from '../../services/cloudinary';

const DEFAULT_AVATAR = "https://img.freepik.com/premium-vector/person-with-blue-shirt-that-says-name-person_1029948-7040.jpg?semt=ais_hybrid";

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ')[1] || '',
  });
  const [profileImage, setProfileImage] = useState(user?.photoURL || DEFAULT_AVATAR);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const contentRoutes = ['/admin/content', '/admin/faq', '/admin/articles', '/admin/hero-slider', '/admin/contact-manager'];

  useEffect(() => {
    // Keep dropdown open if any content route is active
    const shouldExpand = contentRoutes.some(route => 
      location.pathname.startsWith(route)
    );
    setContentExpanded(shouldExpand);
  }, [location.pathname]);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');

      // Upload to Cloudinary using our service
      const imageUrl = await uploadImage(file);

      // Update profile picture URL in Auth
      await updateProfile(user, {
        photoURL: imageUrl
      });

      // Update profile picture URL in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: imageUrl,
        updatedAt: new Date().toISOString()
      });

      setProfileImage(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        photoURL: profileImage
      });

      // Update Firestore Document
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        photoURL: profileImage,
        updatedAt: new Date().toISOString()
      });

      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentClick = () => {
    setContentExpanded(!contentExpanded);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        open={!collapsed}
        sx={{
          width: collapsed ? 64 : 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: collapsed ? 64 : 240,
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            color: '#000000',
            borderRight: '1px solid #e0e0e0',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && (
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Admin Panel
            </Typography>
          )}
          <IconButton onClick={toggleCollapse}>
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>
        <List sx={{ flexGrow: 1 }}>
          <ListItem
            component={Link}
            to="/admin/dashboard"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' }
            }}
          >
            <ListItemIcon sx={{ color: '#000000' }}>
              <DashboardIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Dashboard" />}
          </ListItem>
          <ListItem
            component={Link}
            to="/admin/products"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' }
            }}
          >
            <ListItemIcon sx={{ color: '#000000' }}>
              <ProductsIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Products" />}
          </ListItem>
          <ListItem
            component={Link}
            to="/admin/orders"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' }
            }}
          >
            <ListItemIcon sx={{ color: '#000000' }}>
              <OrdersIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Orders" />}
          </ListItem>
          <ListItem
            component={Link}
            to="/admin/customers"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' }
            }}
          >
            <ListItemIcon sx={{ color: '#000000' }}>
              <CustomersIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Customers" />}
          </ListItem>
          <ListItem
            component={Link}
            to="/admin/analytics"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' }
            }}
          >
            <ListItemIcon sx={{ color: '#000000' }}>
              <AnalyticsIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Analytics" />}
          </ListItem>
          <ListItem
            component={Link}
            to="/admin/schedules"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' }
            }}
          >
            <ListItemIcon sx={{ color: '#000000' }}>
              <ScheduleIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Schedules" />}
          </ListItem>
          <ListItem
            component={Link}
            to="/admin/referrals"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e0e0e0' },
              backgroundColor: location.pathname === '/admin/referrals' ? '#f0f0f0' : 'transparent'
            }}
          >
            <ListItemIcon sx={{ color: 'rgba(0,0,0,0.6)' }}>
              <RedeemIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Referral Management" />}
          </ListItem>
          <ListItem 
            onClick={handleContentClick}
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f5f5f5' },
              backgroundColor: contentExpanded ? '#f0f0f0' : 'transparent'
            }}
          >
            <ListItemIcon sx={{ color: 'rgba(0,0,0,0.6)' }}>
              <ContentIcon />
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText primary="Content Management" />
                {contentExpanded ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItem>
          <Collapse in={contentExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                component={Link}
                to="/admin/content/about"
                sx={{
                  pl: 4,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  '&.Mui-selected': { backgroundColor: '#e0e0e0' }
                }}
              >
                <ListItemIcon sx={{ color: '#000000' }}>
                  <DescriptionIcon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="About Page" />}
              </ListItem>
              
              <ListItem
                component={Link}
                to="/admin/hero-slider"
                sx={{
                  pl: 4,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  '&.Mui-selected': { backgroundColor: '#e0e0e0' }
                }}
              >
                <ListItemIcon sx={{ color: '#000000' }}>
                  <ImageIcon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="Hero Slider" />}
              </ListItem>
              
              <ListItem
                component={Link}
                to="/admin/faq"
                sx={{
                  pl: 4,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  '&.Mui-selected': { backgroundColor: '#e0e0e0' }
                }}
              >
                <ListItemIcon sx={{ color: '#000000' }}>
                  <QuestionAnswerIcon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="FAQ" />}
              </ListItem>
              <ListItem
                component={Link}
                to="/admin/articles"
                sx={{
                  pl: 4,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  '&.Mui-selected': { backgroundColor: '#e0e0e0' }
                }}
              >
                <ListItemIcon sx={{ color: '#000000' }}>
                  <ArticleIcon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="Articles" />}
              </ListItem>
              <ListItem
                component={Link}
                to="/admin/contact-manager"
                sx={{
                  pl: 4,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  backgroundColor: location.pathname === '/admin/contact-manager' ? '#f0f0f0' : 'transparent',
                  '&.Mui-selected': { backgroundColor: '#e0e0e0' }
                }}
              >
                <ListItemIcon sx={{ color: '#000000' }}>
                  <ContactsIcon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="Contact Information" />}
              </ListItem>
            </List>
          </Collapse>
          <ListItem
            component={Link}
            to="/admin/developer-end"
            sx={{
              cursor: 'pointer',
              my: 2,
              borderTop: '1px dashed rgba(0,0,0,0.1)',
              borderBottom: '1px dashed rgba(0,0,0,0.1)',
              backgroundColor: 'rgba(0,0,0,0.02)',
              opacity: 0.7,
              '&:hover': { 
                backgroundColor: 'rgba(0,0,0,0.05)',
                opacity: 1,
              }
            }}
          >
            <ListItemIcon sx={{ color: 'rgba(0,0,0,0.6)' }}>
              <CodeIcon />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText 
                primary={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      letterSpacing: '0.5px',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                    }}
                  >
                    {"< /DEV_ACCESS >"}
                  </Typography>
                }
              />
            )}
          </ListItem>
        </List>

        {/* Profile Section */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <ListItem 
            sx={{ 
              p: 0,
              '&:hover': { backgroundColor: 'transparent' },
              flexDirection: collapsed ? 'column' : 'row',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <ListItemIcon sx={{ minWidth: 'auto', mr: collapsed ? 0 : 2 }}>
              <div 
                className="relative group cursor-pointer"
                onClick={() => document.getElementById('profile-image-upload').click()}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={profileImage || DEFAULT_AVATAR}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = DEFAULT_AVATAR;
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </ListItemIcon>
            {!collapsed && (
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {formData.firstName} {formData.lastName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowEditModal(true)}
                    sx={{
                      p: 0.5,
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', color: 'primary.main' }}>
                  Admin
                </Typography>
              </Box>
            )}
          </ListItem>
        </Box>

        {/* Logout Button */}
        <List>
          <ListItem 
            onClick={handleLogout}
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#fff5f5' },
              color: 'error.main'
            }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" />}
          </ListItem>
        </List>
      </Drawer>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        size="medium"
        className="bg-white text-gray-800"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Profile Picture Section */}
          <div className="mb-6 flex flex-col items-center">
            <div 
              className="relative group cursor-pointer"
              onClick={() => document.getElementById('profile-image-upload').click()}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={profileImage || DEFAULT_AVATAR}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              type="file"
              id="profile-image-upload"
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {isUploading && (
              <p className="text-sm text-gray-500 mt-2">Uploading...</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <Input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <Input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AdminSidebar; 