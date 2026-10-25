import type {FFmpeg} from '@ffmpeg/ffmpeg';
let encoder:FFmpeg|null=null;
let loading:Promise<FFmpeg>|null=null;
let generation=0;
export function releaseEncoder(){generation++;encoder?.terminate();encoder=null;loading=null;}
async function getEncoder(status:(s:string)=>void){
 if(encoder?.loaded)return encoder;
 if(loading)return loading;
 const epoch=generation;
 loading=(async()=>{status('내보내기 엔진 준비 중… 처음에는 약 32MB를 받습니다.');
  const [{FFmpeg},{toBlobURL}]=await Promise.all([import('@ffmpeg/ffmpeg'),import('@ffmpeg/util')]);
  if(epoch!==generation)throw new Error('내보내기를 취소했습니다.');
  const f=new FFmpeg();encoder=f;
  const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
  const urls=await Promise.all([toBlobURL(base+'/ffmpeg-core.js','text/javascript'),toBlobURL(base+'/ffmpeg-core.wasm','application/wasm')]);
  try{if(epoch!==generation)throw new Error('내보내기를 취소했습니다.');await f.load({classWorkerURL:location.origin+'/vendor/ffmpeg/worker.js',coreURL:urls[0],wasmURL:urls[1]});return f;}
  catch(e){if(encoder===f)releaseEncoder();throw e;}finally{urls.forEach(u=>URL.revokeObjectURL(u));}
 })();return loading;
}
export async function exportMedia(source:Blob,format:'mp3'|'mp4',cover:Blob|null,status:(s:string)=>void){
 const f=await getEncoder(status);const input='take.audio',output='reading.'+format;
 const progress=({progress}:{progress:number})=>status(`변환 중… ${Math.min(99,Math.max(0,Math.round(progress*100)))}%`);
 f.on('progress',progress);
 try{
  await f.writeFile(input,new Uint8Array(await source.arrayBuffer()));
  let args:string[];
  if(format==='mp3')args=['-i',input,'-vn','-c:a','libmp3lame','-b:a','320k','-ar','48000','-ac','2',output];
  else{if(!cover)throw new Error('영상의 정지화면을 준비하지 못했습니다.');await f.writeFile('cover.png',new Uint8Array(await cover.arrayBuffer()));
   args=['-loop','1','-framerate','2','-i','cover.png','-i',input,'-c:v','libx264','-preset','ultrafast','-tune','stillimage','-crf','20','-pix_fmt','yuv420p','-r','2','-c:a','aac','-b:a','320k','-ar','48000','-ac','2','-shortest','-movflags','+faststart',output];}
  status('변환 중…');if(await f.exec(args)!==0)throw new Error('이 음원을 변환하지 못했습니다. 다른 형식의 음원으로 다시 시도해 주세요.');
  const data=await f.readFile(output);if(typeof data==='string')throw new Error('출력 파일을 읽지 못했습니다.');
  return new Blob([new Uint8Array(data)],{type:format==='mp3'?'audio/mpeg':'video/mp4'});
 }finally{f.off('progress',progress);await Promise.allSettled([input,output,'cover.png'].map(p=>f.deleteFile(p)));}
}
export async function makeCover(title:string,body:string,imageUrl?:string){
 await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const c=canvas.getContext('2d')!;
 c.fillStyle='#f6f3ed';c.fillRect(0,0,1920,1080);
 if(imageUrl){const image=new Image();image.crossOrigin='anonymous';await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('정지화면 사진을 불러오지 못했습니다. 본문 텍스트를 선택해 주세요.'));image.src=imageUrl;});const ratio=Math.min(1824/image.width,984/image.height);c.drawImage(image,(1920-image.width*ratio)/2,(1080-image.height*ratio)/2,image.width*ratio,image.height*ratio);}
 else{
  c.fillStyle='#527663';c.font='22px sans-serif';c.fillText('READING STUDIO · BRITISH ENGLISH',96,65);
  const wrap=(text:string,width:number)=>{const lines:string[]=[];for(const paragraph of text.split(/\n/)){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(c.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}lines.push(line);}return lines;};
  c.fillStyle='#24392e';c.font='bold 42px sans-serif';const headings=wrap(title,1728);headings.forEach((line,i)=>c.fillText(line,96,130+i*52));const top=165+headings.length*52,available=1000-top;
  let size=36,lines:string[]=[];do{c.font=`${size}px Georgia,serif`;lines=wrap(body,1728);if(lines.length*size*1.32<=available||size<=14)break;size-=2;}while(size>=14);
  // A single still frame must include the complete passage; very long texts use smaller type.
  if(lines.length*size*1.32>available){size=Math.max(8,Math.floor(size*available/(lines.length*size*1.32)));c.font=`${size}px Georgia,serif`;lines=wrap(body,1728);}
  c.fillStyle='#29372f';lines.forEach((line,i)=>c.fillText(line,96,top+i*size*1.32));
 }
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('정지화면을 만들지 못했습니다.')),'image/png'));
}
