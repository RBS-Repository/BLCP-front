import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  minOrder: { type: Number, default: 0 },
  targetMarketKeyFeatures: { type: [String], default: [] },
  targetMarket: { type: [String], default: [] },
  image: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { 
  timestamps: true,
  strict: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Add a pre-save middleware to ensure stock is a number
productSchema.pre('save', function(next) {
  if (this.stock === undefined) {
    this.stock = 0;
  }
  this.stock = Number(this.stock);
  next();
});

// Add a pre-validate hook to check stock value
productSchema.pre('validate', function(next) {
  console.log('Pre-validate hook - Stock value:', this.stock);
  next();
});

export default mongoose.model('Product', productSchema); 