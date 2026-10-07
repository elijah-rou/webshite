import { defineConfig } from 'astro/config';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
    output: 'static',
    trailingSlash: 'always',
    devToolbar: { enabled: false },
    // The writing index moved from /blog/; keep old links working.
    redirects: { '/blog': '/writing/' },
    vite: { plugins: [solid({ ssr: false })] },
});
