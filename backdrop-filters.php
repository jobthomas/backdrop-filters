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
 * Returns the class names or tag names of the elements that carry a block's
 * background color, or an empty array when that is the wrapper.
 *
 * Blocks such as Button and Table put their background (and border radius)
 * on an inner element, described by the selectors in block.json. The filter
 * goes on the same element so it follows its shape.
 *
 * @param WP_Block_Type $block_type Block type.
 * @return string[] Final simple selectors, e.g. '.wp-block-button__link' or 'table'.
 */
function backdrop_filters_targets( $block_type ) {
	$skip = $block_type->supports['color']['__experimentalSkipSerialization'] ?? false;
	if ( true !== $skip && ! in_array( 'background', (array) $skip, true ) ) {
		return array();
	}

	$targets = array();
	foreach ( explode( ',', wp_get_block_css_selector( $block_type, array( 'color', 'background' ), true ) ) as $selector ) {
		$parts     = preg_split( '/[\s>+~]+/', trim( $selector ) );
		$targets[] = end( $parts );
	}

	return $targets;
}

/**
 * Adds the backdrop-filter style to the block at render time.
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

	$targets = $block_type ? backdrop_filters_targets( $block_type ) : array();
	$tags    = new WP_HTML_Tag_Processor( $block_content );

	while ( $tags->next_tag() ) {
		$matches = ! $targets;
		foreach ( $targets as $target ) {
			$matches = $matches || ( '.' === $target[0] ? $tags->has_class( substr( $target, 1 ) ) : strtoupper( $target ) === $tags->get_tag() );
		}

		if ( $matches ) {
			$style = $tags->get_attribute( 'style' );
			$style = is_string( $style ) ? rtrim( trim( $style ), ';' ) : '';
			$tags->set_attribute( 'style', ( '' === $style ? '' : $style . ';' ) . "-webkit-backdrop-filter:{$css};backdrop-filter:{$css}" );
		}

		if ( ! $targets ) {
			break;
		}
	}

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
