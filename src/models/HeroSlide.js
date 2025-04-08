const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
    trim: true
  },
  mobileImage: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  cta: {
    type: String,
    default: 'Learn More',
    trim: true
  },
  link: {
    type: String,
    default: '/',
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);

module.exports = HeroSlide; 