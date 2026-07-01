export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; meta: PaginationMeta; rowOffset: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rowOffset = (safePage - 1) * pageSize;
  return {
    items: items.slice(rowOffset, rowOffset + pageSize),
    rowOffset,
    meta: {
      page: safePage,
      limit: pageSize,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}

export function formatPageRange(meta: PaginationMeta): string {
  if (meta.total === 0) return "0 mục";
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return `${from}–${to} / ${meta.total}`;
}