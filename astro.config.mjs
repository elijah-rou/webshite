import { defineConfig } from 'astro/config';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
    output: 'static',
    trailingSlash: 'always',
    devToolbar: { enabled: false },
    vite: { plugins: [solid({ ssr: false })] },
});
