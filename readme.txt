=== Background Blur Control ===
Contributors: jobthomas
Tags: blur, backdrop-filter, glassmorphism, block editor, background
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add a backdrop blur next to the background color setting, so blocks with a semi-transparent background frost whatever sits behind them.

== Description ==

Give a Group, Column, Button or Quote a semi-transparent background color, then set **Backdrop blur** right below the background color setting. Whatever sits behind the block (a cover image, a pattern, scrolling content) gets blurred, giving a frosted-glass look.

* Works with the core blocks: Group (including Row and Stack), Columns, Column, Buttons, Button, Media & Text, Quote, Pullquote, Verse, Preformatted, Code, Table and Search.
* Previews live in the editor.
* Adds the style when the page renders and saves nothing extra into your post content. If you deactivate the plugin, your blocks stay valid and simply lose the blur.
* No settings page, no front-end scripts, no data stored.

Developers can change which blocks get the setting with the `background_blur_control_supported_blocks` filter:

`add_filter( 'background_blur_control_supported_blocks', function ( $blocks ) {
	$blocks[] = 'core/cover';
	return $blocks;
} );`

Source code and issues: [github.com/jobthomas/background-blur-control](https://github.com/jobthomas/background-blur-control).

== Installation ==

1. Install from Plugins → Add New, or upload the plugin folder to `/wp-content/plugins/`.
2. Activate it.
3. Select a supported block, give it a semi-transparent background color, and set **Backdrop blur** just below it (in the Color or Background panel, depending on the block).

== Frequently Asked Questions ==

= I set a blur but nothing changes =

Backdrop blur only shows through a background that is at least partly transparent. Pick a background color with reduced opacity, and make sure something sits behind the block.

= Does it work in every browser? =

It uses the CSS `backdrop-filter` property, which current versions of Chrome, Edge, Firefox and Safari support. Browsers without support show the block without the blur.

= Can blur be heavy on performance? =

Large blur values on big areas can cost rendering time on low-powered devices. Values up to about 20px are usually plenty.

== Changelog ==

= 1.1.0 =
* The blur style is added at render time instead of being saved into post content, so deactivating the plugin no longer leaves invalid blocks. It also now works on the Search block.
* The attribute is registered server side.
* Removed `core/row`, `core/stack` (variations of Group, which is still supported) and `core/separator`.
* The control sits next to the background color, including the newer Background panel.
* Blocks saved with 1.0.0 migrate automatically when opened in the editor.
* Added the `background_blur_control_supported_blocks` filter, translation support and help text.

= 1.0.0 =
* First version.

