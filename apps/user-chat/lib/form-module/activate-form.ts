import { loadFormDetail } from "@/lib/voice-form/api";
import { createThreadFormSession } from "@/lib/voice-form/sessions";
import { buildFormCardCustom } from "@/lib/form-module/form-card-metadata";
import type { FormModuleStore } from "@/lib/form-module/form-module-store";
import type { FormSummary } from "@/lib/voice-form/types";

export async function activateFormFromSelection(input: {
  store: FormModuleStore;
  threadId: string;
  anchorMessageId: string | null;
  form: FormSummary;
  appendFormCard: (card: ReturnType<typeof buildFormCardCustom>, intro: string) => string;
}) {
  const session = await createThreadFormSession({
    threadId: input.threadId,
    anchorMessageId: input.anchorMessageId,
    formCode: input.form.form_code,
    formName: input.form.form_name,
  });

  const detail = await loadFormDetail(input.form.form_code);
  const schema = detail.form_schema ?? null;

  const card = buildFormCardCustom({
    formSessionId: session.id,
    formCode: input.form.form_code,
    formName: input.form.form_name,
    fieldValues: session.fieldValues ?? {},
    decision: session.decision || "incomplete",
    status: "active",
  });

  const intro = `Đã mở biểu mẫu **${input.form.form_name}**. Nhập thông tin qua ô chat bên dưới.`;
  const cardMessageId = input.appendFormCard(card, intro);

  input.store.activate({
    binding: {
      threadId: input.threadId,
      formSessionId: session.id,
      cardMessageId,
      formCode: input.form.form_code,
      formName: input.form.form_name,
    },
    fieldValues: session.fieldValues ?? {},
    schema,
    decision: session.decision || "incomplete",
  });
}

export async function hydrateFormFromSession(input: {
  store: FormModuleStore;
  threadId: string;
  formSessionId: string;
  cardMessageId: string;
  formCode: string;
  formName: string;
  fieldValues: Record<string, unknown>;
  decision: string;
}) {
  let schema = null;
  try {
    const detail = await loadFormDetail(input.formCode);
    schema = detail.form_schema ?? null;
  } catch {
    schema = null;
  }

  input.store.activate({
    binding: {
      threadId: input.threadId,
      formSessionId: input.formSessionId,
      cardMessageId: input.cardMessageId,
      formCode: input.formCode,
      formName: input.formName,
    },
    fieldValues: input.fieldValues,
    schema,
    decision: input.decision || "incomplete",
  });
}