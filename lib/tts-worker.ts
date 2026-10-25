/// <reference lib="webworker" />
import { KokoroTTS, env } from 'kokoro-js';
import { chime, pcmToWav, splitForSpeech } from './reading-core';
let model: KokoroTTS | null = null;
env.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0-dev.20250409-89f8206ba4/dist/';
self.onmessage = async (event: MessageEvent<{ text: string; voice: string }>) => {
  try {
    const { text, voice } = event.data;
    if (!model) {
      self.postMessage({ type: 'progress', message: '영국 음성 준비 중 · 첫 사용은 모델 다운로드가 필요합니다', percent: 2 });
      model = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8', device: 'wasm',
        progress_callback: (p) => { if ('progress' in p && typeof p.progress === 'number') self.postMessage({ type: 'progress', message: '음성 모델 내려받는 중', percent: Math.round(p.progress * .3) }); },
      });
    }
    const parts = splitForSpeech(text), rate = 24000;
    const chunks = [chime(rate), new Float32Array(rate * .3)];
    for (let i = 0; i < parts.length; i++) {
      self.postMessage({ type: 'progress', message: `본문을 읽고 있어요 · ${i + 1} / ${parts.length}`, percent: 30 + Math.round(i / parts.length * 65) });
      const result = await model.generate(parts[i], { voice: voice as 'bf_emma', speed: 1 });
      chunks.push(new Float32Array(result.audio), new Float32Array(Math.round(rate * .2)));
    }
    chunks.push(new Float32Array(rate * .3), chime(rate));
    const duration = chunks.reduce((s, c) => s + c.length, 0) / rate;
    const wav = pcmToWav(chunks, rate);
    self.postMessage({ type: 'done', wav, duration }, { transfer: [wav] });
  } catch (error) {
    model = null;
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '음성을 생성하지 못했습니다.' });
  }
};
