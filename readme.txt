=== Backdrop Filters ===
Contributors: jobthomas
Tags: backdrop-filter, blur, glassmorphism, block editor, background
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Blur, tint and recolor whatever sits behind a block, right next to its background color setting.

== Description ==

Give a block a semi-transparent background color, then pick a **Backdrop filter** just below it and set the amount. Whatever sits behind the block (a cover image, a photo, scrolling content) is filtered, giving frosted glass, dimmed, black-and-white or tinted looks.

Filters: Blur, Brightness, Contrast, Grayscale, Hue, Invert, Saturation and Sepia.

* Works on every block with a background color setting, such as Group, Columns, Buttons, Quote and Search.
* Previews live in the editor.
* Adds the style when the page renders and saves nothing extra into your post content. If you deactivate the plugin, your blocks stay valid and simply lose the filter.
* No settings page, no front-end scripts, no data stored.

The value is stored in the block's `style.backdropFilter`, the same place as the backdrop-filter block support proposed for WordPress core. When a block supports that natively, the plugin steps aside and lets core handle it. Theme presets defined as `var:preset|backdrop-filter|{slug}` are also rendered.

Source code and issues: [github.com/jobthomas/backdrop-filters](https://github.com/jobthomas/backdrop-filters).

== Installation ==

1. Install from Plugins → Add New, or upload the plugin folder to `/wp-content/plugins/`.
2. Activate it.
3. Select a block, give it a semi-transparent background color, then choose a **Backdrop filter** and amount just below the color setting.

== Frequently Asked Questions ==

= I picked a filter but nothing changes =

A backdrop filter only shows through a background that is at least partly transparent. Pick a background color with reduced opacity, and make sure something sits behind the block.

= Does it work in every browser? =

It uses the CSS `backdrop-filter` property, which current versions of Chrome, Edge, Firefox and Safari support. Browsers without support show the block without the filter.

= Can filters be heavy on performance? =

Large blur values on big areas can cost rendering time on low-powered devices. Blur values up to about 20px are usually plenty.

== Screenshots ==

1. `blur(50px)`: Blur at its maximum. How the sea looks before my first coffee.
2. `brightness(200%)`: Brightness at its maximum. Someone opened the curtains.
3. `contrast(200%)`: Contrast at its maximum. The sea, but it has opinions now.
4. `grayscale(100%)`: Grayscale at its maximum. A very serious photo of the sea.
5. `hue-rotate(180deg)`: Hue turned halfway round the color wheel (a full 360deg turn looks the same as none).
6. `invert(100%)`: Invert at its maximum. The sea from the Upside Down.
7. `saturate(300%)`: Saturation at its maximum. The holiday brochure version.
8. `sepia(100%)`: Sepia at its maximum. Grandpa's slides from 1974.

== Changelog ==

= 1.0.0 =
* First release.
