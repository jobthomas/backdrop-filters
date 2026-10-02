# Background Blur Control

A WordPress plugin that adds a **Backdrop blur** setting next to the background color of core blocks. Give a block a semi-transparent background, set a blur, and whatever sits behind it gets frosted.

The blur is added when the page renders (`render_block`), so nothing extra is saved into post content and deactivating the plugin leaves every block valid.

## Development

```bash
npm install
npm run build        # build/index.js
npm run lint:js
composer install
composer lint        # WordPress Coding Standards + PHP 7.4 compatibility
npm run plugin-zip   # background-blur-control.zip for WordPress.org
```

Source for the editor script is in `src/`. The WordPress.org readme is `readme.txt`.

## License

GPL-2.0-or-later
