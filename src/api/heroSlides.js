import client from './client';
import { uploadImage as cloudinaryUploadImage } from '../services/cloudinary';

// Get all hero slides sorted by order
export const fetchHeroSlides = async () => {
  try {
    const response = await client.get('/hero-slides');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create a new hero slide
export const createHeroSlide = async (slideData) => {
  try {
    const response = await client.post('/hero-slides', slideData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update a hero slide
export const updateHeroSlide = async (slideId, slideData) => {
  try {
    const response = await client.put(`/hero-slides/${slideId}`, slideData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete a hero slide
export const deleteHeroSlide = async (slideId) => {
  try {
    const response = await client.delete(`/hero-slides/${slideId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update the order of multiple slides
export const updateSlidesOrder = async (slidesWithOrder) => {
  try {
    const response = await client.put('/hero-slides/order', { slides: slidesWithOrder });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Upload image to Cloudinary
export const uploadImage = async (file) => {
  try {
    return await cloudinaryUploadImage(file);
  } catch (error) {
    console.error('Error in heroSlides uploadImage:', error);
    throw error;
  }
}; 