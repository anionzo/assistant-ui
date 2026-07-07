"use client";

import { parseVoiceSse } from "@idx/voice-input";

const RECORDING_MIME_TYPE = "audio/webm;codecs=opus";
export const DICTATION_WAVE_BARS = 96;

export type DictationCaptureState = "idle" | "recording" | "processing";

type CaptureRuntime = {
  stream: MediaStream;
  recorder: MediaRecorder;
  analyser: AnalyserNode;
  audioContext: AudioContext;
};

export async function transcribeVoiceBlob(
  blob: Blob,
  conversationId: string,
): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  form.append("conversation_id", conversationId);

  const abort = new AbortController();
  const response = await fetch("/api/voice/stream", {
    method: "POST",
    body: form,
    signal: abort.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Voice transcription failed");
  }

  let transcript = "";
  for await (const event of parseVoiceSse(response.body)) {
    if (event.type === "transcript" && event.text.trim()) {
      transcript = event.text.trim();
      abort.abort();
      break;
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  }

  return transcript;
}

export const DICTATION_IDLE_LEVEL = 0.12;

export function createIdleWaveformLevels(barCount = DICTATION_WAVE_BARS): number[] {
  return Array.from({ length: barCount }, () => DICTATION_IDLE_LEVEL);
}

function sampleMicEnergy(analyser: AnalyserNode): number {
  const timeDomain = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(timeDomain);

  let sum = 0;
  for (let i = 0; i < timeDomain.length; i++) {
    const v = (timeDomain[i]! - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / timeDomain.length);
  if (rms < 0.018) return DICTATION_IDLE_LEVEL;
  return Math.min(1, 0.16 + rms * 5.2);
}

/** Cuộn biên độ theo thời gian: mẫu mới vào bên phải, sóng chảy sang trái. */
export class DictationWaveformScroller {
  private readonly levels: number[];

  constructor(public readonly barCount: number) {
    this.levels = createIdleWaveformLevels(barCount);
  }

  reset() {
    this.levels.fill(DICTATION_IDLE_LEVEL);
  }

  tick(analyser: AnalyserNode): number[] {
    let level = sampleMicEnergy(analyser);

    if (level > DICTATION_IDLE_LEVEL + 0.02) {
      const freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freq);
      const voiceBins = Math.max(8, Math.floor(freq.length * 0.55));
      const midBin = Math.min(voiceBins - 1, Math.floor(voiceBins * 0.38));
      const band = freq[midBin]! / 255;
      const neighbor = midBin + 1 < voiceBins ? freq[midBin + 1]! / 255 : band;
      level = Math.min(1, 0.14 + Math.max(band, neighbor) * level * 1.35);
    }

    this.levels.shift();
    this.levels.push(level);
    return [...this.levels];
  }
}

export class VoiceDictationCapture {
  private runtime: CaptureRuntime | null = null;
  private chunks: Blob[] = [];

  get analyser(): AnalyserNode | null {
    return this.runtime?.analyser ?? null;
  }

  get isActive() {
    return this.runtime !== null;
  }

  async start(): Promise<void> {
    if (this.runtime) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);

    const recorder = new MediaRecorder(stream, { mimeType: RECORDING_MIME_TYPE });
    this.chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    recorder.start();

    this.runtime = { stream, recorder, analyser, audioContext };
  }

  pause() {
    if (this.runtime?.recorder.state === "recording") {
      this.runtime.recorder.pause();
    }
  }

  resume() {
    if (this.runtime?.recorder.state === "paused") {
      this.runtime.recorder.resume();
    }
  }

  get paused() {
    return this.runtime?.recorder.state === "paused";
  }

  async stop(): Promise<Blob | null> {
    const runtime = this.runtime;
    if (!runtime) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      runtime.recorder.onstop = () => {
        const recorded =
          this.chunks.length > 0
            ? new Blob(this.chunks, { type: RECORDING_MIME_TYPE })
            : null;
        this.chunks = [];
        resolve(recorded);
      };
      if (runtime.recorder.state !== "inactive") {
        runtime.recorder.stop();
      } else {
        resolve(null);
      }
    });

    this.dispose();
    return blob;
  }

  cancel() {
    const runtime = this.runtime;
    if (!runtime) return;
    if (runtime.recorder.state !== "inactive") {
      runtime.recorder.onstop = null;
      runtime.recorder.stop();
    }
    this.chunks = [];
    this.dispose();
  }

  private dispose() {
    const runtime = this.runtime;
    if (!runtime) return;
    runtime.stream.getTracks().forEach((track) => track.stop());
    void runtime.audioContext.close();
    this.runtime = null;
  }
}