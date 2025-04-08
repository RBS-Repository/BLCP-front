import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const DeveloperEnd = () => {
  const [count, setCount] = useState(5);
  const [showSecret, setShowSecret] = useState(false);
  const [konami, setKonami] = useState([]);
  
  useEffect(() => {
    const timer = count > 0 && setInterval(() => setCount(count - 1), 1000);
    return () => clearInterval(timer);
  }, [count]);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      setKonami(prev => {
        const updated = [...prev, e.key];
        if (updated.length > 10) updated.shift();
        
        const isKonami = updated.length === 10 && 
          updated.every((key, i) => key === konamiCode[i]);
        
        if (isKonami) setShowSecret(true);
        return updated;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 flex flex-col items-center justify-center p-4 font-mono">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="text-center max-w-3xl mx-auto"
      >
        <div className="border-2 border-green-500 p-6 md:p-10 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500 animate-pulse"></div>
          <div className="absolute top-0 right-0 w-1 h-full bg-green-500 animate-pulse"></div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-8 glitch-text">System Boundary</h1>
          
          <div className="text-left my-8 leading-relaxed">
            <p className="mb-4 typing-animation">
              <span className="text-green-300">$ ./system_status</span><br/>
              <span className="text-yellow-400">WARNING:</span> You have reached the developer boundary.
            </p>
            
            <p className="mb-4 typing-animation" style={{animationDelay: '1s'}}>
              <span className="text-green-300">$ ./access_check</span><br/>
              <span className="text-red-500">ACCESS DENIED:</span> Administrator privileges insufficient for further access.
            </p>
            
            <p className="mb-4 typing-animation" style={{animationDelay: '2s'}}>
              <span className="text-green-300">$ ./contact_info</span><br/>
              <span className="text-blue-400">INFO:</span> Please contact the development team for assistance.
            </p>
            
            <div className="border border-green-500 bg-green-900 bg-opacity-20 p-4 my-6">
              <p className="text-sm">Contact: <span className="underline">budaquecreations@gmail.com</span></p>
              <p className="text-sm">Internal reference: SYS-BOUND-{Math.floor(Math.random() * 9000) + 1000}</p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-center">
            <span className="inline-block w-3 h-3 bg-green-500 animate-ping mr-2"></span>
            {count > 0 ? (
              <p>Auto-redirecting in {count} seconds...</p>
            ) : (
              <Link 
                to="/admin/dashboard" 
                className="text-black bg-green-500 py-2 px-4 hover:bg-green-400 transition-colors"
              >
                Return to Safety
              </Link>
            )}
          </div>
          
          {showSecret && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 border border-purple-500 bg-purple-900 bg-opacity-20 text-purple-300"
            >
              <p>🎮 Konami Code Activated 🎮</p>
              <p className="text-sm mt-2">You found the secret! But there's nothing here (yet).</p>
            </motion.div>
          )}
        </div>
        
        <div className="mt-4 text-xs opacity-50">
          <p>System Version: 0.13.37 (Codename: Enigma)</p>
          <p>Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </motion.div>
      
      <style jsx>{`
        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }
        
        .typing-animation {
          overflow: hidden;
          white-space: normal;
          animation: typing 3s steps(50, end);
        }
        
        .glitch-text {
          position: relative;
          animation: glitch 3s infinite;
        }
        
        @keyframes glitch {
          0% { text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75), -0.05em -0.025em 0 rgba(0, 255, 0, 0.75), 0.025em 0.05em 0 rgba(0, 0, 255, 0.75); }
          14% { text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75), -0.05em -0.025em 0 rgba(0, 255, 0, 0.75), 0.025em 0.05em 0 rgba(0, 0, 255, 0.75); }
          15% { text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75), 0.025em 0.025em 0 rgba(0, 255, 0, 0.75), -0.05em -0.05em 0 rgba(0, 0, 255, 0.75); }
          49% { text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75), 0.025em 0.025em 0 rgba(0, 255, 0, 0.75), -0.05em -0.05em 0 rgba(0, 0, 255, 0.75); }
          50% { text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75), 0.05em 0 0 rgba(0, 255, 0, 0.75), 0 -0.05em 0 rgba(0, 0, 255, 0.75); }
          99% { text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75), 0.05em 0 0 rgba(0, 255, 0, 0.75), 0 -0.05em 0 rgba(0, 0, 255, 0.75); }
          100% { text-shadow: -0.025em 0 0 rgba(255, 0, 0, 0.75), -0.025em -0.025em 0 rgba(0, 255, 0, 0.75), -0.025em -0.05em 0 rgba(0, 0, 255, 0.75); }
        }
      `}</style>
    </div>
  );
};

export default DeveloperEnd; 