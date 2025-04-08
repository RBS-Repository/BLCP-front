import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8"
    >
      {/* Header Section */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link 
          to="/"
          className="inline-flex items-center text-[#363a94] hover:text-[#2a2e75] mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Terms of Service
        </h1>
        <p className="text-lg text-gray-600">
          Please read these terms carefully before using our services.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* Table of Contents */}
          <div className="bg-gray-50 p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Navigation</h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['Acceptance of Terms', 'Account Registration', 'User Responsibilities', 
                'Product Orders', 'Pricing and Payment', 'Termination'].map((item, index) => (
                <a 
                  key={index}
                  href={`#section-${index + 1}`}
                  className="text-[#363a94] hover:text-[#2a2e75] hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                >
                  {index + 1}. {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Content Sections */}
          <div className="p-6 sm:p-8 space-y-8">
            <section id="section-1" className="scroll-mt-16">
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">1</span>
                <h2 className="text-2xl font-bold text-gray-900">Acceptance of Terms</h2>
              </div>
              <div className="pl-11">
                <p className="text-gray-600 leading-relaxed">
                  By accessing and using BLCP (Beauty Lab Cosmetic Products), you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our services.
                </p>
              </div>
            </section>

            <section id="section-2" className="scroll-mt-16">
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">2</span>
                <h2 className="text-2xl font-bold text-gray-900">Account Registration</h2>
              </div>
              <div className="pl-11">
                <p className="text-gray-600 leading-relaxed">
                  To use certain features of our service, you must register for an account. You agree to provide accurate,
                  current, and complete information during registration and to update such information to keep it accurate,
                  current, and complete.
                </p>
              </div>
            </section>

            <section id="section-3" className="scroll-mt-16">
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">3</span>
                <h2 className="text-2xl font-bold text-gray-900">User Responsibilities</h2>
              </div>
              <div className="pl-11">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Provide accurate business documentation when required</li>
                  <li>Use the service in compliance with all applicable laws</li>
                  <li>Not engage in any unauthorized reselling of products</li>
                </ul>
              </div>
            </section>

            <section id="section-4" className="scroll-mt-16">
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">4</span>
                <h2 className="text-2xl font-bold text-gray-900">Product Orders</h2>
              </div>
              <div className="pl-11">
                <p className="text-gray-600 leading-relaxed">
                  All orders are subject to acceptance and availability. We reserve the right to refuse service to anyone
                  for any reason at any time.
                </p>
              </div>
            </section>

            <section id="section-5" className="scroll-mt-16">
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">5</span>
                <h2 className="text-2xl font-bold text-gray-900">Pricing and Payment</h2>
              </div>
              <div className="pl-11">
                <p className="text-gray-600 leading-relaxed">
                  All prices are subject to change without notice. Payment must be received prior to the acceptance of an order.
                </p>
              </div>
            </section>

            <section id="section-6" className="scroll-mt-16">
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">6</span>
                <h2 className="text-2xl font-bold text-gray-900">Termination</h2>
              </div>
              <div className="pl-11">
                <p className="text-gray-600 leading-relaxed">
                  We reserve the right to terminate or suspend your account and access to our services at our sole discretion,
                  without notice, for conduct that we believe violates these Terms of Service or is harmful to other users,
                  us, or third parties, or for any other reason.
                </p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <div className="flex space-x-4">
                <Link to="/privacy" className="text-[#363a94] hover:text-[#2a2e75] text-sm font-medium">
                  Privacy Policy
                </Link>
                <span className="text-gray-300">|</span>
                <Link to="/contact" className="text-[#363a94] hover:text-[#2a2e75] text-sm font-medium">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Terms; 