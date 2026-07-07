import type { FillResponse } from "@/lib/voice-form/types";
import type { FormBinding } from "@/lib/form-module/form-module-store";
import type { FormModuleStore } from "@/lib/form-module/form-module-store";
import { persistFormSessionSnapshot } from "@/lib/form-module/persist-form-session";

export function extractAssistantText(response: FillResponse): string {
  return (
    (response.voice_prompt || "").trim() ||
    (response.answer || "").trim() ||
    (response.transcript || "").trim() ||
    ""
  );
}

export async function processFormFillTurn(input: {
  store: FormModuleStore;
  binding: FormBinding;
  response: FillResponse;
}) {
  const { store, binding, response } = input;
  const snap = store.getSnapshot();

  store.apply({
    fieldValues: response.field_values ?? snap.fieldValues,
    nextField: response.next_field ?? null,
    invalidFields: response.invalid_fields ?? {},
    decision: response.decision || response.mode || snap.decision,
    schema: response.form_schema?.need_to_fill?.length
      ? response.form_schema
      : snap.schema,
    busy: false,
  });

  if (response.form_code && response.form_code !== binding.formCode) {
    store.apply({
      binding: { ...binding, formCode: response.form_code },
    });
  }

  await persistFormSessionSnapshot(store, store.getSnapshot());
}