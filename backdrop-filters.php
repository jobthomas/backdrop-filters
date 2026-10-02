<?php
/**
 * Plugin Name:       Backdrop Filters
 * Plugin URI:        https://github.com/jobthomas/backdrop-filters
 * Description:       Adds backdrop filters (blur, brightness, contrast, grayscale, hue, invert, saturation, sepia) next to the background color of blocks.
 * Version:           1.0.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            Job Thomas
 * Author URI:        https://job.blog
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       backdrop-filters
 *
 * @package BackdropFilters
 */

defined( 'ABSPATH' ) || exit;

/**
 * Turns a stored style.backdropFilter value into safe CSS, or '' if invalid.
 *
 * Accepts a preset reference (var:preset|backdrop-filter|slug) or a
 * space-separated list of filter functions with numeric arguments. Anything
 * else is rejected, so the value can never break out of the declaration.
 *
 * @param mixed $value Stored value.
 * @return string CSS value.
 */
function backdrop_filters_css_value( $value ) {
	if ( ! is_string( $value ) || strlen( $value ) > 200 ) {
		return '';
	}

	$value = trim( $value );

	if ( preg_match( '/^var:preset\|backdrop-filter\|([a-z0-9-]+)$/D', $value, $preset ) ) {
		return 'var(--wp--preset--backdrop-filter--' . $preset[1] . ')';
	}

	$number   = '\d{1,3}(?:\.\d{1,2})?';
	$function = "(?:blur\({$number}px\)|(?:brightness|contrast|grayscale|invert|opacity|saturate|sepia)\({$number}%\)|hue-rotate\(-?{$number}deg\))";

	return preg_match( "/^{$function}(?: {$function})*$/D", $value ) ? $value : '';
}

/**
 * Adds the backdrop-filter style to the block wrapper at render time.
 *
 * Nothing is saved into post content, so deactivating the plugin leaves
 * every block valid. Blocks that support backdropFilter natively are left
 * to core.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function backdrop_filters_render_block( $block_content, $block ) {
	if ( empty( $block['attrs']['style']['backdropFilter'] ) || '' === trim( $block_content ) ) {
		return $block_content;
	}

	$block_type = WP_Block_Type_Registry::get_instance()->get_registered( $block['blockName'] );
	if ( $block_type && block_has_support( $block_type, 'backdropFilter' ) ) {
		return $block_content;
	}

	$css = backdrop_filters_css_value( $block['attrs']['style']['backdropFilter'] );
	if ( '' === $css ) {
		return $block_content;
	}

	$tags = new WP_HTML_Tag_Processor( $block_content );
	if ( ! $tags->next_tag() ) {
		return $block_content;
	}

	$style = $tags->get_attribute( 'style' );
	$style = is_string( $style ) ? rtrim( trim( $style ), ';' ) : '';
	$style = ( '' === $style ? '' : $style . ';' ) . "-webkit-backdrop-filter:{$css};backdrop-filter:{$css}";

	$tags->set_attribute( 'style', $style );

	return $tags->get_updated_html();
}
add_filter( 'render_block', 'backdrop_filters_render_block', 10, 2 );

/**
 * Enqueues the editor script.
 */
function backdrop_filters_enqueue_editor_assets() {
	$asset = include __DIR__ . '/build/index.asset.php';

	wp_enqueue_script(
		'backdrop-filters',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_set_script_translations( 'backdrop-filters', 'backdrop-filters' );
}
add_action( 'enqueue_block_editor_assets', 'backdrop_filters_enqueue_editor_assets' );
