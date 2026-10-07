# Keep Astro and update the starter

The repository contained an Astro 3 starter with four pages that rendered only
the navigation component. There is no persisted data or application backend.

Keep Astro, existing URLs, pnpm, and Tailwind 3 configuration. Update to Astro 7
for the current content loaders and client routing. Tailwind 3 is consumed through
PostCSS instead of the old Astro integration. Terminal styling uses ordinary CSS.

Staying on Astro 3 would retain its older dependency graph and require the legacy
content and transition APIs. Changing framework would discard a working platform
without a benefit for this site. The update changes build tooling, not content URLs.

The site stays statically generated. A server, CMS, or database requires a separate
decision if future features need one. This change can be reversed locally in Git;
no external deployment or data migration is involved.
