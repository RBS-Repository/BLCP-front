import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import viteCompression from 'vite-plugin-compression'
import viteImagemin from 'vite-plugin-imagemin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react({
        // Add fast refresh options to improve hot reload performance
        fastRefresh: true,
        babel: {
          plugins: [
            // Remove prop-types in production for smaller bundles
            isProd && [
              'transform-react-remove-prop-types',
              { removeImport: true },
            ],
          ].filter(Boolean),
        },
      }),
      // Compress assets with gzip and brotli
      viteCompression({ 
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024, // Lower threshold to 1KB for better compression coverage
        deleteOriginFile: false,
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024, // Lower threshold to 1KB for better compression coverage
        deleteOriginFile: false,
      }),
      // Image optimization
      viteImagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false,
        },
        optipng: {
          optimizationLevel: 7,
        },
        mozjpeg: {
          quality: 80,
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4,
        },
        webp: {
          quality: 75,
        },
        svgo: {
          plugins: [
            {
              name: 'removeViewBox',
              active: false,
            },
            {
              name: 'removeEmptyAttrs',
              active: false,
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProd,
      rollupOptions: {
        output: {
          // Improved chunking strategy to reduce main thread work
          manualChunks: (id) => {
            // Core framework chunks
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            
            // Router-related chunks
            if (id.includes('node_modules/react-router')) {
              return 'vendor-router';
            }
            
            // UI-related chunks
            if (id.includes('node_modules/@mui') || 
                id.includes('node_modules/@emotion') ||
                id.includes('node_modules/@material-tailwind')) {
              return 'vendor-ui';
            }
            
            // Animation/visual chunks
            if (id.includes('node_modules/framer-motion') || 
                id.includes('node_modules/swiper') ||
                id.includes('node_modules/react-parallax')) {
              return 'vendor-animations';
            }
            
            // Chart libraries
            if (id.includes('node_modules/chart.js') || 
                id.includes('node_modules/recharts')) {
              return 'vendor-charts';
            }

            // Form/utility libraries
            if (id.includes('node_modules/lodash') ||
                id.includes('node_modules/date-fns')) {
              return 'vendor-utils';
            }
            
            // All other node_modules
            if (id.includes('node_modules')) {
              return 'vendor-others';
            }
          },
          // Minimize asset size
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
        input: {
          main: 'index.html'
        },
      },
      emptyOutDir: true,
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd, // Remove console in production
          drop_debugger: isProd, // Remove debugger in production
          pure_funcs: isProd ? [
            'console.log', 
            'console.debug', 
            'console.info', 
            'console.warn',
            'console.error',
            'console.trace',
            'console.time',
            'console.timeEnd'
          ] : [], // Remove all console calls in production
          passes: 3, // Additional compression passes for better minification
        },
        mangle: true, // Better name mangling
        format: {
          comments: false, // Remove all comments
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // 4kb
      reportCompressedSize: false, // Disable compressed size reporting for faster builds
      // Add target for better browser compatibility
      target: 'es2015',
      modulePreload: {
        polyfill: true, // Add modulepreload polyfill
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      },
      historyApiFallback: true,
      open: true
    },
    css: {
      postcss: './postcss.config.js',
      devSourcemap: !isProd, // Only generate source maps in development
    },
    optimizeDeps: {
      include: [
        'tailwindcss', 
        '@emotion/react', 
        '@emotion/styled', 
        'react', 
        'react-dom', 
        'react-router-dom',
        'framer-motion',
        'lodash',
        'scheduler'
      ],
      esbuildOptions: {
        target: 'es2020', // Modern JS syntax for better tree-shaking
      },
    },
    define: {
      // Define environment variables more explicitly
      '__DEV__': !isProd,
      '__PROD__': isProd,
      // Use a more consistent approach for environment variables
      'process.env.NODE_ENV': JSON.stringify(mode),
    }
  };
});
