function downsampleBuffer(buffer: Float32Array, inRate: number, outRate: number): Float32Array {
  if (!buffer.length) return new Float32Array(0);
  if (outRate >= inRate) return buffer;
  const ratio = inRate / outRate;
  const newLen = Math.max(1, Math.round(buffer.length / ratio));
  const result = new Float32Array(newLen);
  let oOff = 0;
  let iOff = 0;
  while (oOff < newLen) {
    const nextI = Math.round((oOff + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = iOff; i < nextI && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }
    result[oOff] = count ? sum / count : 0;
    oOff++;
    iOff = nextI;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(off, s, true);
    off += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}

type RecorderImpl = {
  stream: MediaStream;
  ctx: AudioContext;
  source: MediaStreamAudioSourceNode;
  node: ScriptProcessorNode;
  sink: GainNode;
  chunks: Float32Array[];
};

export class VoiceFormRecorder {
  active = false;
  private impl: RecorderImpl | null = null;

  async start() {
    if (this.active) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const sink = ctx.createGain();
    sink.gain.value = 0;
    const chunks: Float32Array[] = [];
    node.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(node);
    node.connect(sink);
    sink.connect(ctx.destination);
    this.impl = { stream, ctx, source, node, sink, chunks };
    this.active = true;
  }

  async stop(): Promise<Blob | null> {
    if (!this.active || !this.impl) return null;
    const { stream, ctx, source, node, sink, chunks } = this.impl;
    try {
      node.disconnect();
      source.disconnect();
      sink.disconnect();
    } catch {
      /* ignore */
    }
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    const inRate = ctx.sampleRate || 44100;
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
    this.impl = null;
    this.active = false;
    let len = 0;
    for (const c of chunks) len += c.length;
    const merged = new Float32Array(len);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }
    const ds = downsampleBuffer(merged, inRate, 16000);
    if (ds.length < 1600) return null;
    return encodeWav(ds, 16000);
  }
}