# Cloudinary Integration

This document describes how Cloudinary image upload is integrated into the application and how to use the centralized Cloudinary service.

## Environment Configuration

Cloudinary credentials are now stored in environment variables instead of being hardcoded in the application. You need to set up the following variables in your `.env` file:

```
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_CLOUDINARY_API_URL=https://api.cloudinary.com/v1_1
```

## Cloudinary Service

A centralized Cloudinary service has been created at `src/services/cloudinary.js` to handle all Cloudinary-related operations. This service provides the following functions:

### `uploadToCloudinary(file, options)`

Uploads a file to Cloudinary and returns the full response.

**Parameters:**
- `file`: The file to upload
- `options`: (Optional) Additional upload options like folder, transformation, etc.

**Returns:** Promise resolving to the full Cloudinary response object

```javascript
import { uploadToCloudinary } from '../services/cloudinary';

// Usage
const handleUpload = async (file) => {
  try {
    const result = await uploadToCloudinary(file, { folder: 'products' });
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### `uploadImage(file, options)`

Simplified version that uploads an image and returns just the secure URL.

**Parameters:**
- `file`: The file to upload
- `options`: (Optional) Additional upload options

**Returns:** Promise resolving to the secure URL string

```javascript
import { uploadImage } from '../services/cloudinary';

// Usage
const handleImageUpload = async (file) => {
  try {
    const imageUrl = await uploadImage(file);
    console.log('Image URL:', imageUrl);
  } catch (error) {
    console.error('Image upload failed:', error);
  }
};
```

### `uploadMultipleImages(files, options)`

Uploads multiple files in parallel and returns an array of secure URLs.

**Parameters:**
- `files`: Array of files to upload
- `options`: (Optional) Additional upload options

**Returns:** Promise resolving to an array of secure URL strings

```javascript
import { uploadMultipleImages } from '../services/cloudinary';

// Usage
const handleMultipleUploads = async (files) => {
  try {
    const imageUrls = await uploadMultipleImages(files, { folder: 'gallery' });
    console.log('Image URLs:', imageUrls);
  } catch (error) {
    console.error('Multiple uploads failed:', error);
  }
};
```

### `isCloudinaryUrl(url)`

Helper function to check if a URL is already a Cloudinary URL.

**Parameters:**
- `url`: The URL to check

**Returns:** Boolean indicating if the URL is from Cloudinary

```javascript
import { isCloudinaryUrl } from '../services/cloudinary';

// Usage
const url = 'https://res.cloudinary.com/your-cloud/image/upload/v1234/sample.jpg';
const isFromCloudinary = isCloudinaryUrl(url); // true
```

## Migration

The following components have been updated to use the centralized Cloudinary service:

- `src/api/heroSlides.js`
- `src/pages/EditProfile.jsx`
- `src/components/layout/AdminSidebar.jsx`

Other components that use Cloudinary should also be migrated to use this service to maintain consistency and make future changes easier.

## Benefits of This Approach

1. **Centralization**: All Cloudinary logic is in one place
2. **Configuration**: Uses environment variables instead of hardcoded values
3. **Maintainability**: Easier to update or change Cloudinary configuration
4. **Error Handling**: Consistent error handling across the application
5. **Features**: Additional helpful functions like uploading multiple images 