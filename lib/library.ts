import type {Passage,ReadingFolder} from './reading-core';
export const READING_SORTS=[
 {value:'name-asc',label:'이름순 · 가나다 / A → Z'},
 {value:'name-desc',label:'이름 역순 · Z → A / 가나다 역순'},
 {value:'date-desc',label:'날짜순 · 최신순'},
 {value:'date-asc',label:'날짜 역순 · 오래된순'},
] as const;
export type ReadingSort=typeof READING_SORTS[number]['value'];
export function isReadingSort(value:unknown):value is ReadingSort{return READING_SORTS.some(s=>s.value===value);}
const names=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
export function sortReadings(items:Passage[],order:ReadingSort){
 const sorted=[...items].sort((a,b)=>{
  const title=names.compare(a.title,b.title);
  const date=(Date.parse(a.created_at)||0)-(Date.parse(b.created_at)||0);
  return (order.startsWith('name-')?title||date:date||title)||a.id.localeCompare(b.id);
 });
 return order.endsWith('-desc')?sorted.reverse():sorted;
}
export function sortFolders(folders:ReadingFolder[]){return [...folders].sort((a,b)=>names.compare(a.name,b.name)||a.id.localeCompare(b.id));}
export function folderNavigation(folders:ReadingFolder[]){return [{id:'all',name:'전체 리딩'},...sortFolders(folders),{id:'unfiled',name:'미분류'}];}
export function filterReadings(items:Passage[],folder:string,search=''){
 const query=search.toLowerCase();
 return items.filter(p=>(folder==='all'||(p.folder_id||'unfiled')===folder)&&p.title.toLowerCase().includes(query));
}
