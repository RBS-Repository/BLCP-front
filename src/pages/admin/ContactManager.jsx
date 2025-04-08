import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  Container,
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  MenuItem,
  Divider,
  InputAdornment,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  useTheme,
  alpha,
  Fade,
  Chip,
  Snackbar,
  Alert,
  Zoom,
  Fab
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Predefined time options for dropdown
const timeOptions = [
  'Closed',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM'
];

// Add validation rules
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone) => {
  return /^[\d\+\-\(\) ]{7,20}$/.test(phone);
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

const ContactManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const theme = useTheme();
  
  // Default contact information
  const defaultContactInfo = {
    company: {
      name: 'Beauty Lab Cosmetic Products Corporation'
    },
    phone: '+63 917 117 8146',
    email: 'blcpcorpph@gmail.com',
    address: {
      line1: '#101, Block 16, Lot 39, Fil-Am Friendship Hwy.',
      line2: 'Angeles City, Philippines'
    },
    website: 'https://www.blcpcorp.com',
    businessHours: {
      mondayToFriday: {
        open: '09:00 AM',
        close: '06:00 PM'
      },
      saturday: {
        open: '09:00 AM',
        close: '01:00 PM'
      },
      sunday: {
        open: 'Closed',
        close: 'Closed'
      }
    }
  };
  
  const [contactInfo, setContactInfo] = useState(defaultContactInfo);
  
  // Add validation state
  const [errors, setErrors] = useState({
    company: { name: false },
    phone: false,
    email: false,
    address: { line1: false },
    website: false
  });
  
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setLoading(true);
        if (!user) return;
        
        const token = await user.getIdToken();
        
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings/contact`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.status === 200) {
            setContactInfo(response.data);
          }
        } catch (error) {
          console.log('Contact info not found in database, using default settings');
          
          // Initialize the content in the database with the default structure
          try {
            const initResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/settings/contact/init`, defaultContactInfo, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('Initialized default contact info in database');
          } catch (initError) {
            console.log('Could not initialize contact info:', initError.response?.data?.message || initError.message);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load contact information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContactInfo();
  }, [user]);
  
  const handleChange = (section, field, value) => {
    if (section === 'company') {
      setContactInfo({
        ...contactInfo,
        company: {
          ...contactInfo.company,
          [field]: value
        }
      });
    } else if (section === 'address') {
      setContactInfo({
        ...contactInfo,
        address: {
          ...contactInfo.address,
          [field]: value
        }
      });
    } else if (section.startsWith('businessHours.')) {
      const [_, day, timeField] = section.split('.');
      setContactInfo({
        ...contactInfo,
        businessHours: {
          ...contactInfo.businessHours,
          [day]: {
            ...contactInfo.businessHours[day],
            [timeField]: value
          }
        }
      });
    } else {
      setContactInfo({
        ...contactInfo,
        [section]: value
      });
    }
  };
  
  const handleTimeChange = (day, timeField, newValue) => {
    setContactInfo({
      ...contactInfo,
      businessHours: {
        ...contactInfo.businessHours,
        [day]: {
          ...contactInfo.businessHours[day],
          [timeField]: newValue
        }
      }
    });
  };
  
  // Enhanced validation before saving
  const validateForm = () => {
    const newErrors = {
      company: { name: !contactInfo.company.name },
      phone: !contactInfo.phone || !isValidPhone(contactInfo.phone),
      email: !contactInfo.email || !isValidEmail(contactInfo.email),
      address: { line1: !contactInfo.address.line1 },
      website: contactInfo.website && !isValidUrl(contactInfo.website)
    };
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(error => 
      typeof error === 'object' 
        ? Object.values(error).some(val => val === true)
        : error === true
    );
  };
  
  const handleSave = async () => {
    // Validate form before saving
    if (!validateForm()) {
      // Show validation error toast
      return;
    }
    
    setSaving(true);
    try {
      const token = await user.getIdToken();
      
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/settings/contact`, contactInfo, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200) {
        setSaveSuccess(true);
        setEditMode(false);
        toast.success('Contact information updated successfully');
      }
    } catch (error) {
      console.error('Error updating contact settings:', error);
      toast.error('Failed to update contact information');
      // Implement error handling
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    // Revert changes by reloading the original data
    fetchContactInfo();
    setEditMode(false);
  };
  
  const getCurrentDay = () => {
    const days = ['sunday', 'mondayToFriday', 'mondayToFriday', 'mondayToFriday', 'mondayToFriday', 'mondayToFriday', 'saturday'];
    const dayIndex = new Date().getDay();
    return days[dayIndex];
  };
  
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
        }}
      >
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 8,
            px: 4,
            background: '#f9fafb',
          }}
        >
          <LinearProgress sx={{ 
            height: 6, 
            borderRadius: 3,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: 'linear-gradient(90deg, #3f51b5, #2196f3)'
            }
          }} />
          <Typography variant="h4" gutterBottom align="center" sx={{ mt: 4, fontWeight: 600, color: '#333' }}>
            Loading Contact Settings...
          </Typography>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        backgroundColor: 'background.default'
      }}
    >
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 4,
          px: 4,
        }}
      >
        <Container maxWidth="lg">
          {/* Header Section with Status */}
          <Paper
            elevation={0}
            sx={{
              p: 3, 
              mb: 4,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)',
              color: 'white',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Background pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '300px',
              height: '300px',
              opacity: 0.1,
              transform: 'translate(30%, -50%)',
              background: 'radial-gradient(circle, white 10%, transparent 10%) 0 0, radial-gradient(circle, white 10%, transparent 10%) 8px 8px',
              backgroundSize: '16px 16px',
              zIndex: 0
            }} />
            
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                Contact Information Settings
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: '600px' }}>
                Manage your business contact details and hours. This information will be displayed on your Contact page.
              </Typography>
            </Box>
            
            <Box sx={{ 
              position: 'relative', 
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2 
            }}>
              {saveSuccess && (
                <Fade in={saveSuccess}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Saved successfully"
                    sx={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 500,
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                </Fade>
              )}
              
              {/* Action Buttons */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 2, 
                mt: 4,
                position: 'sticky',
                bottom: theme.spacing(3),
                zIndex: 10
              }}>
                {editMode ? (
                  <Fade in={editMode}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={handleCancel}
                        startIcon={<CancelIcon />}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        startIcon={<SaveIcon />}
                        disabled={saving}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1,
                          boxShadow: '0 4px 14px rgba(63, 81, 181, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(63, 81, 181, 0.25)'
                          }
                        }}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </Fade>
                ) : (
                  <Zoom in={!editMode}>
                    <Fab
                      variant="extended"
                      color="primary"
                      onClick={() => setEditMode(true)}
                      sx={{
                        boxShadow: '0 4px 20px rgba(63, 81, 181, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 25px rgba(63, 81, 181, 0.35)'
                        },
                        px: 3
                      }}
                    >
                      <EditIcon sx={{ mr: 1 }} />
                      Edit Contact Info
                    </Fab>
                  </Zoom>
                )}
              </Box>
            </Box>
          </Paper>
          
          {/* Status bar displaying edit mode */}
          {editMode && (
            <Box sx={{ 
              mb: 4, 
              p: 2, 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: alpha(theme.palette.warning.light, 0.1),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EditIcon color="warning" />
                <Typography variant="body1" color="warning.dark" fontWeight={500}>
                  You are in edit mode. Make your changes and save when finished.
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Company Information Section - with validation */}
          <Paper
            sx={{
              p: 0,
              mt: 4,
              overflow: 'hidden',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}
          >
            <Box sx={{
              p: 3,
              background: 'linear-gradient(90deg, rgba(63, 81, 181, 0.05), rgba(33, 150, 243, 0.05))',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <BusinessIcon sx={{
                color: '#3f51b5',
                background: 'white',
                p: 1,
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }} />
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)' }}>
                Company Information
              </Typography>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Company Name"
                    value={contactInfo.company.name}
                    onChange={(e) => handleChange('company', 'name', e.target.value)}
                    disabled={!editMode}
                    required
                    error={editMode && errors.company.name}
                    helperText={editMode && errors.company.name && "Company name is required"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon color={errors.company.name ? "error" : "primary"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.15)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Phone Number"
                    value={contactInfo.phone}
                    onChange={(e) => handleChange('phone', null, e.target.value)}
                    disabled={!editMode}
                    required
                    error={editMode && errors.phone}
                    helperText={editMode && errors.phone && "Valid phone number is required"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color={errors.phone ? "error" : "primary"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.15)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Email Address"
                    value={contactInfo.email}
                    onChange={(e) => handleChange('email', null, e.target.value)}
                    disabled={!editMode}
                    required
                    error={editMode && errors.email}
                    helperText={editMode && errors.email && "Valid email address is required"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color={errors.email ? "error" : "primary"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.15)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Website"
                    value={contactInfo.website}
                    onChange={(e) => handleChange('website', null, e.target.value)}
                    disabled={!editMode}
                    error={editMode && errors.website}
                    helperText={editMode && errors.website && "Please enter a valid URL (e.g., https://example.com)"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LanguageIcon color={errors.website ? "error" : "primary"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.15)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Address Line 1"
                    value={contactInfo.address.line1}
                    onChange={(e) => handleChange('address', 'line1', e.target.value)}
                    disabled={!editMode}
                    required
                    error={editMode && errors.address.line1}
                    helperText={editMode && errors.address.line1 && "Address is required"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon color={errors.address.line1 ? "error" : "primary"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.15)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Address Line 2"
                    value={contactInfo.address.line2}
                    onChange={(e) => handleChange('address', 'line2', e.target.value)}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.15)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        }
                      }
                    }}
                  />
                </Grid>
                
                {editMode && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      background: alpha(theme.palette.info.light, 0.1),
                      p: 2,
                      borderRadius: 2,
                    }}>
                      <InfoIcon sx={{ color: theme.palette.info.main, mr: 2 }} />
                      <Typography variant="body2" color="info.main">
                        Set hours to "Closed" for days when your business is not open. For consistency, also set the closing time to "Closed" on those days.
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>
          
          {/* Business Hours Section */}
          <Paper
            sx={{
              p: 0,
              mt: 4,
              overflow: 'hidden',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}
          >
            <Box sx={{
              p: 3,
              background: 'linear-gradient(90deg, rgba(63, 81, 181, 0.05), rgba(33, 150, 243, 0.05))',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <AccessTimeIcon sx={{
                color: '#3f51b5',
                background: 'white',
                p: 1,
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }} />
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)' }}>
                Business Hours
              </Typography>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', backgroundColor: alpha(theme.palette.info.light, 0.1), p: 2, borderRadius: 2 }}>
                <InfoIcon sx={{ color: theme.palette.info.main, mr: 2 }} />
                <Typography variant="body2" color="info.main">
                  Set hours to "Closed" for days when your business is not open.
                </Typography>
              </Box>
              
              <Grid container spacing={4}>
                {/* Monday to Friday */}
                <Grid item xs={12}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      mb: 2,
                      borderRadius: 2,
                      borderColor: getCurrentDay() === 'mondayToFriday' 
                        ? theme.palette.primary.main 
                        : alpha(theme.palette.divider, 0.5),
                      background: getCurrentDay() === 'mondayToFriday' 
                        ? alpha(theme.palette.primary.light, 0.05)
                        : 'white',
                      boxShadow: getCurrentDay() === 'mondayToFriday'
                        ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between'
                      }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            color: getCurrentDay() === 'mondayToFriday' 
                              ? theme.palette.primary.main
                              : 'text.primary',
                            fontWeight: 600,
                            m: 0
                          }}
                        >
                          Monday - Friday
                        </Typography>
                        
                        {getCurrentDay() === 'mondayToFriday' && (
                          <Chip 
                            label="Today" 
                            size="small"
                            color="primary"
                            sx={{ 
                              height: 24,
                              borderRadius: 1.5,
                              fontWeight: 500
                            }}
                          />
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            label="Opening Time"
                            value={contactInfo.businessHours.mondayToFriday.open}
                            onChange={(e) => handleTimeChange('mondayToFriday', 'open', e.target.value)}
                            disabled={!editMode}
                            variant={editMode ? "outlined" : "filled"}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">
                                <AccessTimeIcon color="primary" sx={{ opacity: 0.7 }} />
                              </InputAdornment>,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                background: editMode ? 'white' : alpha(theme.palette.primary.light, 0.05)
                              },
                              '& .MuiInputBase-root.Mui-disabled': {
                                background: alpha(theme.palette.grey[200], 0.5),
                                color: theme.palette.text.primary,
                                opacity: 0.8,
                                borderRadius: 2
                              },
                              '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center'
                              }
                            }}
                          >
                            {timeOptions.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time === 'Closed' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                    <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                                    {time}
                                  </Box>
                                ) : (
                                  time
                                )}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            label="Closing Time"
                            value={contactInfo.businessHours.mondayToFriday.close}
                            onChange={(e) => handleTimeChange('mondayToFriday', 'close', e.target.value)}
                            disabled={!editMode}
                            variant={editMode ? "outlined" : "filled"}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">
                                <AccessTimeIcon color="primary" sx={{ opacity: 0.7 }} />
                              </InputAdornment>,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                background: editMode ? 'white' : alpha(theme.palette.primary.light, 0.05)
                              },
                              '& .MuiInputBase-root.Mui-disabled': {
                                background: alpha(theme.palette.grey[200], 0.5),
                                color: theme.palette.text.primary,
                                opacity: 0.8,
                                borderRadius: 2
                              },
                              '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center'
                              }
                            }}
                          >
                            {timeOptions.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time === 'Closed' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                    <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                                    {time}
                                  </Box>
                                ) : (
                                  time
                                )}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Saturday */}
                <Grid item xs={12}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      mb: 2,
                      borderRadius: 2,
                      borderColor: getCurrentDay() === 'saturday' 
                        ? theme.palette.primary.main 
                        : alpha(theme.palette.divider, 0.5),
                      background: getCurrentDay() === 'saturday' 
                        ? alpha(theme.palette.primary.light, 0.05)
                        : 'white',
                      boxShadow: getCurrentDay() === 'saturday'
                        ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between'
                      }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            color: getCurrentDay() === 'saturday' 
                              ? theme.palette.primary.main
                              : 'text.primary',
                            fontWeight: 600,
                            m: 0
                          }}
                        >
                          Saturday
                        </Typography>
                        
                        {getCurrentDay() === 'saturday' && (
                          <Chip 
                            label="Today" 
                            size="small"
                            color="primary"
                            sx={{ 
                              height: 24,
                              borderRadius: 1.5,
                              fontWeight: 500
                            }}
                          />
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            label="Opening Time"
                            value={contactInfo.businessHours.saturday.open}
                            onChange={(e) => handleTimeChange('saturday', 'open', e.target.value)}
                            disabled={!editMode}
                            variant={editMode ? "outlined" : "filled"}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">
                                <AccessTimeIcon color="primary" sx={{ opacity: 0.7 }} />
                              </InputAdornment>,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                background: editMode ? 'white' : alpha(theme.palette.primary.light, 0.05)
                              },
                              '& .MuiInputBase-root.Mui-disabled': {
                                background: alpha(theme.palette.grey[200], 0.5),
                                color: theme.palette.text.primary,
                                opacity: 0.8,
                                borderRadius: 2
                              },
                              '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center'
                              }
                            }}
                          >
                            {timeOptions.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time === 'Closed' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                    <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                                    {time}
                                  </Box>
                                ) : (
                                  time
                                )}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            label="Closing Time"
                            value={contactInfo.businessHours.saturday.close}
                            onChange={(e) => handleTimeChange('saturday', 'close', e.target.value)}
                            disabled={!editMode || contactInfo.businessHours.saturday.open === 'Closed'}
                            variant={editMode ? "outlined" : "filled"}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">
                                <AccessTimeIcon color="primary" sx={{ opacity: 0.7 }} />
                              </InputAdornment>,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                background: editMode ? 'white' : alpha(theme.palette.primary.light, 0.05)
                              },
                              '& .MuiInputBase-root.Mui-disabled': {
                                background: alpha(theme.palette.grey[200], 0.5),
                                color: theme.palette.text.primary,
                                opacity: 0.8,
                                borderRadius: 2
                              },
                              '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center'
                              }
                            }}
                          >
                            {timeOptions.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time === 'Closed' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                    <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                                    {time}
                                  </Box>
                                ) : (
                                  time
                                )}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Sunday */}
                <Grid item xs={12}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 2,
                      borderColor: getCurrentDay() === 'sunday' 
                        ? theme.palette.primary.main 
                        : alpha(theme.palette.divider, 0.5),
                      background: getCurrentDay() === 'sunday' 
                        ? alpha(theme.palette.primary.light, 0.05)
                        : contactInfo.businessHours.sunday.open === 'Closed' 
                          ? alpha(theme.palette.error.light, 0.05)
                          : 'white',
                      boxShadow: getCurrentDay() === 'sunday'
                        ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        justifyContent: 'space-between'
                      }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            color: contactInfo.businessHours.sunday.open === 'Closed' && !getCurrentDay() === 'sunday'
                              ? theme.palette.error.main
                              : getCurrentDay() === 'sunday' 
                                ? theme.palette.primary.main
                                : 'text.primary',
                            fontWeight: 600,
                            m: 0
                          }}
                        >
                          Sunday
                        </Typography>
                        
                        {contactInfo.businessHours.sunday.open === 'Closed' && !getCurrentDay() === 'sunday' ? (
                          <Chip 
                            label="Closed" 
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ 
                              height: 24,
                              borderRadius: 1.5,
                              fontWeight: 500
                            }}
                          />
                        ) : getCurrentDay() === 'sunday' && (
                          <Chip 
                            label="Today" 
                            size="small"
                            color="primary"
                            sx={{ 
                              height: 24,
                              borderRadius: 1.5,
                              fontWeight: 500
                            }}
                          />
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            label="Opening Time"
                            value={contactInfo.businessHours.sunday.open}
                            onChange={(e) => handleTimeChange('sunday', 'open', e.target.value)}
                            disabled={!editMode}
                            variant={editMode ? "outlined" : "filled"}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">
                                <AccessTimeIcon 
                                  color={contactInfo.businessHours.sunday.open === 'Closed' ? "error" : "primary"} 
                                  sx={{ opacity: 0.7 }} 
                                />
                              </InputAdornment>,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                background: editMode ? 'white' : alpha(theme.palette.primary.light, 0.05)
                              },
                              '& .MuiInputBase-root.Mui-disabled': {
                                background: alpha(theme.palette.grey[200], 0.5),
                                color: theme.palette.text.primary,
                                opacity: 0.8,
                                borderRadius: 2
                              },
                              '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center',
                                color: contactInfo.businessHours.sunday.open === 'Closed' && !editMode 
                                  ? theme.palette.error.main 
                                  : 'inherit'
                              }
                            }}
                          >
                            {timeOptions.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time === 'Closed' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                    <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                                    {time}
                                  </Box>
                                ) : (
                                  time
                                )}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            label="Closing Time"
                            value={contactInfo.businessHours.sunday.close}
                            onChange={(e) => handleTimeChange('sunday', 'close', e.target.value)}
                            disabled={!editMode || contactInfo.businessHours.sunday.open === 'Closed'}
                            variant={editMode ? "outlined" : "filled"}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">
                                <AccessTimeIcon 
                                  color={contactInfo.businessHours.sunday.close === 'Closed' ? "error" : "primary"} 
                                  sx={{ opacity: 0.7 }} 
                                />
                              </InputAdornment>,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                background: editMode ? 'white' : alpha(theme.palette.primary.light, 0.05)
                              },
                              '& .MuiInputBase-root.Mui-disabled': {
                                background: alpha(theme.palette.grey[200], 0.5),
                                color: theme.palette.text.primary,
                                opacity: 0.8,
                                borderRadius: 2
                              },
                              '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center',
                                color: contactInfo.businessHours.sunday.close === 'Closed' && !editMode 
                                  ? theme.palette.error.main 
                                  : 'inherit'
                              }
                            }}
                          >
                            {timeOptions.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time === 'Closed' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                    <CloseIcon fontSize="small" sx={{ mr: 1 }} />
                                    {time}
                                  </Box>
                                ) : (
                                  time
                                )}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {editMode && (
                <Box sx={{ 
                  mt: 3, 
                  display: 'flex', 
                  alignItems: 'center',
                  backgroundColor: alpha(theme.palette.warning.light, 0.1),
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                }}>
                  <InfoIcon sx={{ color: theme.palette.warning.main, mr: 2 }} />
                  <Typography variant="body2" color="warning.dark">
                    When setting a day to "Closed", the closing time will automatically be set to "Closed" as well.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default ContactManager; 