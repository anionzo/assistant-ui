export type FormSummary = {
  form_code: string;
  form_name: string;
};

export type FormField = {
  key: string;
  label?: string;
  hint?: string;
  required?: boolean;
  field_type?: string;
};

export type FormSchema = {
  form_name?: string;
  need_to_fill: FormField[];
};

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  time?: string;
};

export type ConversationStub = {
  id: string;
  title: string;
  formCode: string;
  formName: string;
  fieldCount: number;
  decision: string;
  updatedAt: number;
};

export type FillResponse = {
  session_id?: string;
  mode?: "chat" | "pick_form" | "fill_form";
  form_code?: string;
  form_schema?: FormSchema;
  field_values?: Record<string, unknown>;
  next_field?: string | null;
  invalid_fields?: Record<string, string>;
  decision?: string;
  output_file?: string;
  transcript?: string;
  voice_prompt?: string;
  answer?: string;
  audio_file?: string;
  audio_url?: string;
  candidate_forms?: Array<{ form_code: string; form_name?: string; description?: string }>;
};