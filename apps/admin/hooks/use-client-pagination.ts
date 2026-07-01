"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  paginateArray,
  type PaginationMeta,
} from "@/lib/pagination";

export function useClientPagination<T>(
  source: T[],
  options?: { pageSize?: number },
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.pageSize ?? DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [source.length, pageSize]);

  const result = useMemo(
    () => paginateArray(source, page, pageSize),
    [source, page, pageSize],
  );

  return {
    items: result.items,
    meta: result.meta,
    rowOffset: result.rowOffset,
    page: result.meta.page,
    setPage,
    pageSize,
    setPageSize,
  };
}

export type { PaginationMeta };