# Changelog

All notable changes to this fork are documented in this file.
Only release versions from `2.0.0` onward are included.

## [2.1.0] - 2026-06-23

### Changed

- Official release bump to `2.1.0` with no additional functional changes beyond `2.0.1`.

## [2.0.1] - 2026-06-16

### Fixed

- Fixed dependency resolution issues in `examples/demo-app` that affected local startup and build stability.
- Aligned `@kepler.gl/*`, `@deck.gl/*`, `@loaders.gl/*`, and `@luma.gl/*` package versions with the forked application stack.
- Added scoped package alias resolution in `examples/demo-app/esbuild.config.mjs` to correctly resolve package exports during bundling.

## [2.0.0] - 2026-06-12

### Added

- Added Keycloak authentication to `examples/demo-app`, including session bootstrap, authenticated API client wiring, and new environment variables.
- Added the complete catalog map loading flow backed by RTK Query and MapsAnalytics service endpoints.
- Added custom controls for `Save`, `Save as`, and JSON export of maps.
- Added image export controls for maps.
- Added the `Catalogo de mapas` control to browse and toggle layers by category.
- Added local catalog map testing harnesses and deployment pipeline support.

### Changed

- Migrated core MapsAnalytics V1 UI capabilities into the demo application.
- Applied MapsAnalytics branding, Spanish locale defaults, and catalog-specific map styles.
- Unified map control tooltips and refined the overall toolbar UX.

### Fixed

- Restored the original save flow UI and improved thumbnail/image export timing after map render.
- Removed the default kepler logo from the side panel and aligned header actions with the product UI.
- Avoided local Keycloak redirect loops during development.
