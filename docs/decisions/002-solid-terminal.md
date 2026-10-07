# Solid 2 terminal controls

The user requested Solid 2 for the interactive terminal. Keep Astro 7 for static
routes and Markdown, and pin `solid-js` and `@solidjs/web` to `2.0.0-rc.13`.
The matching compiler plugin is `@solidjs/vite-plugin@3.0.0-next.47`.

`@astrojs/solid-js@7.0.2` supports Solid 1.9, not Solid 2. Instead, Astro's Vite
configuration loads Solid's own plugin with SSR disabled. A browser entry mounts
the menu, settings and guitar components. Astro renders content and ordinary links
at build time; these remain usable before JavaScript loads or if it is disabled.

The browser entry disposes each component before Astro swaps the document and
mounts the new page's controls afterward. Shared signals retain preferences and
guitar state during navigation. The audio player owns its context and cancels
pending playback when muted. Preferences persist in localStorage when available.

Alternatives were to retain vanilla TypeScript, use Solid 1 through Astro's
official integration, or add a community Solid 2 renderer. The requested version
and absence of server-rendered interactive state make direct mounting sufficient.
This avoids maintaining a custom Astro renderer or adding a router.

The tradeoff is an explicit mount/dispose boundary and a pinned prerelease
dependency. Revisit official Astro islands when the integration supports Solid 2,
or if interactive content must be server-rendered. Static URLs and post formats
do not depend on the client integration and would survive that change.

Verified package metadata:
- https://registry.npmjs.org/@astrojs%2fsolid-js/7.0.2
- https://registry.npmjs.org/@solidjs%2fvite-plugin/3.0.0-next.47
- https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/MIGRATION.md
