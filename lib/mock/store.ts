import { mockCustomers, mockDepartments } from "@/lib/mock/customer";
import { mockDiagnostics } from "@/lib/mock/diagnostics";
import { mockEntities, mockRelationships } from "@/lib/mock/entities";
import { mockNotifications } from "@/lib/mock/notifications";
import { mockPipelineRuns } from "@/lib/mock/pipeline-runs";
import { mockThuocTinhHoSo } from "@/lib/mock/thuoc-tinh";
import { mockChunks, mockVanBan } from "@/lib/mock/van-ban";
import type { Approval } from "@/lib/types";

/*
 * "Database" giả lập trong bộ nhớ — chỉ mock RPC / mock pipeline API được ghi vào đây.
 * Mỗi môi trường (server render, trình duyệt) có 1 bản riêng; tải lại trang là về dữ liệu gốc.
 * Khi nối Supabase thật, file này bị bỏ — UI không đọc thẳng store mà qua lib/mock/index.ts / rpc / pipeline-api.
 */
export const db = {
  vanBan: structuredClone(mockVanBan),
  chunks: structuredClone(mockChunks),
  entities: structuredClone(mockEntities),
  relationships: structuredClone(mockRelationships),
  thuocTinhHoSo: structuredClone(mockThuocTinhHoSo),
  customers: structuredClone(mockCustomers),
  departments: structuredClone(mockDepartments),
  diagnostics: structuredClone(mockDiagnostics),
  pipelineRuns: structuredClone(mockPipelineRuns),
  notifications: structuredClone(mockNotifications),
  approvals: [] as Approval[],
};

let seq = 0;
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq}`;
}

export const nowIso = () => new Date().toISOString();

// Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (so sánh ngày hiệu lực)
export function todayVN() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}
