import {useState} from 'react';
import {Folder,FolderPlus,Pencil,Trash2,X} from 'lucide-react';
import type {Passage,ReadingFolder} from '../lib/reading-core';
import {cloudApi} from '../lib/cloud-store';
import {folderNavigation} from '../lib/library';
type Props={folders:ReadingFolder[];items:Passage[];selected:string;canManage:boolean;busy:boolean;onSelect:(id:string)=>void;onBusy:(value:boolean)=>void;onChanged:(id:string)=>Promise<void>};
export default function LibraryFolders({folders,items,selected,canManage,busy,onSelect,onBusy,onChanged}:Props){
 const [action,setAction]=useState<'create'|'rename'|'delete'|null>(null),[name,setName]=useState(''),[error,setError]=useState('');
 const current=folders.find(f=>f.id===selected);
 function open(next:'create'|'rename'|'delete'){setName(next==='rename'?current?.name||'':'');setError('');setAction(next);}
 async function submit(){if(!action||busy)return;onBusy(true);setError('');try{
  let target=selected;
  if(action==='create'){const added=await cloudApi('/api/folders',{method:'POST',body:JSON.stringify({name})}) as ReadingFolder;target=added.id;}
  else if(current){await cloudApi(`/api/folders/${current.id}`,{method:action==='delete'?'DELETE':'PATCH',body:action==='rename'?JSON.stringify({name}):undefined});if(action==='delete')target='unfiled';}
  await onChanged(target);setAction(null);
 }catch(e){setError((e as Error).message);}finally{onBusy(false);}}
 return <section className="library-folders" aria-label="보관함 폴더">
  <div className="folder-heading"><span>폴더</span>{canManage&&<div>{current&&<><button className="icon-btn" aria-label="폴더 이름 변경" disabled={busy} onClick={()=>open('rename')}><Pencil size={14}/></button><button className="icon-btn" aria-label="폴더 삭제" disabled={busy} onClick={()=>open('delete')}><Trash2 size={14}/></button></>}<button className="icon-btn" aria-label="새 폴더 만들기" disabled={busy} onClick={()=>open('create')}><FolderPlus size={17}/></button></div>}</div>
  <nav className="folder-list" aria-label="리딩 폴더 선택">{folderNavigation(folders).map(folder=><button key={folder.id} className={selected===folder.id?'selected':''} aria-pressed={selected===folder.id} disabled={busy} onClick={()=>onSelect(folder.id)}><Folder size={15}/><span>{folder.name}</span><small>{items.filter(p=>folder.id==='all'||(p.folder_id||'unfiled')===folder.id).length}</small></button>)}</nav>
  {action&&<div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" onSubmit={e=>{e.preventDefault();void submit();}}><button type="button" className="modal-close icon-btn" aria-label="폴더 설정 닫기" disabled={busy} onClick={()=>setAction(null)}><X size={21}/></button><h2 id="folder-dialog-title">{action==='create'?'새 폴더 만들기':action==='rename'?'폴더 이름 변경':'폴더 삭제'}</h2>{action==='delete'?<p>‘{current?.name}’ 폴더를 삭제합니다. 안에 있는 리딩은 삭제하지 않고 미분류로 이동합니다.</p>:<><label className="field-label" htmlFor="folder-name">폴더 이름</label><input id="folder-name" autoFocus maxLength={60} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></>}{error&&<p role="alert" className="message error">{error}</p>}<button className={action==='delete'?'delete-button wide':'primary wide'} disabled={busy||(action!=='delete'&&!name.trim())} type="submit">{busy?'저장 중…':action==='delete'?'폴더만 삭제':'저장'}</button></form></div>}
 </section>;
}
