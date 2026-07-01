export type NormalizedFormField = {
  key: string;
  type: string;
  label: string;
  required: boolean;
  hint?: string;
};

export type NormalizedFormSchema = {
  title: string;
  description?: string;
  fields: NormalizedFormField[];
  source: "need_to_fill" | "fields" | "properties" | "none";
};

export type FormDetailMeta = {
  formCode: string;
  formName?: string;
  description?: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function unwrapFormDetail(detail: unknown): Record<string, unknown> {
  const root = asObject(detail);
  if (!root) return {};
  const data = asObject(root.data);
  return data ?? root;
}

function normalizeFieldEntry(entry: unknown, keyOverride?: string): NormalizedFormField | null {
  const f = asObject(entry);
  if (!f) return null;

  const key = String(f.key ?? f.name ?? f.id ?? keyOverride ?? "").trim();
  if (!key) return null;

  const type = String(f.field_type ?? f.type ?? "text");
  const label = String(f.label ?? f.title ?? f.name ?? key);
  const required = f.required === true || f.optional === false;
  const hint =
    typeof f.hint === "string"
      ? f.hint
      : typeof f.description === "string"
        ? f.description
        : typeof f.placeholder === "string"
          ? f.placeholder
          : undefined;

  return { key, type, label, required, hint };
}

function collectFields(schema: Record<string, unknown>): {
  fields: NormalizedFormField[];
  source: NormalizedFormSchema["source"];
} {
  const needToFill = schema.need_to_fill;
  if (Array.isArray(needToFill) && needToFill.length > 0) {
    return {
      fields: needToFill
        .map((entry) => normalizeFieldEntry(entry))
        .filter((field): field is NormalizedFormField => field !== null),
      source: "need_to_fill",
    };
  }

  const fields = schema.fields;
  if (Array.isArray(fields) && fields.length > 0) {
    return {
      fields: fields
        .map((entry) => normalizeFieldEntry(entry))
        .filter((field): field is NormalizedFormField => field !== null),
      source: "fields",
    };
  }

  const properties = schema.properties;
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    const requiredSet = new Set(
      Array.isArray(schema.required) ? schema.required.map((item) => String(item)) : [],
    );
    const normalized = Object.entries(properties as Record<string, unknown>)
      .map(([key, value]) => {
        const field = normalizeFieldEntry(value, key);
        if (!field) return null;
        if (requiredSet.has(key)) field.required = true;
        return field;
      })
      .filter((field): field is NormalizedFormField => field !== null);

    if (normalized.length > 0) {
      return { fields: normalized, source: "properties" };
    }
  }

  return { fields: [], source: "none" };
}

export function extractFormDetailMeta(detail: unknown, fallbackCode = ""): FormDetailMeta {
  const d = unwrapFormDetail(detail);
  const schema = asObject(d.form_schema ?? d.schema ?? d.definition);

  const formCode = String(d.form_code ?? d.code ?? fallbackCode);
  const formName = String(
    schema?.form_name ?? schema?.title ?? d.form_name ?? d.title ?? d.name ?? "",
  ).trim();

  const description =
    typeof schema?.description === "string"
      ? schema.description
      : typeof d.description === "string"
        ? d.description
        : undefined;

  return {
    formCode,
    formName: formName || undefined,
    description,
  };
}

export function extractFormSchema(detail: unknown, fallbackCode = ""): NormalizedFormSchema | null {
  const d = unwrapFormDetail(detail);
  const schema = asObject(d.form_schema ?? d.schema ?? d.definition);
  if (!schema) return null;

  const meta = extractFormDetailMeta(detail, fallbackCode);
  const { fields, source } = collectFields(schema);

  return {
    title: meta.formName ?? meta.formCode ?? fallbackCode ?? "Untitled form",
    description: meta.description,
    fields,
    source,
  };
}