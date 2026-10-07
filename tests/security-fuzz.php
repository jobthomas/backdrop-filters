<?php
// Security fuzz suite for Backdrop Filters. Run inside WordPress (Playground runPHP); writes /out/sec.txt.
require '/wordpress/wp-load.php';
$cases = array(
	array( 'blur(12px)', true ), array( 'blur(12.5px) saturate(150%)', true ), array( 'hue-rotate(-90deg)', true ),
	array( 'var:preset|backdrop-filter|frost', true ), array( 'brightness(70%) contrast(150%) grayscale(100%) invert(100%) opacity(50%) sepia(100%)', true ),
	array( 'blur(12px);background:red', false ), array( 'blur(12px)}body{display:none', false ),
	array( 'blur(12px)" onmouseover="alert(1)', false ), array( "blur(12px)'><script>alert(1)</script>", false ),
	array( 'url(https://evil.example/x.svg#f)', false ), array( 'expression(alert(1))', false ),
	array( 'var:preset|backdrop-filter|x);background:url(//evil', false ), array( 'var:preset|backdrop-filter|../x', false ),
	array( 'var(--anything)', false ), array( 'blur(12px)/**/', false ), array( "blur(12px)\nbackground:red", false ),
	array( 'blur(12px) ', true ), array( 'BLUR(12px)', false ), array( 'blur(1e9px)', false ), array( 'blur(1000px)', false ), array( 'blur(12)', false ),
	array( str_repeat( 'blur(1px) ', 30 ), false ), array( str_repeat( 'blur(1px) ', 19 ) . 'blur(1px)', true ),
	array( str_repeat( 'blur(1px) ', 5000 ) . 'x', false ), array( '', false ), array( array( 'blur(1px)' ), false ), array( 12, false ),
	array( "blur(12px)\0", true ), array( "blur(1px)\n\f", false ), array( 'blur(\\31 2px)', false ), array( 'blur(12px)&#59;background:red', false ),
);
$fail = 0; $out = '';
foreach ( $cases as $c ) {
	$html    = render_block( array( 'blockName' => 'core/group', 'attrs' => array( 'style' => array( 'backdropFilter' => $c[0] ) ), 'innerBlocks' => array(), 'innerHTML' => '<div class="wp-block-group" style="color:red"></div>', 'innerContent' => array( '<div class="wp-block-group" style="color:red"></div>' ) ) );
	$applied = false !== strpos( $html, 'backdrop-filter' );
	$p       = new WP_HTML_Tag_Processor( $html );
	$p->next_tag();
	$ok = $applied === $c[1] && 2 === count( $p->get_attribute_names_with_prefix( '' ) ) && ! preg_match( '/<script|onmouseover|url\(|expression|display:none|background:red/i', $html );
	$fail += $ok ? 0 : 1;
	$out  .= ( $ok ? 'PASS ' : 'FAIL ' ) . substr( var_export( is_string( $c[0] ) ? substr( $c[0], 0, 50 ) : $c[0], true ), 0, 60 ) . "\n";
}
$t = microtime( true ); backdrop_filters_css_value( str_repeat( 'blur(1px) ', 19 ) . 'blur(1px' ); $out .= sprintf( "regex time on near-miss: %.3fms\n", ( microtime( true ) - $t ) * 1000 );
$b = parse_blocks( '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"style":{"backdropFilter":"blur(4px);color:red"}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Go</a></div><!-- /wp:button --><!-- wp:button {"style":{"backdropFilter":"blur(4px)"}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Go</a></div><!-- /wp:button --></div><!-- /wp:buttons -->' );
$out .= 'buttons: ' . render_block( $b[0] ) . "\n";
$out .= "PHP " . PHP_VERSION . ", WP " . get_bloginfo( 'version' ) . "\nFAILURES: $fail of " . count( $cases ) . "\n";
file_put_contents( '/out/sec.txt', $out );
