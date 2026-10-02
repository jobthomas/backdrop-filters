# Backdrop Filters

A WordPress plugin that adds a **Backdrop filter** setting (blur, brightness, contrast, grayscale, hue, invert, saturation, sepia) next to the background color of blocks.

The value is stored in `style.backdropFilter`, the same attribute as the proposed core block support ([WordPress/gutenberg#77738](https://github.com/WordPress/gutenberg/pull/77738)). The plugin adds the style when the page renders (`render_block`), so nothing extra is saved into post content, and it steps aside for any block that supports `backdropFilter` natively.

## Development

```bash
npm install
npm run build        # build/index.js
npm run lint:js
composer install
composer lint        # WordPress Coding Standards + PHP 7.4 compatibility
npm run plugin-zip   # backdrop-filters.zip for WordPress.org
```

Source for the editor script is in `src/`. The WordPress.org readme is `readme.txt`, and the listing screenshots (which go in the SVN `assets/` folder, not the plugin zip) are in `.wordpress-org/`.

## License

GPL-2.0-or-later
