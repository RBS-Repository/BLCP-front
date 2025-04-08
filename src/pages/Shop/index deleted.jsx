import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/Shop.css';

const categories = [
  {
    id: 'skincare',
    name: 'Skincare',
    description: 'Premium skincare solutions for all skin types',
    image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=2070',
    products: ['Facial Cleanser', 'Moisturizer', 'Serum', 'Toner', 'Facial Masks']
  },
  {
    id: 'treatment',
    name: 'Treatment',
    description: 'Advanced treatments for specific skin concerns',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=2070',
    products: ['AHA/BHA Exfoliant', 'Retinol', 'Niacinamide', 'Peptides', 'Anti-Aging']
  },
  {
    id: 'sun-protection',
    name: 'Sun Protection',
    description: 'High-performance UV protection products',
    image: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?q=80&w=2070',
    products: ['Sunscreen', 'UV Protection', 'After Sun Care', 'SPF Moisturizer']
  },
  {
    id: 'body-care',
    name: 'Bodydasd Care',
    description: 'Complete body care solutions for smooth, hydrated skin',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=2070',
    products: ['Body Lotion', 'Body Wash', 'Hand Cream', 'Body Scrub']
  },
  {
    id: 'gift-sets',
    name: 'Gift Sets',
    description: 'Curated collections for gifting or personal indulgence',
    image: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?q=80&w=2070',
    products: ['Skincare Sets', 'Travel Kits', 'Special Bundles', 'Holiday Collections']
  },
  {
    id: 'accessories',
    name: 'Accessories',
    description: 'Enhance your skincare routine with premium accessories',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=2070',
    products: ['Facial Rollers', 'Gua Sha', 'Makeup Sponges', 'Applicators']
  }
];

const services = [
  {
    id: 'oem',
    name: 'OEM Manufacturing',
    description: 'Custom formulation and manufacturing services for your unique brand vision. Our Korean partners create bespoke skincare solutions tailored to your specifications.',
    icon: '🏭',
    image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?q=80&w=2070'
  },
  {
    id: 'private-label',
    name: 'Private Label',
    description: 'Ready-to-brand premium products with your identity. Choose from our existing formulations and apply your branding for a quick market entry.',
    icon: '🏷️',
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=2070'
  },
  {
    id: 'fda',
    name: 'FDA Support',
    description: 'Complete FDA registration assistance to ensure your products meet all regulatory requirements for the Philippine market with minimal hassle.',
    icon: '📋',
    image: 'https://images.unsplash.com/photo-1606376830037-3d27b993f0d9?q=80&w=2070'
  }
];

// Testimonials data
const testimonials = [
  {
    name: "Maria Santos",
    business: "Glow Beauty Co.",
    quote: "Working with BLCP transformed our business. Their Korean skincare solutions helped us launch our brand with confidence.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2187"
  },
  {
    name: "David Chen",
    business: "Pure Skin Philippines",
    quote: "The FDA support service saved us months of work. Professional, thorough, and delivered exactly what we needed.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2187"
  },
  {
    name: "Anna Cruz",
    business: "Luminous Beauty",
    quote: "Their OEM manufacturing exceeded our expectations. The product quality has our customers coming back for more.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2188"
  }
];

const ShopIndex = () => {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <header className="bg-[#363a94] py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=2070')] bg-cover bg-center bg-no-repeat"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto text-center text-white">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Product Categories
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Explore our premium Korean skincare solutions for all your beauty needs
            </motion.p>
          </div>
        </div>
      </header>

      {/* Quick Navigation */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="text-gray-600 hover:text-[#363a94] font-medium transition-colors"
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                id={category.id}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={category.image}
                    alt={category.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      hoveredCategory === category.id ? 'scale-110' : 'scale-100'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-white text-2xl font-bold">{category.name}</h3>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-700 mb-4">{category.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Popular Products:</h4>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {category.products.map((product, idx) => (
                        <li key={idx} className="flex items-center text-gray-600 text-sm">
                          <span className="w-1.5 h-1.5 bg-[#363a94] rounded-full mr-2 flex-shrink-0"></span>
                          {product}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Link
                    to={`/products?category=${category.id}`}
                    className="inline-block w-full text-center px-6 py-3 bg-[#363a94] text-white font-medium rounded-lg hover:bg-[#2a2d7a] transition-colors"
                  >
                    Browse {category.name}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Banner */}
      <section className="bg-gray-50 py-12 px-4 border-t border-b border-gray-200">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Looking for Manufacturing Services?</h2>
            <p className="text-gray-600 mb-6">
              We offer OEM manufacturing, private label solutions, and FDA registration support for your beauty brand.
            </p>
            <Link
              to="/services"
              className="inline-block px-8 py-3 bg-[#363a94] text-white font-medium rounded-full hover:bg-[#2a2d7a] transition-colors"
            >
              Explore Our Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShopIndex; 