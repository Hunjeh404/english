import {mkdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url),root=dirname(require.resolve('@ffmpeg/ffmpeg'));
const dir=join(root,'../esm');await mkdir('public/vendor/ffmpeg',{recursive:true});
for(const file of ['worker.js','const.js','errors.js'])await copyFile(join(dir,file),join('public/vendor/ffmpeg',file));
