import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheckIcon, UserGroupIcon, LockClosedIcon, DocumentTextIcon, UserIcon } from '@heroicons/react/24/outline';

const Privacy = () => {
  const sections = [
    {
      id: 1,
      title: "Information We Collect",
      icon: <DocumentTextIcon className="w-6 h-6" />,
      content: (
        <>
          <p className="mb-4">We collect information that you provide directly to us, including:</p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>Name and contact information</li>
            <li>Business documentation and credentials</li>
            <li>Account login information</li>
            <li>Order history and preferences</li>
            <li>Payment information</li>
          </ul>
        </>
      )
    },
    {
      id: 2,
      title: "How We Use Your Information",
      icon: <UserGroupIcon className="w-6 h-6" />,
      content: (
        <>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>Process your orders and transactions</li>
            <li>Verify your business credentials</li>
            <li>Communicate with you about your orders</li>
            <li>Send you marketing communications (with your consent)</li>
            <li>Improve our services and products</li>
          </ul>
        </>
      )
    },
    {
      id: 3,
      title: "Information Sharing",
      icon: <UserGroupIcon className="w-6 h-6" />,
      content: (
        <>
          <p>
            We do not sell or rent your personal information to third parties. We may share your information with:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>Service providers who assist in our operations</li>
            <li>Professional advisers and auditors</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </>
      )
    },
    {
      id: 4,
      title: "Data Security",
      icon: <LockClosedIcon className="w-6 h-6" />,
      content: (
        <>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information
            against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </>
      )
    },
    {
      id: 5,
      title: "Your Rights",
      icon: <UserIcon className="w-6 h-6" />,
      content: (
        <>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </>
      )
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-600">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#363a94] text-white font-semibold text-sm mr-3">
                  {section.id}
                </span>
                <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
              </div>
              <div className="pl-11">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Privacy; 