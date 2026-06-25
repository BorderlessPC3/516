/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e94560',
          dark: '#c73e54',
          light: '#ff6b81',
        },
        secondary: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
        },
        accent: '#0f3460',
        gold: '#ffd700',
      },
    },
  },
  plugins: [],
};
