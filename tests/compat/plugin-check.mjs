import { spawn } from 'node:child_process';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const DIR = new URL( '.', import.meta.url ).pathname;
const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );
const bp = DIR + 'pc.blueprint.json';
fs.writeFileSync( bp, JSON.stringify( { login: true, preferredVersions: { wp: '7.1', php: '8.3' }, steps: [ { step: 'installPlugin', pluginData: { resource: 'wordpress.org/plugins', slug: 'plugin-check' }, options: { activate: true } }, { step: 'activatePlugin', pluginPath: 'backdrop-filters/backdrop-filters.php' } ] } ) );
const srv = spawn( 'npx', [ '-y', '@wp-playground/cli@latest', 'server', '--port=9480', '--blueprint=' + bp, '--mount=' + DIR + '.plugin/backdrop-filters:/wordpress/wp-content/plugins/backdrop-filters' ], { cwd: DIR, stdio: 'ignore' } );
const base = 'http://127.0.0.1:9480';
for ( let i = 0; i < 200; i++ ) { await wait( 3000 ); try { const r = await fetch( base + '/wp-login.php', { redirect: 'manual' } ); if ( r.status < 500 && ! ( await r.text() ).includes( 'not ready' ) ) break; } catch ( e ) {} }
const browser = await puppeteer.launch( { executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } );
const page = await browser.newPage();
await page.goto( base + '/wp-login.php', { waitUntil: 'domcontentloaded' } );
if ( await page.$( '#user_login' ) ) { await page.evaluate( () => { document.querySelector( '#user_login' ).value = 'admin'; document.querySelector( '#user_pass' ).value = 'password'; document.querySelector( '#loginform' ).submit(); } ); await page.waitForNavigation().catch( () => {} ); }
await page.goto( base + '/wp-admin/tools.php?page=plugin-check', { waitUntil: 'domcontentloaded', timeout: 120000 } );
await wait( 3000 );
const res = await page.evaluate( async () => {
	const sel = document.querySelector( '#plugin-check__plugins-dropdown, select[name=plugin_check_plugins]' );
	sel.value = 'backdrop-filters/backdrop-filters.php'; sel.dispatchEvent( new Event( 'change', { bubbles: true } ) );
	document.querySelectorAll( 'input[type=checkbox]' ).forEach( ( c ) => { if ( [ 'general', 'plugin_repo', 'security', 'performance', 'accessibility', 'error', 'warning' ].includes( c.value ) && ! c.checked ) c.click(); } );
	const b = document.querySelector( '#plugin-check__submit' ); b.disabled = false; b.click();
	for ( let i = 0; i < 90; i++ ) { await new Promise( ( r ) => setTimeout( r, 1000 ) ); const t = document.querySelector( '#plugin-check__results' )?.innerText || ''; if ( /Checks complete/.test( t ) ) return { cats: [ ...document.querySelectorAll( 'input[type=checkbox]:checked' ) ].map( ( c ) => c.value ).join( ',' ), text: t.slice( 0, 3000 ) }; }
	return { text: 'timeout: ' + ( document.querySelector( '#plugin-check__results' )?.innerText || '' ).slice( 0, 500 ) };
} );
console.log( JSON.stringify( res, null, 1 ) );
await browser.close(); srv.kill();
