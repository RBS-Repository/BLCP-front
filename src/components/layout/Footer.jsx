import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Parallax } from 'react-scroll-parallax';
import '../../styles/Footer.css';
import BLCPLogo from '../assets/BLCP (Blue).png';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Footer = () => {
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [contactInfo, setContactInfo] = useState({
    company: {
      name: 'Beauty Lab Cosmetic Products Corporation'
    },
    phone: '+63 (2) 8123 4567',
    email: 'blcpcorpph@gmail.com',
    address: {
      line1: '#101, Block 16, Lot 39, Fil-Am Friendship Hwy.',
      line2: 'Angeles City, Philippines'
    },
    website: 'https://www.blcpcorp.com'
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings/contact/public`);
        
        if (response.status === 200) {
          setContactInfo(response.data);
        }
      } catch (error) {
        console.error('Error fetching contact info for footer:', error);
        // If there's an error, we'll use the default values set in state
      }
    };
    
    fetchContactInfo();
  }, []);

  // Don't show footer on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // Newsletter logic would go here
    alert(`Thank you for subscribing with ${email}`);
    setEmail('');
  };

  return (
    <footer className="relative bg-white border-t border-gray-200 overflow-hidden">
      {/* Parallax Background Elements */}
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
        <Parallax speed={-10} className="absolute right-0 top-20">
          <div className="w-96 h-96 rounded-full bg-[#363a94]"></div>
        </Parallax>
        <Parallax speed={-5} className="absolute left-1/4 bottom-10">
          <div className="w-64 h-64 rounded-full bg-[#363a94]"></div>
        </Parallax>
        <Parallax speed={-15} className="absolute left-20 top-40">
          <div className="w-32 h-32 rounded-full bg-[#363a94]"></div>
        </Parallax>
      </div>
      
      {/* Main Footer */}
      <div className="relative z-10 max-w-7xl mx-auto pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Company Info */}
          <div className="md:col-span-4">
            <Parallax speed={5} className="mb-4">
              <div className="flex items-center">
                <img src={BLCPLogo} alt="BLCP Logo" className="h-10 mr-3" />
                <span className="text-2xl font-bold text-[#363a94]"></span>
              </div>
            </Parallax>
            <Parallax speed={3}>
              <p className="text-gray-600 mb-6 max-w-md">
            Beauty Lab Cosmetic Products Corporation - Your trusted partner in Korean cosmetic manufacturing and OEM solutions.
          </p>
            </Parallax>
            <Parallax speed={4}>
              <div className="flex space-x-4 mb-8">
                <a 
                  href="https://www.facebook.com/profile.php?id=61567515650606" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-[#363a94] text-white flex items-center justify-center hover:bg-[#363a94]/80 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
              </svg>
            </a>
                <a 
                  href="https://www.instagram.com/blcpcorp" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-[#363a94] text-white flex items-center justify-center hover:bg-[#363a94]/80 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
              </svg>
            </a>
                <a 
                  href="https://www.linkedin.com/company/beauty-lab-cosmetic-products-corporation" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-[#363a94] text-white flex items-center justify-center hover:bg-[#363a94]/80 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
                <a 
                  href="https://www.tiktok.com/@blcpcorp" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-[#363a94] text-white flex items-center justify-center hover:bg-[#363a94]/80 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 1 16 14">
                  <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>
                  </svg>
            </a>
          </div>
            </Parallax>
        </div>

        {/* Quick Links */}
          <Parallax speed={3} className="md:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/process" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Our Process
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Resources
                </Link>
              </li>
            </ul>
          </Parallax>

          {/* Help */}
          <Parallax speed={4} className="md:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Help</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/faq" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/schedule" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Schedule Consultation
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-[#363a94] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </Parallax>

          {/* Contact */}
          <Parallax speed={5} className="md:col-span-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h4>
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-[#363a94] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <a href={`mailto:${contactInfo.email}`} className="text-gray-600 hover:text-[#363a94] transition-colors">
                    {contactInfo.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-[#363a94] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-600">{contactInfo.phone}</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-[#363a94] mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <span className="text-gray-600">{contactInfo.address.line1}</span><br />
                  <span className="text-gray-600">{contactInfo.address.line2}</span>
                </div>
              </div>
        
            </div>

        {/* Newsletter */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex">
     
          
              </div>
          </form>
          </Parallax>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="relative z-10 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {currentYear} {contactInfo.company.name}. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 text-sm text-gray-500">
            Website design and Developed by{' '}
            <a 
              href="https://budaquecreations.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#363a94] hover:underline"
            >
              BMMC
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 