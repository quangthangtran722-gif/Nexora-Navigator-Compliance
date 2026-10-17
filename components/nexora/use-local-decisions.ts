"use client";

import { useState } from "react";
import type { TrangThaiDuyet } from "@/lib/types";

/*
 * Trạng thái duyệt tạm trên giao diện (chưa gọi API, chưa lưu).
 * Khi có backend: thay setDecision bằng gọi POST .../approve | .../reject.
 */
export function useLocalDecisions(initial: Record<string, TrangThaiDuyet>) {
  const [decisions, setDecisions] = useState(initial);

  const setDecision = (id: string, status: TrangThaiDuyet) =>
    setDecisions((prev) => ({ ...prev, [id]: status }));

  return { decisions, setDecision };
}
