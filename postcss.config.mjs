import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import configuration from './tailwind.config.mjs';

export default { plugins: [tailwindcss(configuration), autoprefixer()] };
