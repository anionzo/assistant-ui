export const FORM_UPLOADED_QUERY = "uploaded";
export const FORM_UPLOADED_FILE_QUERY = "file";

export function formDetailHref(
  code: string,
  opts?: { uploaded?: boolean; fileName?: string },
): string {
  const path = `/forms/${encodeURIComponent(code)}`;
  if (!opts?.uploaded) return path;
  const params = new URLSearchParams({ [FORM_UPLOADED_QUERY]: "1" });
  if (opts.fileName) params.set(FORM_UPLOADED_FILE_QUERY, opts.fileName);
  return `${path}?${params.toString()}`;
}

export function formsListHref(uploaded = false): string {
  return uploaded ? `/forms?${FORM_UPLOADED_QUERY}=1` : "/forms";
}

export function readUploadFeedback(searchParams: URLSearchParams) {
  const uploaded = searchParams.get(FORM_UPLOADED_QUERY) === "1";
  const fileName = searchParams.get(FORM_UPLOADED_FILE_QUERY)?.trim() || undefined;
  return { uploaded, fileName };
}