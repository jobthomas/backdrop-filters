<?php
/**
 * Plugin Name:       Background Blur Control
 * Plugin URI:        https://github.com/jobthomas/background-blur-control
 * Description:       Adds a backdrop blur setting next to the background color controls, so blocks with a semi-transparent background frost whatever sits behind them.
 * Version:           1.1.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            Job Thomas
 * Author URI:        https://job.blog
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       background-blur-control
 *
 * @package BackgroundBlurControl
 */

defined( 'ABSPATH' ) || exit;

define( 'BACKGROUND_BLUR_CONTROL_MAX', 50 );

/**
 * Blocks that get the blur setting.
 *
 * @return string[] Block names.
 */
function background_blur_control_supported_blocks() {
	$blocks = array(
		'core/group',
		'core/columns',
		'core/column',
		'core/buttons',
		'core/button',
		'core/media-text',
		'core/quote',
		'core/pullquote',
		'core/verse',
		'core/preformatted',
		'core/code',
		'core/table',
		'core/search',
	);

	/**
	 * Filters the blocks that get the backdrop blur setting.
	 *
	 * @param string[] $blocks Block names.
	 */
	return (array) apply_filters( 'background_blur_control_supported_blocks', $blocks );
}

/**
 * Registers the backgroundBlur attribute on supported blocks, server side.
 *
 * Registering it here (not only in JavaScript) keeps the attribute valid
 * for server-rendered blocks and REST requests.
 *
 * @param array  $args       Block type arguments.
 * @param string $block_name Block name.
 * @return array
 */
function background_blur_control_register_attribute( $args, $block_name ) {
	if ( ! in_array( $block_name, background_blur_control_supported_blocks(), true ) ) {
		return $args;
	}

	if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
		$args['attributes'] = array();
	}

	$args['attributes']['backgroundBlur'] = array(
		'type'    => 'number',
		'default' => 0,
	);

	return $args;
}
add_filter( 'register_block_type_args', 'background_blur_control_register_attribute', 10, 2 );

/**
 * Adds the backdrop-filter style to the block wrapper at render time.
 *
 * Styles are added on output rather than saved into post content, so
 * deactivating the plugin leaves every block valid.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function background_blur_control_render_block( $block_content, $block ) {
	if ( empty( $block['attrs']['backgroundBlur'] ) || '' === trim( $block_content ) ) {
		return $block_content;
	}

	if ( ! in_array( $block['blockName'], background_blur_control_supported_blocks(), true ) ) {
		return $block_content;
	}

	$blur = min( max( absint( $block['attrs']['backgroundBlur'] ), 0 ), BACKGROUND_BLUR_CONTROL_MAX );
	if ( 0 === $blur ) {
		return $block_content;
	}

	$tags = new WP_HTML_Tag_Processor( $block_content );
	if ( ! $tags->next_tag() ) {
		return $block_content;
	}

	$declarations = sprintf( 'backdrop-filter:blur(%1$dpx);-webkit-backdrop-filter:blur(%1$dpx);', $blur );
	$style        = $tags->get_attribute( 'style' );
	$style        = is_string( $style ) ? trim( $style ) : '';

	if ( false !== strpos( $style, 'backdrop-filter' ) ) {
		// Already present, e.g. content saved by version 1.0.0.
		return $block_content;
	}

	$tags->set_attribute( 'style', '' === $style ? $declarations : rtrim( $style, ';' ) . ';' . $declarations );

	return $tags->get_updated_html();
}
add_filter( 'render_block', 'background_blur_control_render_block', 10, 2 );

/**
 * Enqueues the editor script.
 */
function background_blur_control_enqueue_editor_assets() {
	$asset_file = plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = include $asset_file;

	wp_enqueue_script(
		'background-blur-control-editor',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_add_inline_script(
		'background-blur-control-editor',
		'window.backgroundBlurControl = ' . wp_json_encode(
			array(
				'blocks' => array_values( background_blur_control_supported_blocks() ),
				'max'    => BACKGROUND_BLUR_CONTROL_MAX,
			)
		) . ';',
		'before'
	);

	wp_set_script_translations( 'background-blur-control-editor', 'background-blur-control' );
}
add_action( 'enqueue_block_editor_assets', 'background_blur_control_enqueue_editor_assets' );
