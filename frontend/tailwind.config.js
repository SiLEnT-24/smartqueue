const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { bg: c('bg'), ink: c('ink'), mute: c('mute'), cyan: c('cyan'), violet: c('violet') },
    fontFamily: { display: ['Sora', 'system-ui', 'sans-serif'], sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
  } },
};
