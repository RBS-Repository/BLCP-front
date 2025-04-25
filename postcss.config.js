export default ({ env }) => ({
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(env === 'production' ? {
      '@fullhuman/postcss-purgecss': {
        content: [
          './src/**/*.{js,jsx,ts,tsx}',
          './index.html',
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: [
          /-(leave|enter|appear)(|-(to|from|active))$/,
          /^(?!cursor-move).+-move$/,
          /^router-link(|-exact)-active$/,
          /data-v-.*/,
          /^swiper/,
          /^animate-/,
          /^bg-/,
          /^text-/,
          /^hover:/,
          /^dark:/,
        ],
      },
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: false,
        }],
      },
    } : {}),
  },
});
