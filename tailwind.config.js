module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          cream: '#fdf6e3',
          'cream-end': '#f5eed6',
          panel: '#fefcf3',
          'panel-border': '#a3b18a',
          'card-border': '#c8d5b9',
          'input-bg': '#faf5eb',
          track: '#e8e0d0',
          'forest': '#1a3315',
          'forest-end': '#0f200d',
          'forest-panel': 'rgba(26, 51, 21, 0.85)',
          'forest-border': '#2d5a24',
        },
      },
      keyframes: {
        'pkr-flash': {
          '0%': { boxShadow: '0 0 0 0 rgba(250, 204, 21, 0.55)' },
          '100%': { boxShadow: '0 0 0 14px rgba(250, 204, 21, 0)' },
        },
        'pkr-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-3px)' },
          '40%': { transform: 'translateX(3px)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        'pkr-hp-drain': {
          '0%': { opacity: '1', transform: 'scaleX(1)' },
          '50%': { opacity: '0.7' },
          '100%': { opacity: '1', transform: 'scaleX(1)' },
        },
        'pkr-catch-bounce': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) rotate(-10deg)' },
          '50%': { transform: 'translateY(0) rotate(0deg)' },
          '75%': { transform: 'translateY(-4px) rotate(5deg)' },
        },
        'pkr-slide-in': {
          '0%': { transform: 'translateX(12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pkr-fade-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.94) translateY(8px)', opacity: '0' },
        },
        'pkr-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pkr-xp-pulse': {
          '0%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.8)' },
          '100%': { filter: 'brightness(1)' },
        },
        'pkr-glow': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(234, 179, 8, 0.4)' },
          '50%': { boxShadow: '0 0 16px 6px rgba(234, 179, 8, 0.7)' },
        },
        'pkr-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pkr-lunge-player': {
          '0%, 100%': { transform: 'translateX(0)' },
          '45%': { transform: 'translateX(36px) scale(1.03)' },
        },
        'pkr-lunge-wild': {
          '0%, 100%': { transform: 'translateX(0)' },
          '45%': { transform: 'translateX(-36px) scale(1.03)' },
        },
        'pkr-shiny-hue': {
          '0%, 100%': { filter: 'hue-rotate(18deg) saturate(1.22) brightness(1.04) drop-shadow(0 0 3px rgba(255, 214, 90, 0.35))' },
          '50%': { filter: 'hue-rotate(42deg) saturate(1.38) brightness(1.1) drop-shadow(0 0 7px rgba(255, 236, 150, 0.55))' },
        },
        'pkr-queue-wild': {
          '0%, 100%': {
            boxShadow:
              'inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.35), 0 0 0 0 rgba(167, 139, 250, 0)',
          },
          '50%': {
            boxShadow:
              'inset 0 2px 0 rgba(255,255,255,0.11), inset 0 -2px 0 rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.35), 0 0 10px 1px rgba(167, 139, 250, 0.2)',
          },
        },
        'pkr-tooltip-pop': {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(5px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0) scale(1)' },
        },
        /* Trainer XP / level-up — subtle “impact frame” nudge (lighter than combat shake) */
        'pkr-xp-impact': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '15%': { transform: 'translate(-1.5px, 1px)' },
          '30%': { transform: 'translate(1.5px, -0.5px)' },
          '45%': { transform: 'translate(-1px, -1px)' },
          '60%': { transform: 'translate(1px, 0.5px)' },
        },
      },
      animation: {
        'pkr-flash': 'pkr-flash 0.7s ease-out 1',
        'pkr-shake': 'pkr-shake 0.4s ease-in-out 1',
        'pkr-hp-drain': 'pkr-hp-drain 0.5s ease-out 1',
        'pkr-catch-bounce': 'pkr-catch-bounce 0.6s ease-in-out 1',
        'pkr-slide-in': 'pkr-slide-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) 1',
        'pkr-fade-out': 'pkr-fade-out 0.5s ease-in 1 forwards',
        'pkr-float': 'pkr-float 3.2s ease-in-out infinite',
        'pkr-xp-pulse': 'pkr-xp-pulse 0.6s ease-out 1',
        'pkr-glow': 'pkr-glow 2s ease-in-out infinite',
        'pkr-shimmer': 'pkr-shimmer 2.4s ease-in-out infinite',
        'pkr-lunge-player': 'pkr-lunge-player 0.44s ease-in-out 1',
        'pkr-lunge-wild': 'pkr-lunge-wild 0.44s ease-in-out 1',
        'pkr-shiny-hue': 'pkr-shiny-hue 2.8s ease-in-out infinite',
        'pkr-queue-wild': 'pkr-queue-wild 3s ease-in-out infinite',
        'pkr-tooltip-pop': 'pkr-tooltip-pop 0.22s ease-out 1 forwards',
        'pkr-xp-impact': 'pkr-xp-impact 0.38s cubic-bezier(0.36, 0.07, 0.19, 0.97) 1',
      },
    },
  },
  plugins: [],
};
