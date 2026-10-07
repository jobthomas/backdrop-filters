// Compatibility harness: one fresh WordPress Playground per scenario, driven by headless Chrome.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const DIR = new URL( '.', import.meta.url ).pathname;
const PLUGIN = DIR + '.plugin/backdrop-filters';
const OUT = DIR + 'out';
fs.mkdirSync( OUT, { recursive: true } );
fs.rmSync( OUT + '/results.jsonl', { force: true } );

const scenarios = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

const MARKUP = `'<!-- wp:group {"style":{"color":{"background":"#ffffff59"},"backdropFilter":"blur(5px)"}} --><div class="wp-block-group has-background" style="background-color:#ffffff59"><!-- wp:paragraph --><p>g</p><!-- /wp:paragraph --></div><!-- /wp:group -->'
 . '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"style":{"backdropFilter":"blur(5px)"}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Go</a></div><!-- /wp:button --></div><!-- /wp:buttons -->'
 . '<!-- wp:table {"style":{"backdropFilter":"blur(5px)"}} --><figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>a</td></tr></tbody></table></figure><!-- /wp:table -->'
 . '<!-- wp:search {"label":"Search","buttonText":"Search","style":{"backdropFilter":"blur(5px)"}} /-->'
 . '<!-- wp:quote {"style":{"backdropFilter":"blur(5px)"}} --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p>q</p><!-- /wp:paragraph --></blockquote><!-- /wp:quote -->'
 . '<!-- wp:group {"style":{"backdropFilter":"blur(5px);background:red"}} --><div class="wp-block-group"><!-- wp:paragraph --><p>bad</p><!-- /wp:paragraph --></div><!-- /wp:group -->'`;
const FRONT_POST = `<?php
require '/wordpress/wp-load.php';
$c = '<!-- wp:group {"style":{"color":{"background":"#ffffff59"},"backdropFilter":"blur(5px)"}} --><div class="wp-block-group has-background" style="background-color:#ffffff59"><!-- wp:paragraph --><p>g</p><!-- /wp:paragraph --></div><!-- /wp:group -->'
 . '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"style":{"backdropFilter":"blur(5px)"}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Go</a></div><!-- /wp:button --></div><!-- /wp:buttons -->'
 . '<!-- wp:table {"style":{"backdropFilter":"blur(5px)"}} --><figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>a</td></tr></tbody></table></figure><!-- /wp:table -->'
 . '<!-- wp:search {"label":"Search","buttonText":"Search","style":{"backdropFilter":"blur(5px)"}} /-->'
 . '<!-- wp:quote {"style":{"backdropFilter":"blur(5px)"}} --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p>q</p><!-- /wp:paragraph --></blockquote><!-- /wp:quote -->'
 . '<!-- wp:group {"style":{"backdropFilter":"blur(5px);background:red"}} --><div class="wp-block-group"><!-- wp:paragraph --><p>bad</p><!-- /wp:paragraph --></div><!-- /wp:group -->';
$id = wp_insert_post( wp_slash( array( 'post_status' => 'publish', 'post_title' => 'bf front', 'post_name' => 'bf-front', 'post_content' => $c ) ) );
file_put_contents( '/out/' . getenv( 'BF_NAME' ) . '-post.txt', $id );
file_put_contents( '/out/' . getenv( 'BF_NAME' ) . '-render.html', do_blocks( $c ) );
`;

const ACTIVATE = `<?php
require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
$out = array();
foreach ( json_decode( 'SLUGS', true ) as $slug ) {
	$file = '';
	foreach ( get_plugins() as $f => $data ) { if ( 0 === strpos( $f, $slug . '/' ) ) { $file = $f; break; } }
	if ( ! $file ) { $out[ $slug ] = 'not installed'; continue; }
	$data = get_plugin_data( WP_PLUGIN_DIR . '/' . $file, false, false );
	$r    = activate_plugin( $file, '', false, true );
	$out[ $slug ] = ( is_wp_error( $r ) ? 'FAILED: ' . $r->get_error_message() : 'active' ) . ' (v' . $data['Version'] . ', requires WP ' . ( $data['RequiresWP'] ?: '?' ) . ', PHP ' . ( $data['RequiresPHP'] ?: '?' ) . ')';
}
file_put_contents( '/out/NAME-activation.json', wp_json_encode( $out ) );
`;

async function editorTest() {
	const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );
	for ( let i = 0; i < 240 && ! window.wp?.blocks?.getBlockType?.( 'core/group' ); i++ ) {
		await wait( 500 );
	}
	if ( ! window.wp?.blocks?.getBlockType?.( 'core/group' ) ) {
		return { blockEditor: false, title: document.title, url: location.href, body: document.body.className.slice( 0, 160 ), text: document.body.innerText.slice( 0, 200 ) };
	}
	await wait( 2500 );
	const { dispatch, select } = wp.data;
	const be = dispatch( 'core/block-editor' );
	document.querySelectorAll( '.components-modal__frame button[aria-label="Close"]' ).forEach( ( b ) => b.click() );
	try { dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false ); } catch ( e ) {}
	const cb = wp.blocks.createBlock;
	const makers = {
		group: () => cb( 'core/group', {}, [ cb( 'core/paragraph', { content: 'x' } ) ] ),
		quote: () => cb( 'core/quote', {}, [ cb( 'core/paragraph', { content: 'q' } ) ] ),
		button: () => cb( 'core/buttons', {}, [ cb( 'core/button', { text: 'Go' } ) ] ),
		column: () => cb( 'core/columns', {}, [ cb( 'core/column', {}, [ cb( 'core/paragraph', { content: 'c' } ) ] ) ] ),
		table: () => cb( 'core/table', { body: [ { cells: [ { content: 'a', tag: 'td' } ] } ] } ),
		search: () => cb( 'core/search', { label: 'S', buttonText: 'Go' } ),
	};
	const openSidebar = () => {
		try { dispatch( 'core/edit-post' ).openGeneralSidebar( 'edit-post/block' ); } catch ( e ) {}
	};
	const check = async ( top, target ) => {
		be.selectBlock( target.clientId );
		openSidebar();
		await wait( 1200 );
		[ ...document.querySelectorAll( '.block-editor-block-inspector [role=tab]' ) ]
			.find( ( x ) => /styles/i.test( x.getAttribute( 'aria-label' ) || x.textContent ) )?.click();
		await wait( 700 );
		const sel = [ ...document.querySelectorAll( '.block-editor-block-inspector select' ) ].find( ( s ) => [ ...s.options ].some( ( o ) => o.value === 'hue-rotate' ) );
		const panel = sel?.closest( '.components-tools-panel' );
		const panelName = panel?.querySelector( 'h2' )?.textContent?.trim();
		const bgColorInPanel = !! panel && [ ...panel.querySelectorAll( 'button' ) ].some( ( e ) => /^(Background|Color)$/.test( e.textContent.trim() ) );
		const style = select( 'core/block-editor' ).getBlock( target.clientId ).attributes.style || {};
		be.updateBlockAttributes( target.clientId, { style: { ...style, backdropFilter: 'blur(7px)' } } );
		await wait( 700 );
		const doc = document.querySelector( 'iframe[name=editor-canvas]' )?.contentDocument || document;
		const wrap = doc.getElementById( 'block-' + target.clientId );
		const preview = wrap
			? [ wrap, ...wrap.querySelectorAll( '*' ) ].filter( ( e ) => doc.defaultView.getComputedStyle( e ).backdropFilter.includes( 'blur(7px)' ) ).map( ( e ) => e.tagName.toLowerCase() + ( e.classList[ 0 ] ? '.' + e.classList[ 0 ] : '' ) )
			: 'no wrapper';
		const html = wp.blocks.serialize( [ select( 'core/block-editor' ).getBlock( top.clientId ) ] );
		return { control: !! sel, panel: panelName, bgColorInPanel, preview, inlineSaved: /style="[^"]*backdrop/.test( html ) };
	};
	const results = {};
	for ( const [ k, make ] of Object.entries( makers ) ) {
		try {
			const top = make();
			be.insertBlocks( top );
			const target = k === 'button' || k === 'column' ? top.innerBlocks[ 0 ] : top;
			results[ k ] = await check( top, target );
		} catch ( e ) {
			results[ k ] = { error: String( e ) };
		}
	}
	const sup = ( n ) => wp.blocks.hasBlockSupport( n, 'color' ) && wp.blocks.getBlockSupport( n, [ 'color', 'background' ] ) !== false && ! wp.blocks.hasBlockSupport( n, 'backdropFilter' );
	const types = wp.blocks.getBlockTypes();
	const third = types.filter( ( t ) => ! t.name.startsWith( 'core/' ) && sup( t.name ) && ! t.parent && ! t.ancestor );
	const thirdResults = {};
	for ( const t of third.slice( 0, 6 ) ) {
		try {
			const b = t.example ? wp.blocks.getBlockFromExample( t.name, t.example ) : cb( t.name );
			be.insertBlocks( b );
			thirdResults[ t.name ] = await check( b, b );
		} catch ( e ) {
			thirdResults[ t.name ] = { error: String( e ).slice( 0, 120 ) };
		}
	}
	return {
		blockEditor: true,
		branch: document.body.className.match( /branch-[\d-]+/ )?.[ 0 ],
		nativeBackdropSupport: types.filter( ( t ) => wp.blocks.hasBlockSupport( t.name, 'backdropFilter' ) ).map( ( t ) => t.name ),
		thirdPartyWithBg: third.length,
		results,
		thirdResults,
	};
}

function frontChecks( html ) {
	const has = ( re ) => re.test( html );
	return {
		group: has( /<div class="wp-block-group[^"]*"[^>]*style="[^"]*backdrop-filter:blur\(5px\)/ ),
		buttonOnLink: has( /<a[^>]*wp-block-button__link[^>]*backdrop-filter|<a[^>]*style="[^"]*backdrop-filter:blur\(5px\)[^"]*"[^>]*wp-block-button__link/ ),
		buttonWrapperClean: ! has( /<div class="wp-block-button[^"]*"[^>]*style="[^"]*backdrop/ ),
		table: has( /<table[^>]*backdrop-filter:blur\(5px\)|<table[^>]*style="[^"]*backdrop-filter/ ),
		searchButton: has( /wp-block-search__button[^>]*backdrop-filter|backdrop-filter:blur\(5px\)[^>]*wp-block-search__button/ ),
		quote: has( /<blockquote[^>]*backdrop-filter:blur\(5px\)/ ),
		maliciousRejected: ! has( /background:red/ ),
	};
}

const browser = await puppeteer.launch( {
	executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	headless: true,
	defaultViewport: { width: 1400, height: 900 },
} );

let port = 9500;
for ( const sc0 of scenarios ) {
for ( let attempt = 1; attempt <= 2; attempt++ ) {
	const sc = sc0;
	const name = sc.name;
	const started = Date.now();
	const steps = [
		{ step: 'defineWpConfigConsts', consts: { WP_DEBUG: true, WP_DEBUG_LOG: '/out/' + name + '-debug.log', WP_DEBUG_DISPLAY: false } },
		...( sc.plugins || [] ).map( ( slug ) => ( { step: 'installPlugin', pluginData: { resource: 'wordpress.org/plugins', slug }, options: { activate: false } } ) ),
		...( sc.theme ? [ { step: 'installTheme', themeData: { resource: 'wordpress.org/themes', slug: sc.theme }, options: { activate: true } } ] : [] ),
		{ step: 'activatePlugin', pluginPath: 'backdrop-filters/backdrop-filters.php' },
		{ step: 'runPHP', code: ACTIVATE.replace( 'SLUGS', JSON.stringify( sc.plugins || [] ) ).replaceAll( 'NAME', name ) },
		{ step: 'runPHP', code: FRONT_POST.replaceAll( "getenv( 'BF_NAME' )", JSON.stringify( name ) ) },
	];
	const mu = DIR + name + '.force-active.php';
	fs.writeFileSync( mu, `<?php
// Test-only: keep the scenario's plugins and Backdrop Filters active on every request.
add_filter( 'option_active_plugins', function ( $active ) {
	static $files = null;
	if ( null === $files ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		$slugs = array_merge( ${ JSON.stringify( sc.plugins || [] ).replace( /^\[/, 'array(' ).replace( /\]$/, ')' ) }, array( 'backdrop-filters' ) );
		$files = array();
		foreach ( get_plugins() as $f => $d ) { if ( in_array( dirname( $f ), $slugs, true ) ) { $files[] = $f; } }
	}
	return array_values( array_unique( array_merge( (array) $active, $files ) ) );
} );
// Test-only: render the test blocks inside a real front-end request.
add_action( 'template_redirect', function () {
	if ( ! isset( $_GET['bf_render'] ) ) { return; }
	echo do_blocks( ${ JSON.stringify( '' ) } . FRONTMARKUP );
	exit;
} );
` .replace( 'FRONTMARKUP', MARKUP ) );
	const bp = DIR + name + '.blueprint.json';
	fs.writeFileSync( bp, JSON.stringify( { login: true, preferredVersions: { wp: sc.wp, php: sc.php }, steps } ) );
	const p = port++;
	const srv = spawn( 'npx', [ '-y', '@wp-playground/cli@latest', 'server', '--port=' + p, '--blueprint=' + bp, '--mount=' + PLUGIN + ':/wordpress/wp-content/plugins/backdrop-filters', '--mount=' + OUT + ':/out', '--mount=' + mu + ':/wordpress/wp-content/mu-plugins/force-active.php' ], { cwd: DIR, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	let log = '';
	srv.stdout.on( 'data', ( d ) => ( log += d ) );
	srv.stderr.on( 'data', ( d ) => ( log += d ) );
	const base = 'http://127.0.0.1:' + p;
	const result = { name, wp: sc.wp, php: sc.php, plugins: sc.plugins || [], theme: sc.theme || null };
	try {
		let ready = false;
		for ( let i = 0; i < 200 && ! ready; i++ ) {
			await wait( 3000 );
			try {
				const r = await fetch( base + '/wp-login.php', { redirect: 'manual' } );
				const t = await r.text();
				ready = r.status < 500 && ! t.includes( 'not ready' );
			} catch ( e ) {}
		}
		if ( ! ready ) {
			throw new Error( 'server not ready: ' + log.slice( -400 ) );
		}
		const page = await browser.newPage();
		const consoleErrors = [];
		page.on( 'pageerror', ( e ) => consoleErrors.push( 'pageerror: ' + String( e ).slice( 0, 200 ) ) );
		page.on( 'console', ( m ) => {
			if ( m.type() === 'error' && ! /Block validation|Failed to load resource|favicon|net::ERR/i.test( m.text() ) ) {
				consoleErrors.push( m.text().slice( 0, 200 ) );
			}
		} );
		// Log in, then reach the editor; retry past cookie races and plugin welcome redirects.
		await page.setCookie( { name: 'wordpress_test_cookie', value: 'WP%20Cookie%20check', domain: '127.0.0.1', path: '/' } );
		for ( let tries = 0; tries < 4; tries++ ) {
			await page.goto( base + '/wp-admin/post-new.php', { waitUntil: 'domcontentloaded', timeout: 180000 } );
			if ( await page.$( '#user_login' ) ) {
				await page.type( '#user_login', 'admin' );
				await page.type( '#user_pass', 'password' );
				await Promise.all( [ page.waitForNavigation( { timeout: 120000 } ).catch( () => {} ), page.click( '#wp-submit' ) ] );
				continue;
			}
			if ( page.url().includes( 'post-new.php' ) ) {
				break;
			}
			await wait( 2000 );
		}
		result.editorUrl = page.url();
		result.editor = await page.evaluate( editorTest );
		result.editorScriptLoaded = await page.evaluate( () => !! [ ...document.scripts ].find( ( x ) => x.src.includes( 'plugins/backdrop-filters' ) ) );
		const ourErrors = consoleErrors.filter( ( e ) => /backdrop|plugins\/backdrop-filters/i.test( e ) );
		result.consoleErrors = consoleErrors.length;
		result.consoleErrorsFromPlugin = ourErrors;
		result.consoleErrorSample = consoleErrors.slice( 0, 3 );
		const postId = fs.existsSync( OUT + '/' + name + '-post.txt' ) ? fs.readFileSync( OUT + '/' + name + '-post.txt', 'utf8' ) : '';
		const html = await ( await fetch( base + '/?bf_render=1' ) ).text();
		result.front = frontChecks( html );
		const rf = OUT + '/' + name + '-render.html';
		result.directRender = fs.existsSync( rf ) ? frontChecks( fs.readFileSync( rf, 'utf8' ) ) : 'missing';
		const dbg = OUT + '/' + name + '-debug.log';
		const debug = fs.existsSync( dbg ) ? fs.readFileSync( dbg, 'utf8' ) : '';
		const af = OUT + '/' + name + '-activation.json';
		result.activation = fs.existsSync( af ) ? JSON.parse( fs.readFileSync( af, 'utf8' ) ) : null;
		result.phpNotices = debug.split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Notice|Deprecated)/.test( l ) ).length;
		result.phpFromPlugin = debug.split( '\n' ).filter( ( l ) => /backdrop-filters/.test( l ) ).slice( 0, 5 );
		await page.close();
	} catch ( e ) {
		result.error = String( e ).slice( 0, 500 );
	}
	fs.writeFileSync( OUT + '/' + name + '-server-' + attempt + '.log', log );
	srv.kill( 'SIGTERM' );
	result.seconds = Math.round( ( Date.now() - started ) / 1000 );
	result.attempt = attempt;
	if ( result.error && attempt === 1 ) { console.log( 'RETRY ' + name ); await wait( 3000 ); continue; }
	fs.appendFileSync( OUT + '/results.jsonl', JSON.stringify( result ) + '\n' );
	console.log( 'DONE ' + name + ' (' + result.seconds + 's)' );
	await wait( 2000 );
	break;
}
}
await browser.close();

// Summary: one line per scenario.
for ( const line of fs.readFileSync( OUT + '/results.jsonl', 'utf8' ).trim().split( '\n' ) ) {
	const r = JSON.parse( line );
	const editor = r.editor?.results ? Object.values( r.editor.results ).every( ( v ) => v.control && v.bgColorInPanel && ! v.inlineSaved && v.preview?.length ) : r.editor?.blockEditor === false ? 'n/a' : false;
	const front = r.front ? Object.values( r.directRender && typeof r.directRender === 'object' ? r.directRender : r.front ).every( Boolean ) : false;
	console.log( `${ r.name.padEnd( 26 ) } editor:${ String( editor ).padEnd( 6 ) } front:${ String( front ).padEnd( 6 ) } plugin errors:${ ( r.consoleErrorsFromPlugin?.length || 0 ) + ( r.phpFromPlugin?.length || 0 ) }${ r.error ? '  ERROR ' + r.error.slice( 0, 80 ) : '' }` );
}
