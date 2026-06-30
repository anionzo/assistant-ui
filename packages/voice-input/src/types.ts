export type VoiceState = "idle" | "recording" | "uploading" | "processing" | "playing" | "error";

export type AudioChunk = {
  data: string;
  format?: string;
};

export type VoiceMetadata = {
  conversation_id: string;
  transcript?: string;
  audio_refs?: string[];
};

export type VoiceStreamEvent =
  | { type: "transcript"; text: string }
  | { type: "audio_chunk"; chunk: AudioChunk }
  | { type: "metadata"; metadata: VoiceMetadata }
  | { type: "done" }
  | { type: "error"; message: string; details?: unknown };

export type VoiceSessionOptions = {
  api: string;
  conversationId: string;
  corpusId?: string;
  pipeline?: string;
  onTranscript?: (text: string) => void;
  onAudioChunk?: (chunk: AudioChunk) => void;
  onMetadata?: (meta: VoiceMetadata) => void;
  onError?: (err: Error) => void;
  onDone?: () => void;
};
