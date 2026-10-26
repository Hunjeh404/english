import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Upload,CloudCheck,LoaderCircle} from 'lucide-react';
import {formatTime,uuid} from '../lib/reading-core';
import {cloudApi} from '../lib/cloud-store';

type AudioFile={file:File;url:string;duration:number;id:string};
export default function AudioUpload({busy,onBusy,onSaved,folderId}:{folderId:string|null;busy:boolean;onBusy:(value:boolean)=>void;onSaved:(id:string)=>Promise<void>}){
 const [audio,setAudio]=useState<AudioFile|null>(null),[title,setTitle]=useState(''),[body,setBody]=useState(''),[goal,setGoal]=useState(10),[error,setError]=useState('');
 const fileRef=useRef<AudioFile|null>(null),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;if(fileRef.current)URL.revokeObjectURL(fileRef.current.url);};},[]);
 async function choose(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;setError('');
  if(file.size<100||file.size>40*1024*1024){setError('100바이트 이상, 40MB 이하의 음원을 선택해 주세요.');return;}
  onBusy(true);const url=URL.createObjectURL(file),probe=new Audio();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const duration=await new Promise<number>((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('음원을 읽는 데 시간이 걸립니다. 다른 파일을 선택해 주세요.')),15000);probe.onloadedmetadata=()=>Number.isFinite(probe.duration)&&probe.duration>=.1?resolve(probe.duration):reject(new Error('음원 길이를 읽지 못했습니다.'));probe.onerror=()=>reject(new Error('이 브라우저에서 재생할 수 없는 음원입니다.'));probe.src=url;});
   if(duration>1200)throw new Error('음원은 20분 이하로 선택해 주세요.');
   if(!live.current){URL.revokeObjectURL(url);return;}
   if(fileRef.current)URL.revokeObjectURL(fileRef.current.url);
   const next={file,url,duration,id:uuid()};fileRef.current=next;setAudio(next);setTitle(file.name.replace(/\.[^.]+$/,'').slice(0,120));
  }catch(e){URL.revokeObjectURL(url);if(live.current)setError((e as Error).message);}
  finally{clearTimeout(timer);probe.removeAttribute('src');probe.load();onBusy(false);}
 }
 async function save(){if(!audio||!title.trim()||busy)return;onBusy(true);setError('');try{
  const form=new FormData();form.set('id',audio.id);form.set('title',title.trim());form.set('body',body.trim());form.set('voice','uploaded');form.set('goal',String(goal));form.set('duration',String(audio.duration));form.set('audio',audio.file);if(folderId)form.set('folder_id',folderId);
  await cloudApi('/api/passages',{method:'POST',body:form});await onSaved(audio.id);
 }catch(e){if(live.current)setError((e as Error).message);}finally{onBusy(false);}}
 return <div className="audio-upload">
  {error&&<p className="message error" role="alert">{error}</p>}
  <label className={`upload-zone ${busy?'disabled':''}`}><Upload size={25}/><strong>기기에 있는 음원 선택</strong><span>MP3 · WAV · M4A · OGG · FLAC · WEBM</span><small>40MB · 20분 이하</small><input aria-label="새 리딩 음원 파일" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/flac,audio/webm,.mp3,.wav,.m4a,.ogg,.flac,.webm" onChange={choose} disabled={busy}/></label>
  {audio&&<div className="uploaded-audio-preview"><span>{audio.file.name} · {formatTime(audio.duration)}</span><audio controls src={audio.url}/></div>}
  <label className="field-label" htmlFor="audio-reading-title">리딩 제목</label><input id="audio-reading-title" className="title-input" value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} placeholder="음원을 선택하면 파일명이 제목으로 들어갑니다" disabled={busy}/>
  <label className="field-label editor-label" htmlFor="audio-reading-body">본문 (선택)</label><textarea id="audio-reading-body" className="audio-optional-body" value={body} maxLength={8000} onChange={e=>setBody(e.target.value)} placeholder="본문 없이 음원만 저장할 수 있습니다." disabled={busy}/>
  <div className="audio-upload-actions"><label className="field-label" htmlFor="audio-reading-goal">목표 듣기 횟수 <input id="audio-reading-goal" type="number" min="1" max="100" value={goal} disabled={busy} onChange={e=>setGoal(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label><button className="primary" disabled={!audio||!title.trim()||busy} onClick={save}>{busy?<LoaderCircle size={17} className="spin"/>:<CloudCheck size={17}/>}음원 저장하기</button></div>
 </div>;
}
