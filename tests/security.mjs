// Runs tests/security-fuzz.php inside a WordPress Playground (default: WordPress 6.6 on PHP 7.4).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const DIR = new URL( '.', import.meta.url ).pathname;
const [ wp = '6.6', php = '7.4' ] = process.argv.slice( 2 );
const OUT = DIR + 'compat/out';
fs.mkdirSync( OUT, { recursive: true } );
fs.rmSync( OUT + '/sec.txt', { force: true } );
const bp = DIR + 'compat/security.blueprint.json';
fs.writeFileSync( bp, JSON.stringify( { preferredVersions: { wp, php }, steps: [ { step: 'activatePlugin', pluginPath: 'glass-act/glass-act.php' }, { step: 'runPHP', code: fs.readFileSync( DIR + 'security-fuzz.php', 'utf8' ) } ] } ) );
spawnSync( 'npx', [ '-y', '@wp-playground/cli@latest', 'run-blueprint', '--blueprint=' + bp, '--mount=' + DIR + 'compat/.plugin/glass-act:/wordpress/wp-content/plugins/glass-act', '--mount=' + OUT + ':/out' ], { stdio: 'ignore' } );
const result = fs.existsSync( OUT + '/sec.txt' ) ? fs.readFileSync( OUT + '/sec.txt', 'utf8' ) : 'FAILURES: suite did not run';
console.log( result.split( '\n' ).filter( ( l ) => /^FAIL|FAILURES|PHP |regex/.test( l ) ).join( '\n' ) );
process.exit( /FAILURES: 0 of/.test( result ) ? 0 : 1 );
