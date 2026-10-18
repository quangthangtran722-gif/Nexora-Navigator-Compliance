"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppError, Result } from "@/lib/data/errors";

/*
 * Tải dữ liệu bất đồng bộ cho 1 màn: { data, error, loading, reload }.
 * deps = giá trị mà hàm load phụ thuộc (vd customerId) — đổi là tải lại.
 * reload() = đọc lại từ DB (sau khi ghi / RPC / gọi route pipeline).
 */
export function useQuery<T>(load: () => Promise<Result<T>>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: AppError | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    load().then((r) => {
      if (!cancelled) setState({ data: r.data, error: r.error, loading: false });
    });
    return () => {
      cancelled = true;
    };
    // `load` là hàm tạo mới mỗi lần render; chỉ chạy lại khi deps (key) đổi hoặc gọi reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
