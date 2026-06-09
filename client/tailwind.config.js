/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAFAF7',
          100: '#F5F0E8',
          200: '#EAE5DD',
          300: '#DFDAD2',
        },
        tan: {
          DEFAULT: '#E8DDD0',
          dark: '#D9CEBD',
        },
        brown: {
          DEFAULT: '#8B6E52',
          dark: '#7A5F47',
          text: '#2C1F14',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
