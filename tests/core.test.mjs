import test from 'node:test';
import assert from 'node:assert/strict';
import {chime,pcmToWav,splitForSpeech} from '../lib/reading-core.ts';
import {seekTime,repeatTarget} from '../lib/playback.ts';
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
