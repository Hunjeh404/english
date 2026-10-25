export const VOICES = [
  { id: 'bf_emma', name: 'Emma', label: '여성 · 영국 영어' },
  { id: 'bf_isabella', name: 'Isabella', label: '여성 · 영국 영어' },
  { id: 'bm_george', name: 'George', label: '남성 · 영국 영어' },
  { id: 'bm_fable', name: 'Fable', label: '남성 · 영국 영어' },
] as const;
export type Passage = { id: string; title: string; body: string; voice: string; images: string; duration: number; goal: number; created_at: string; completed: number };
export function splitForSpeech(text: string, limit = 270): string[] {
 const chunks: string[] = []; let chunk = '';
 for(const word of text.trim().split(/\s+/)) {
   if(chunk && (chunk+' '+word).length > limit){chunks.push(chunk);chunk='';}
   chunk += (chunk?' ':'')+word;
   if(chunk.length>=180 && /[.!?]["'”’]?$/.test(word)){chunks.push(chunk);chunk='';}
 }
 if(chunk)chunks.push(chunk);
 return chunks.filter(Boolean);
}
export function chime(sampleRate = 24000): Float32Array {
  const notes = [523.251, 659.255, 783.991, 1046.502];
  const data = new Float32Array(Math.round(sampleRate * 1.55));
  notes.forEach((frequency, index) => {
    const start = Math.round(index * .22 * sampleRate), length = Math.round((index === 3 ? .72 : .39) * sampleRate);
    for (let i = 0; i < length && start + i < data.length; i++) {
      const t = i / sampleRate, attack = Math.min(1, t / .008), release = Math.min(1, (length - i) / (sampleRate * .07));
      data[start + i] += .21 * attack * release * Math.exp(-4.2 * t) * (Math.sin(2 * Math.PI * frequency * t) + .18 * Math.sin(4 * Math.PI * frequency * t));
    }
  });
  return data;
}
export function pcmToWav(chunks: Float32Array[], sampleRate = 24000): ArrayBuffer {
  const count = chunks.reduce((sum, c) => sum + c.length, 0);
  const buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
  const str = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, count * 2, true);
  let offset = 44;
  for (const chunk of chunks) for (const value of chunk) { const sample = Math.max(-1, Math.min(1, value)); view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true); offset += 2; }
  return buffer;
}
export function formatTime(seconds: number) { const n = Math.max(0, Math.floor(seconds || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; }

export function uuid(): string {
 if(typeof crypto.randomUUID === 'function') return crypto.randomUUID();
 const b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
 const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
