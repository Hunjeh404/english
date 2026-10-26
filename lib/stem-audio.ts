export type LatencyEstimate={milliseconds:number;available:boolean;inputReported:boolean;outputReported:boolean};
export type StemEdits={voiceGain:number;musicGain:number;voiceShiftMs:number;musicShiftMs:number};
export type SeparateTake={voice:AudioBuffer;backing:AudioBuffer;backingBlob:Blob;backingName:string;latency:LatencyEstimate};
export function estimateRoundTrip(input?:number,base?:number,output?:number):LatencyEstimate{
 const valid=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=3;
 const inputReported=valid(input),outputReported=valid(output)&&output!>0;
 const available=inputReported||outputReported;
 return {milliseconds:available?Math.min(3000,Math.round(((inputReported?input!:0)+(valid(base)?base!:0)+(outputReported?output!:0))*1000)):0,available,inputReported,outputReported};
}
export function stemPlacement(duration:number,shiftMs:number,cursor=0){
 const shift=shiftMs/1000,offset=Math.max(0,cursor-shift),delay=Math.max(0,shift-cursor);
 return offset>=duration?null:{offset,delay,remaining:duration-offset};
}
export function stemDuration(voiceDuration:number,musicDuration:number,edits:StemEdits){return Math.max(.05,voiceDuration+edits.voiceShiftMs/1000,musicDuration+edits.musicShiftMs/1000);}
export function connectStem(context:BaseAudioContext,buffer:AudioBuffer,level:number,shiftMs:number,start:number,cursor:number,destination:AudioNode){
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=level;source.connect(gain).connect(destination);
 const placement=stemPlacement(buffer.duration,shiftMs,cursor);
 if(placement)source.start(start+placement.delay,placement.offset,placement.remaining);
 return {source,gain,scheduled:!!placement};
}
export function mixLimiter(context:BaseAudioContext,destination:AudioNode){const limiter=context.createDynamicsCompressor();limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.003;limiter.release.value=.1;limiter.connect(destination);return limiter;}
export function bufferWav(buffer:AudioBuffer):Blob{
 const channels=buffer.numberOfChannels,count=buffer.length,bytes=new ArrayBuffer(44+count*channels*2),view=new DataView(bytes);
 const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes.byteLength-44,true);
 const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let offset=44;
 for(let i=0;i<count;i++)for(let channel=0;channel<channels;channel++){const value=Math.max(-1,Math.min(1,data[channel][i]));view.setInt16(offset,value<0?value*32768:value*32767,true);offset+=2;}
 return new Blob([bytes],{type:'audio/wav'});
}
export async function renderStemMix(take:SeparateTake,edits:StemEdits){
 const duration=stemDuration(take.voice.duration,take.backing.duration,edits),context=new OfflineAudioContext(2,Math.ceil(duration*48000),48000),limiter=mixLimiter(context,context.destination);
 connectStem(context,take.voice,edits.voiceGain,edits.voiceShiftMs,0,0,limiter);connectStem(context,take.backing,edits.musicGain,edits.musicShiftMs,0,0,limiter);
 return bufferWav(await context.startRendering());
}
