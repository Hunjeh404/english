// Only microphone PCM enters this processor. Frame offsets use the same clock as the backing source.
class ReadingPcmRecorder extends AudioWorkletProcessor {
 constructor(){super();this.startFrame=Infinity;this.stopFrame=Infinity;this.done=false;this.batch=new Float32Array(2048);this.used=0;this.batchOffset=0;this.lastFrame=0;
  this.port.onmessage=({data})=>{if(data.type==='start'){this.startFrame=data.startFrame;this.stopFrame=data.stopFrame;}else if(data.type==='stop')this.finish(Math.max(this.startFrame,currentFrame));};
 }
 flush(){if(!this.used)return;const samples=this.batch.slice(0,this.used);this.port.postMessage({type:'chunk',offset:this.batchOffset,samples},[samples.buffer]);this.used=0;}
 finish(frame){if(this.done)return;this.flush();this.done=true;this.port.postMessage({type:'done',frames:Math.max(0,Math.min(frame,this.stopFrame)-this.startFrame)});}
 process(inputs,outputs){
  if(this.done)return false;const input=inputs[0]||[],size=outputs[0]?.[0]?.length||128;
  for(let i=0;i<size;i++){const frame=currentFrame+i;if(frame>=this.stopFrame){this.finish(frame);break;}if(frame<this.startFrame)continue;
   if(!this.used)this.batchOffset=frame-this.startFrame;let sample=0;for(const channel of input)sample+=channel[i]||0;
   this.batch[this.used++]=input.length?sample/input.length:0;this.lastFrame=frame+1;if(this.used===this.batch.length)this.flush();
  }
  return !this.done;
 }
}
registerProcessor('reading-pcm-recorder',ReadingPcmRecorder);
