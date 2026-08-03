import { saveSessionState } from "@/lib/voice-form/sessions";
import type { FormModuleSnapshot } from "@/lib/form-module/form-module-store";
import type { FormModuleStore } from "@/lib/form-module/form-module-store";

export async function persistFormSessionSnapshot(
  store: FormModuleStore,
  snapshot: FormModuleSnapshot,
) {
  const binding = snapshot.binding;
  if (!binding) return;

  store.setSaveStatus("saving");
  try {
    await saveSessionState({
      id: binding.formSessionId,
      formCode: binding.formCode,
      formName: binding.formName,
      fieldValues: snapshot.fieldValues,
      history: [],
      decision: snapshot.decision,
    });
    store.setSaveStatus("saved");
  } catch {
    store.setSaveStatus("error");
  }
}