export const FORM_CARD_TYPE = "form-card" as const;

export type FormCardStatus = "active" | "paused" | "completed";

export type FormCardCustom = {
  type: typeof FORM_CARD_TYPE;
  formSessionId: string;
  formCode: string;
  formName: string;
  status: FormCardStatus;
  fieldCount: number;
  decision: string;
};

export function isFormCardCustom(value: unknown): value is FormCardCustom {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === FORM_CARD_TYPE && typeof record.formSessionId === "string";
}

export function countFilledFields(fieldValues: Record<string, unknown>) {
  return Object.keys(fieldValues).filter((k) => {
    const v = fieldValues[k];
    return !(v === undefined || v === null || v === "");
  }).length;
}

export function buildFormCardCustom(input: {
  formSessionId: string;
  formCode: string;
  formName: string;
  status?: FormCardStatus;
  fieldValues?: Record<string, unknown>;
  decision?: string;
}): FormCardCustom {
  const fieldValues = input.fieldValues ?? {};
  const decision = input.decision ?? "incomplete";
  const status =
    input.status ??
    (decision === "ready" || decision === "confirm" ? "completed" : "active");
  return {
    type: FORM_CARD_TYPE,
    formSessionId: input.formSessionId,
    formCode: input.formCode,
    formName: input.formName,
    status,
    fieldCount: countFilledFields(fieldValues),
    decision,
  };
}