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

Select a block that sits on top of something, such as a cover image, a photo or scrolling content. Pick a **Backdrop filter** just below its background color setting and set the amount. Whatever is behind the block gets filtered, giving frosted glass, dimmed, black-and-white or tinted looks.

The block doesn't need a background color of its own. Leave it empty to see the filter on its own, or add a semi-transparent color to tint it.

Filters: Blur, Brightness, Contrast, Grayscale, Hue, Invert, Saturation and Sepia.

* Works on every block with a background color setting, such as Group, Columns, Buttons, Quote and Search.
* Previews live in the editor.
* Adds the style when the page renders and saves nothing extra into your post content. If you deactivate the plugin, your blocks stay valid and simply lose the filter.
* No settings page, no front-end scripts, no data stored.

Blocks that already support backdrop filters natively are left alone. Theme presets referenced as `var:preset|backdrop-filter|{slug}` are rendered too.

Source code and issues: [github.com/jobthomas/backdrop-filters](https://github.com/jobthomas/backdrop-filters).

== Installation ==

1. Install from Plugins → Add New, or upload the plugin folder to `/wp-content/plugins/`.
2. Activate it.
3. Select a block that sits on top of an image or other content, then choose a **Backdrop filter** and amount just below its background color setting.

== Frequently Asked Questions ==

= I picked a filter but nothing changes =

A backdrop filter changes what is visible behind the block, so something has to sit behind it, such as a cover image or a photo. A fully opaque background color also hides the effect: leave the background empty or make it semi-transparent.

= Does it work in every browser? =

It uses the CSS `backdrop-filter` property, which current versions of Chrome, Edge, Firefox and Safari support. Browsers without support show the block without the filter.

= Can filters be heavy on performance? =

Large blur values on big areas can cost rendering time on low-powered devices. Blur values up to about 20px are usually plenty.

== Screenshots ==

1. The Backdrop filter setting sits right below the background color. Pick an effect, then set the amount.
2. Blur, `blur(50px)`.
3. Brightness, `brightness(200%)`.
4. Contrast, `contrast(200%)`.
5. Grayscale, `grayscale(100%)`.
6. Hue, `hue-rotate(180deg)`. Halfway round the color wheel; a full 360deg turn looks the same as none.
7. Invert, `invert(100%)`.
8. Saturation, `saturate(300%)`.
9. Sepia, `sepia(100%)`.

== Changelog ==

= 1.0.0 =
* First release.
