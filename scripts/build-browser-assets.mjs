import {build} from 'esbuild';
await build({entryPoints:['lib/tts-worker.ts'],bundle:true,format:'esm',platform:'browser',minify:true,outfile:'public/tts-worker.js'});
await import('./build-media-assets.mjs');
