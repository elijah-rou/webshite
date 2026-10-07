import { defineConfig } from 'astro/config';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
    output: 'static',
    trailingSlash: 'always',
    devToolbar: { enabled: false },
    // The writing index moved from /blog/; keep old links working.
    redirects: { '/blog': '/writing/' },
    // Code blocks stay monochrome phosphor instead of a coloured highlighter theme.
    markdown: { syntaxHighlight: false },
    vite: { plugins: [solid({ ssr: false })] },
});
