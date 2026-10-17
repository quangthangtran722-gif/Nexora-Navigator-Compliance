import { mockCustomer, mockDepartments } from "@/lib/mock/customer";
import { mockDiagnostics } from "@/lib/mock/diagnostics";
import { mockEntities, mockRelationships } from "@/lib/mock/entities";

/*
 * Lớp truy vấn mock — UI chỉ gọi các hàm này, không đọc thẳng mảng mock.
 * Khi có API thật, thay phần thân hàm bằng fetch, giữ nguyên chữ ký → UI không phải sửa.
 */

export { mockCustomer, mockDepartments, mockDiagnostics, mockEntities, mockRelationships };

export function getEntityById(id: string) {
  return mockEntities.find((e) => e.id === id) ?? null;
}

export function getPendingEntities() {
  return mockEntities.filter((e) => e.trang_thai_duyet === "cho_duyet");
}

export function getPendingRelationships() {
  return mockRelationships.filter((r) => r.trang_thai_duyet === "cho_duyet");
}

// Cạnh xuất phát từ 1 entity (hiển thị trong thẻ entity ở màn Duyệt bản nháp)
export function getRelationshipsFrom(entityId: string) {
  return mockRelationships.filter((r) => r.source_entity_id === entityId);
}

export function getCustomer() {
  return mockCustomer;
}

export function getDepartments(customerId: string) {
  return mockDepartments.filter((d) => d.customer_id === customerId);
}

export function getDiagnostics(customerId: string) {
  return mockDiagnostics.filter((d) => d.customer_id === customerId);
}
