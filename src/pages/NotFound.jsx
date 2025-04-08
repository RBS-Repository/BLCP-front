import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const NotFound = () => {
  const [emoji, setEmoji] = useState("😕");
  const [wittyMessage, setWittyMessage] = useState("");
  const [fadeIn, setFadeIn] = useState(false);

  // List of witty error messages
  const wittyMessages = [
    "Looks like this page is playing hide and seek... and winning!",
    "Houston, we have a problem. Page not in orbit.",
    "This page has left the chat.",
    "Error 404: Page went on vacation without telling anyone.",
    "You've reached the edge of our digital universe!",
    "Our hamsters couldn't find the page you requested.",
    "This page must be camera shy."
  ];

  // Emojis for different states
  const emojis = {
    default: ["😕", "🤔", "😮", "🧐", "👀"],
    hover: ["😮", "😲", "🤯", "😵", "😵‍💫"]
  };

  useEffect(() => {
    // Pick a random witty message
    setWittyMessage(wittyMessages[Math.floor(Math.random() * wittyMessages.length)]);
    
    // Trigger fade-in animation
    setFadeIn(true);
    
    // Setup emoji face changer interval
    const emojiInterval = setInterval(() => {
      // Occasionally change the emoji face
      if (Math.random() > 0.7) {
        setEmoji(emojis.default[Math.floor(Math.random() * emojis.default.length)]);
      }
    }, 2000);
    
    return () => clearInterval(emojiInterval);
  }, []);

  // Handle emoji hover
  const handleEmojiHover = () => {
    setEmoji(emojis.hover[Math.floor(Math.random() * emojis.hover.length)]);
  };
  
  // Reset emoji on mouse leave
  const handleEmojiLeave = () => {
    setEmoji(emojis.default[0]);
  };

  // Framer Motion animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const floatingFragments = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    text: ['<div>', '</div>', '<404/>', '{ error }', '<missing>', '<!--page-->', 'undefined'][Math.floor(Math.random() * 7)],
    size: Math.random() * 14 + 10,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    rotate: Math.random() * 360,
    duration: Math.random() * 20 + 10,
    xOffset: Math.random() * 100 - 50,
    yOffset: Math.random() * 100 - 50
  }));

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/products", label: "Products" },
    { path: "/about", label: "About Us" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex flex-col items-center justify-center relative overflow-hidden px-4 py-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background code fragments */}
      {floatingFragments.map((fragment) => (
        <motion.div
          key={fragment.id}
          className="absolute font-mono font-bold text-indigo-900/10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 0.8,
            rotate: [fragment.rotate, fragment.rotate + 180, fragment.rotate],
            x: [0, fragment.xOffset, 0],
            y: [0, fragment.yOffset, 0]
          }}
          transition={{ 
            duration: fragment.duration,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            fontSize: `${fragment.size}px`,
            top: fragment.top,
            left: fragment.left
          }}
        >
          {fragment.text}
        </motion.div>
      ))}

      {/* Decorative circles */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/5"
        style={{ top: '5%', left: '10%' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5"
        style={{ bottom: '10%', right: '5%' }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full bg-blue-500/5"
        style={{ top: '40%', right: '15%' }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 7, repeat: Infinity, delay: 2 }}
      />

      {/* Lost character animation */}
      <motion.div
        className="absolute bottom-10 text-4xl"
        initial={{ x: -50, opacity: 0 }}
        animate={{ 
          x: ["calc(-5vw)", "calc(105vw)", "calc(105vw)", "calc(-5vw)", "calc(-5vw)"],
          scaleX: [1, 1, -1, -1, 1],
          opacity: 1
        }}
        transition={{ 
          duration: 20, 
          times: [0, 0.45, 0.5, 0.95, 1],
          repeat: Infinity,
          ease: "linear"
        }}
      >
        🔍👤
      </motion.div>

      {/* 404 with emoji - directly on background */}
      <motion.div
        className="relative inline-block mb-8"
        variants={itemVariants}
      >
        <motion.div
          className="text-[10rem] md:text-[15rem] font-black text-indigo-600/10 tracking-tighter"
          animate={{ 
            scale: [1, 1.01, 0.99, 1],
            rotate: [0, 0.5, -0.5, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          404
        </motion.div>
        
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-7xl md:text-9xl cursor-pointer"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          onMouseEnter={handleEmojiHover}
          onMouseLeave={handleEmojiLeave}
        >
          {emoji}
        </motion.div>
      </motion.div>
      
      {/* Content - directly on background */}
      <div className="text-center max-w-3xl z-10">
        {/* Page title */}
        <motion.h1 
          className="text-3xl md:text-5xl font-bold text-indigo-700 mb-6"
          variants={itemVariants}
        >
          Page Not Found
        </motion.h1>
        
        {/* Witty message */}
        <motion.p 
          className="text-lg md:text-xl text-indigo-900/70 font-medium italic mb-12 max-w-2xl mx-auto"
          variants={itemVariants}
        >
          {wittyMessage}
        </motion.p>
        
        {/* Navigation options */}
        <motion.div variants={itemVariants} className="mb-12">
          <p className="text-indigo-700 font-medium mb-5">Explore these pages instead:</p>
          
          <div className="flex flex-wrap justify-center gap-3">
            {navLinks.map((link, index) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-6 py-3 bg-white/50 backdrop-blur-sm border border-indigo-100 text-indigo-700 rounded-xl text-base font-medium
                          hover:bg-white hover:border-indigo-200 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
        
        {/* Main CTA */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
      
        </motion.div>
      </div>
    </motion.div>
  );
};

export default NotFound;