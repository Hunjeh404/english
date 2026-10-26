import type {Passage} from './reading-core';
export function filterReadings(items:Passage[],folder:string,search=''){
 const query=search.toLowerCase();
 return items.filter(p=>(folder==='all'||(p.folder_id||'unfiled')===folder)&&p.title.toLowerCase().includes(query));
}
