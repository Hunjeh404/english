export type PlaybackLoop={start:number;end:number|null;enabled:boolean};
export function isArrowSeekStep(value:number){return Number.isInteger(value)&&value>=1&&value<=60;}
export function arrowSeekDelta(code:string,step:number){return code==='ArrowLeft'?-step:code==='ArrowRight'?step:0;}
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
