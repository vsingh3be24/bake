/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '20px',
      screens: { md: '768px', lg: '1200px' },
    },
    extend: {
      colors: {
        cream: 'var(--cream)',
        'cream-deep': 'var(--cream-deep)',
        paper: 'var(--paper)',
        brown: 'var(--brown)',
        'brown-soft': 'var(--brown-soft)',
        'brown-mute': 'var(--brown-mute)',
        maroon: 'var(--maroon)',
        'maroon-dark': 'var(--maroon-dark)',
        crimson: 'var(--crimson)',
        olive: 'var(--olive)',
        gold: 'var(--gold)',
        'in-stock': 'var(--in-stock)',
        'low-stock': 'var(--low-stock)',
        'out-stock': 'var(--out-stock)',
        info: 'var(--info)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        heading: ['"Cormorant Garamond"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        pill: 'var(--r-pill)',
      },
      boxShadow: {
        sm: 'var(--sh-sm)',
        md: 'var(--sh-md)',
        lg: 'var(--sh-lg)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        marquee: 'marquee 22s linear infinite',
      },
    },
  },
  plugins: [],
};
