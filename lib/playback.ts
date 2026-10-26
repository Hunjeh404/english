export type PlaybackLoop={start:number;end:number|null;enabled:boolean};
export function isArrowSeekStep(value:number){return Number.isInteger(value)&&value>=1&&value<=60;}
export function arrowSeekDelta(code:string,step:number){return code==='ArrowLeft'?-step:code==='ArrowRight'?step:0;}
export function arrowVolumeDelta(code:string){return code==='ArrowUp'?.05:code==='ArrowDown'?-.05:0;}
export function clampVolume(value:number){return Math.max(0,Math.min(1,Math.round(value*100)/100));}
/** Wall-clock time while the media is playing, excluding pauses, stalls and seeks. */
export class ListeningClock{
 private accumulated=0;
 private started:number|null=null;
 start(now:number){if(this.started===null)this.started=now;}
 pause(now:number){if(this.started!==null){this.accumulated+=Math.max(0,now-this.started);this.started=null;}}
 seconds(now:number){return (this.accumulated+(this.started===null?0:Math.max(0,now-this.started)))/1000;}
 qualifies(duration:number,now:number){return Number.isFinite(duration)&&duration>0&&this.seconds(now)>=duration;}
}
export function activeLoop(loop:PlaybackLoop):loop is PlaybackLoop&{end:number}{
 return loop.enabled&&loop.end!==null&&loop.end-loop.start>=.25;
}
export function seekTime(time:number,duration:number,loop:PlaybackLoop){
 const min=activeLoop(loop)?loop.start:0,max=activeLoop(loop)?loop.end:duration;
 return Math.max(min,Math.min(max,Number.isFinite(time)?time:0));
}
export function repeatTarget(time:number,loop:PlaybackLoop){
 return activeLoop(loop)&&(time>=loop.end||time<loop.start)?loop.start:null;
}
