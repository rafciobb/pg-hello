// Eksport gotowych materiałów: ZIP z karuzelą, pojedyncza grafika, wideo MP4 (+ okładka i opis).
// JSZip i Mp4Muxer są ładowane jako zwykłe skrypty (/vendor/...) i dostępne globalnie.
import { buildVideoSlides, drawReelGridCover, frameState, renderVideoFrame, videoTiming } from './render.js';

const VIDEO_W = 1080;
const VIDEO_H = 1920;

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 1.0) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać obrazu.'))), type, quality));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
}

export function safeFilename(text, fallback) {
  const cleaned = String(text || '').trim().replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 80) || fallback;
}

export async function exportCarouselZip(canvases, caption, filename) {
  const zip = new JSZip();
  for (let i = 0; i < canvases.length; i++) {
    zip.file(`Slide_${String(i + 1).padStart(2, '0')}.jpg`, await canvasToBlob(canvases[i]));
  }
  if (caption.trim()) zip.file('opis_posta.txt', caption);
  downloadBlob(await zip.generateAsync({ type: 'blob' }), filename);
}

async function encodeWithWebCodecs(renderFrame, timing, onProgress) {
  const config = { codec: 'avc1.4d002a', width: VIDEO_W, height: VIDEO_H, bitrate: 15_000_000, framerate: timing.fps };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) return null;

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width: VIDEO_W, height: VIDEO_H },
    fastStart: 'in-memory',
  });
  let encoderError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e; },
  });
  encoder.configure(config);

  for (let frame = 0; frame < timing.totalFrames; frame++) {
    if (encoderError) throw encoderError;
    const canvas = renderFrame(frame);
    const vf = new VideoFrame(canvas, { timestamp: (frame * 1e6) / timing.fps });
    encoder.encode(vf, { keyFrame: frame % timing.fps === 0 });
    vf.close();
    // Nie zapychamy kolejki enkodera i dajemy przeglądarce odetchnąć
    while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    if (frame % 10 === 0) {
      onProgress(`Generowanie wideo (MP4: ${Math.round(((frame + 1) / timing.totalFrames) * 100)}%)`);
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
  await encoder.flush();
  if (encoderError) throw encoderError;
  muxer.finalize();
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
}

/** Awaryjnie: nagrywanie w czasie rzeczywistym przez MediaRecorder (np. Firefox bez H.264 w WebCodecs). */
async function encodeWithMediaRecorder(canvas, renderFrame, timing, onProgress) {
  let mimeType = 'video/webm';
  let ext = 'webm';
  if (MediaRecorder.isTypeSupported('video/mp4')) { mimeType = 'video/mp4'; ext = 'mp4'; }
  else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) mimeType = 'video/webm; codecs=vp9';

  const recorder = new MediaRecorder(canvas.captureStream(timing.fps), { mimeType, videoBitsPerSecond: 15_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();
  for (let frame = 0; frame < timing.totalFrames; frame++) {
    renderFrame(frame);
    onProgress(`Generowanie wideo (zapasowy ${ext.toUpperCase()}: ${Math.round(((frame + 1) / timing.totalFrames) * 100)}%)`);
    await new Promise((r) => setTimeout(r, 1000 / timing.fps));
  }
  recorder.stop();
  await stopped;
  return { blob: new Blob(chunks, { type: mimeType }), ext };
}

export async function exportVideoZip({ cfg, assets, slides, caption, filename, onProgress = () => {} }) {
  const cache = buildVideoSlides(cfg, assets, slides, 1);
  if (cache.slides.length === 0) throw new Error('Brak slajdów do wygenerowania wideo.');
  const timing = videoTiming(cfg, cache.slides.length);

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const ctx = canvas.getContext('2d');
  const renderFrame = (frame) => {
    const st = frameState(frame, cfg, timing, cache.slides.length);
    renderVideoFrame(ctx, VIDEO_W, VIDEO_H, cache.slides[st.sIdx], st.hasNext ? cache.slides[st.sIdx + 1] : null, cfg, assets, st, cache.bg);
    return canvas;
  };

  let video = null;
  if (typeof VideoEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined') {
    video = await encodeWithWebCodecs(renderFrame, timing, onProgress);
  }
  if (!video) video = await encodeWithMediaRecorder(canvas, renderFrame, timing, onProgress);

  onProgress('Pakowanie wideo, okładki i opisu do archiwum ZIP…');
  const coverCanvas = document.createElement('canvas');
  drawReelGridCover(coverCanvas, cfg, assets, slides);

  const zip = new JSZip();
  zip.file(`Trivia_Wideo.${video.ext}`, video.blob);
  zip.file('Okladka_Rolki.jpg', await canvasToBlob(coverCanvas));
  if (caption.trim()) zip.file('opis_posta.txt', caption);
  downloadBlob(await zip.generateAsync({ type: 'blob' }), filename);
}

/** Odtwarzacz podglądu wideo w pętli na podanym canvasie. */
export class VideoPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.reqId = null;
  }

  start({ cfg, assets, slides }) {
    this.stop();
    const cache = buildVideoSlides(cfg, assets, slides, 1);
    if (cache.slides.length === 0) throw new Error('Brak slajdów do animacji.');
    const timing = videoTiming(cfg, cache.slides.length);
    this.canvas.width = VIDEO_W;
    this.canvas.height = VIDEO_H;
    const ctx = this.canvas.getContext('2d');
    let startMs = null;

    const tick = (ts) => {
      if (startMs === null) startMs = ts;
      let frame = Math.floor(((ts - startMs) / 1000) * timing.fps);
      if (frame >= timing.totalFrames) { startMs = ts; frame = 0; }
      const st = frameState(frame, cfg, timing, cache.slides.length);
      renderVideoFrame(ctx, VIDEO_W, VIDEO_H, cache.slides[st.sIdx], st.hasNext ? cache.slides[st.sIdx + 1] : null, cfg, assets, st, cache.bg);
      this.reqId = requestAnimationFrame(tick);
    };
    this.reqId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.reqId) cancelAnimationFrame(this.reqId);
    this.reqId = null;
  }
}
