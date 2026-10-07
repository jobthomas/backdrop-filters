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
 * Returns the rules that place a block's background color on an inner
 * element, or an empty array when the background is on the wrapper.
 *
 * Blocks such as Button and Table put their background (and border radius)
 * on an inner element, described by the selectors in block.json. The filter
 * goes on the same element so it follows its shape. A rule can depend on the
 * wrapper's classes, e.g. Search only colors its input when it has no button.
 *
 * @param WP_Block_Type $block_type Block type.
 * @return array[] Rules: 'selector' (full), 'wrapper' (required wrapper classes), 'target' (last simple selector).
 */
function backdrop_filters_targets( $block_type ) {
	$skip = $block_type->supports['color']['__experimentalSkipSerialization'] ?? false;
	if ( true !== $skip && ! in_array( 'background', (array) $skip, true ) ) {
		return array();
	}

	$rules = array();
	foreach ( explode( ',', wp_get_block_css_selector( $block_type, array( 'color', 'background' ), true ) ) as $selector ) {
		$selector = trim( $selector );
		$parts    = preg_split( '/[\s>+~]+/', $selector );
		preg_match_all( '/\.([\w-]+)/', $parts[0], $wrapper );
		$rules[] = array(
			'selector' => $selector,
			'wrapper'  => $wrapper[1],
			'target'   => end( $parts ),
		);
	}

	return $rules;
}

/**
 * Appends the backdrop-filter declarations to the current tag's style.
 *
 * @param WP_HTML_Tag_Processor $tags Processor positioned on a tag.
 * @param string                $css  Validated CSS value.
 */
function backdrop_filters_add_style( $tags, $css ) {
	$style = $tags->get_attribute( 'style' );
	$style = is_string( $style ) ? rtrim( trim( $style ), ';' ) : '';
	$tags->set_attribute( 'style', ( '' === $style ? '' : $style . ';' ) . "-webkit-backdrop-filter:{$css};backdrop-filter:{$css}" );
}

/**
 * Adds the backdrop-filter style to the block at render time.
 *
 * Nothing is saved into post content, so deactivating the plugin leaves
 * every block valid. Blocks that support backdropFilter natively are left
 * alone.
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

	$rules = $block_type ? backdrop_filters_targets( $block_type ) : array();
	if ( ! $rules ) {
		backdrop_filters_add_style( $tags, $css );
		return $tags->get_updated_html();
	}

	// Keep the rules whose wrapper conditions this block meets.
	$targets = array();
	foreach ( $rules as $rule ) {
		$applies = true;
		foreach ( $rule['wrapper'] as $class_name ) {
			$applies = $applies && $tags->has_class( $class_name );
		}
		if ( $applies ) {
			$targets[] = $rule['target'];
		}
	}

	do {
		foreach ( $targets as $target ) {
			if ( '.' === $target[0] ? $tags->has_class( substr( $target, 1 ) ) : strtoupper( $target ) === $tags->get_tag() ) {
				backdrop_filters_add_style( $tags, $css );
				break;
			}
		}
	} while ( $tags->next_tag() );

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

	// The editor needs the same inner-element targets for its preview, and
	// older WordPress versions do not expose block selectors client-side.
	$targets = array();
	foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $block_type ) {
		$rules = backdrop_filters_targets( $block_type );
		if ( $rules ) {
			$targets[ $name ] = wp_list_pluck( $rules, 'selector' );
		}
	}
	wp_add_inline_script( 'backdrop-filters', 'window.backdropFilters = ' . wp_json_encode( array( 'targets' => $targets ) ) . ';', 'before' );

	wp_set_script_translations( 'backdrop-filters', 'backdrop-filters' );
}
add_action( 'enqueue_block_editor_assets', 'backdrop_filters_enqueue_editor_assets' );
