/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all React components
  ],
  theme: {
    extend: {
      colors: {
        'blcp-blue': '#363a94', // Your primary blue color
      },
      fontFamily: {
        'malgun': ['"Malgun Gothic"', 'sans-serif'], // Primary typeface per brand guidelines
      },
      // You can optionally extend spacing, borderRadius, or other properties if needed
    },
  },
  // If you want to add plugins for forms or typography:
  plugins: [
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
}