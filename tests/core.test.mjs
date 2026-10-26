import test from 'node:test';
import assert from 'node:assert/strict';
import {chime,pcmToWav,splitForSpeech} from '../lib/reading-core.ts';
import {seekTime,repeatTarget,isArrowSeekStep,arrowSeekDelta,arrowVolumeDelta,clampVolume,ListeningClock} from '../lib/playback.ts';
import {filterReadings,sortReadings,folderNavigation,isReadingSort} from '../lib/library.ts';
test('speech splitting preserves words, punctuation and tail with bounded chunks',()=>{const input='Good morning! '+('These are important words. '.repeat(40))+'Be sure to wake it up at 6:59.';const chunks=splitForSpeech(input);assert.ok(chunks.every(c=>c.length<=270));assert.equal(chunks.join(' ').replace(/\s+/g,' ').trim(),input.replace(/\s+/g,' ').trim());});
test('WAV contains PCM mono samples, correct duration, and identical start/end chimes',()=>{const bell=chime(),samples=[bell,new Float32Array(24000),bell],wav=pcmToWav(samples),view=new DataView(wav);assert.equal(view.getUint32(0),0x52494646);assert.equal(view.getUint32(8),0x57415645);assert.equal(view.getUint32(24,true),24000);assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(40,true),wav.byteLength-44);assert.equal(wav.byteLength,44+(24000+2*bell.length)*2);const bytes=new Uint8Array(wav);assert.deepEqual(bytes.slice(44,44+bell.length*2),bytes.slice(-bell.length*2));assert.ok(Math.max(...bell)<1);assert.ok(bell.some(v=>v!==0));});

test('speech chunks preserve decimals, times and abbreviations',()=>{const text="Dr. Smith paid £3.50 at 6:59. Visit the U.S. office.";assert.equal(splitForSpeech(text).join(' '),text);});
test('seeking respects audio bounds and active A-B bounds',()=>{
 const off={start:12,end:25,enabled:false},on={...off,enabled:true};
 assert.equal(seekTime(-10,120,off),0);assert.equal(seekTime(130,120,off),120);
 for(const jump of [1,3,5,10]){assert.equal(seekTime(18+jump,120,off),18+jump);assert.equal(seekTime(18-jump,120,off),18-jump);}
 assert.equal(seekTime(3,120,on),12);assert.equal(seekTime(50,120,on),25);
});
test('A-B repeat restarts exactly at its endpoint and stays off until enabled',()=>{
 const range={start:3.5,end:10,enabled:true};
 assert.equal(repeatTarget(9.99,range),null);assert.equal(repeatTarget(10,range),3.5);
 assert.equal(repeatTarget(120,range),3.5);assert.equal(repeatTarget(0,range),3.5);
 assert.equal(repeatTarget(10,{...range,enabled:false}),null);
 assert.equal(repeatTarget(10,{...range,end:null}),null);
});
test('folders distinguish all, unfiled, and selected readings while applying title search',()=>{
 const items=[{id:'1',title:'British Laws',folder_id:null},{id:'2',title:'Nature',folder_id:'science'},{id:'3',title:'British Animals',folder_id:'science'},{id:'4',title:'History'}];
 assert.equal(filterReadings(items,'all').length,4);
 assert.deepEqual(filterReadings(items,'unfiled').map(p=>p.id),['1','4']);
 assert.deepEqual(filterReadings(items,'science','BRITISH').map(p=>p.id),['3']);
 assert.deepEqual(filterReadings(items,'empty'),[]);
});
test('reading sorting supports natural names, dates, and exact reverse order without mutation',()=>{
 const items=[{id:'a',title:'Lesson 10',created_at:'2026-10-01T00:00:00Z'},{id:'b',title:'Lesson 2',created_at:'2026-10-03T00:00:00Z'},{id:'c',title:'Apple',created_at:'2026-10-02T00:00:00Z'}];
 assert.deepEqual(sortReadings(items,'name-asc').map(p=>p.id),['c','b','a']);
 assert.deepEqual(sortReadings(items,'name-desc').map(p=>p.id),['a','b','c']);
 assert.deepEqual(sortReadings(items,'date-desc').map(p=>p.id),['b','c','a']);
 assert.deepEqual(sortReadings(items,'date-asc').map(p=>p.id),['a','c','b']);
 assert.deepEqual(items.map(p=>p.id),['a','b','c']);
 assert.equal(isReadingSort('date-desc'),true);assert.equal(isReadingSort('random'),false);
});
test('folders use name order and always place unfiled last',()=>{
 const folders=[{id:'3',name:'Unit 10'},{id:'1',name:'Apple'},{id:'2',name:'Unit 2'}];
 assert.deepEqual(folderNavigation(folders).map(f=>f.id),['all','1','2','3','unfiled']);
 assert.deepEqual(folders.map(f=>f.id),['3','1','2']);
});
test('arrow seeking defaults to three seconds and accepts only whole seconds in range',()=>{
 assert.equal(arrowSeekDelta('ArrowLeft',3),-3);assert.equal(arrowSeekDelta('ArrowRight',3),3);
 assert.equal(arrowSeekDelta('ArrowRight',10),10);assert.equal(arrowSeekDelta('ArrowUp',3),0);
 for(const value of [1,3,60])assert.equal(isArrowSeekStep(value),true);
 for(const value of [0,-1,1.5,61,NaN,Infinity])assert.equal(isArrowSeekStep(value),false);
});
test('completion uses real playback time, excluding pauses and buffering',()=>{
 const clock=new ListeningClock();clock.start(0);clock.start(5000);clock.pause(30000);
 assert.equal(clock.seconds(90000),30); // Paused for a minute.
 clock.start(90000);clock.pause(180000);
 assert.equal(clock.seconds(180000),120);assert.equal(clock.qualifies(120,180000),true);
 assert.equal(clock.qualifies(120.001,180000),false);
});
test('fast playback and skipping to the end do not satisfy the duration requirement',()=>{
 const fast=new ListeningClock();fast.start(0);fast.pause(80000);
 assert.equal(fast.qualifies(120,80000),false); // 120 seconds at 1.5x.
 const seek=new ListeningClock();seek.start(0);seek.pause(1000);seek.start(10000);seek.pause(11000);
 assert.equal(seek.seconds(11000),2);assert.equal(seek.qualifies(120,11000),false);
 const stopped=new ListeningClock();assert.equal(stopped.qualifies(120,999999),false);
});
test('rewinding retains actual listening time without crediting the seek itself',()=>{
 const clock=new ListeningClock();clock.start(0);clock.pause(60000);clock.start(65000);clock.pause(125000);
 assert.equal(clock.qualifies(120,125000),true);
});
test('vertical arrows change volume by five percentage points within bounds',()=>{
 assert.equal(arrowVolumeDelta('ArrowUp'),.05);assert.equal(arrowVolumeDelta('ArrowDown'),-.05);
 assert.equal(arrowVolumeDelta('ArrowRight'),0);
 assert.equal(clampVolume(1.05),1);assert.equal(clampVolume(-.05),0);
 assert.equal(clampVolume(.95+arrowVolumeDelta('ArrowUp')),1);
});
