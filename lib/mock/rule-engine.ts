import type { Customer, Department, DieuKienMayDoc, Entity, EntityRelationship, TrangThaiApDung, VanBan, VanBanChunk } from "@/lib/types";

/*
 * Rule engine giả lập — THUẦN CODE, KHÔNG AI. Bám 5 quy tắc ở CONTRACT.md §7.
 * Backend có bản thật (filterByDomain); bản này chỉ để mock /api/pipeline/filter và /rescan ra kết quả nhất quán.
 */

export type RuleInput = {
  customer: Customer;
  departments: Department[]; // phòng ban của khách hàng này
  entities: Entity[];
  relationships: EntityRelationship[];
  vanBan: VanBan[];
  chunks: VanBanChunk[];
  today: string; // YYYY-MM-DD
};

export type RuleResult = {
  entity_id: string;
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu: string[];
  department_ids: string[]; // phòng ban sẽ nhận diagnostic (rỗng khi khong_ap_dung hoặc không có phòng nào khớp)
  dieu_kien: { entity_id: string; ket_qua: boolean | null }[]; // để UI giải thích vì sao
};

// true / false / null (= thiếu dữ liệu: key không có hoặc null — "Chưa chắc")
export function evaluate(dk: DieuKienMayDoc, thuocTinh: Customer["thuoc_tinh"]): boolean | null {
  const v = thuocTinh[dk.thuoc_tinh];
  if (v === undefined || v === null) return null;
  switch (dk.toan_tu) {
    case "eq":
      return v === dk.gia_tri;
    case "neq":
      return v !== dk.gia_tri;
    case "gt":
      return typeof v === "number" && v > dk.gia_tri;
    case "gte":
      return typeof v === "number" && v >= dk.gia_tri;
    case "lt":
      return typeof v === "number" && v < dk.gia_tri;
    case "lte":
      return typeof v === "number" && v <= dk.gia_tri;
    case "in":
      return (dk.gia_tri as (string | number)[]).includes(v as string | number);
    case "not_in":
      return !(dk.gia_tri as (string | number)[]).includes(v as string | number);
    case "contains":
      return Array.isArray(v) && v.includes(dk.gia_tri);
    case "contains_any":
      return Array.isArray(v) && dk.gia_tri.some((x) => v.includes(x));
  }
}

export function runRuleEngine(input: RuleInput, onlyEntityId?: string): RuleResult[] {
  const { customer, departments, entities, relationships, vanBan, chunks, today } = input;
  const byId = new Map(entities.map((e) => [e.id, e]));
  const vanBanOf = (e: Entity) => vanBan.find((v) => v.id === chunks.find((c) => c.id === e.chunk_id)?.van_ban_id);

  // Entity hanh_vi đã duyệt, thuộc văn bản active
  const hanhVi = entities.filter(
    (e) => e.loai_entity === "hanh_vi" && e.trang_thai_duyet === "da_duyet" && vanBanOf(e)?.trang_thai === "active",
  );

  return hanhVi
    .filter((e) => !onlyEntityId || e.id === onlyEntityId)
    .map((e): RuleResult => {
      const none = { entity_id: e.id, thuoc_tinh_thieu: [], department_ids: [], dieu_kien: [] };

      // 1. Lĩnh vực không đăng ký theo dõi
      if (!customer.domains.includes(e.domain)) return { ...none, trang_thai_ap_dung: "khong_ap_dung" };

      // 2. Điều kiện: dieu_kien/nguong --dieu_kien--> hanh_vi  +  hanh_vi --ap_dung_cho--> chu_the (có dieu_kien_may_doc)
      const conds: Entity[] = [
        ...relationships
          .filter((r) => r.loai_relationship === "dieu_kien" && r.target_entity_id === e.id)
          .map((r) => byId.get(r.source_entity_id))
          .filter((c): c is Entity => !!c && c.trang_thai_duyet === "da_duyet" && (c.loai_entity === "dieu_kien" || c.loai_entity === "nguong")),
        ...relationships
          .filter((r) => r.loai_relationship === "ap_dung_cho" && r.source_entity_id === e.id && r.target_entity_id)
          .map((r) => byId.get(r.target_entity_id!))
          .filter((c): c is Entity => !!c && c.trang_thai_duyet === "da_duyet" && c.loai_entity === "chu_the" && !!c.dieu_kien_may_doc),
      ];
      const results = conds.map((c) => ({
        entity_id: c.id,
        thuoc_tinh: c.dieu_kien_may_doc?.thuoc_tinh,
        ket_qua: c.dieu_kien_may_doc ? evaluate(c.dieu_kien_may_doc, customer.thuoc_tinh) : null,
      }));
      const dieu_kien = results.map(({ entity_id, ket_qua }) => ({ entity_id, ket_qua }));

      // 3. Có điều kiện sai → không áp dụng; thiếu dữ liệu → chưa đủ thông tin
      if (results.some((r) => r.ket_qua === false)) return { ...none, dieu_kien, trang_thai_ap_dung: "khong_ap_dung" };
      const thieu = [...new Set(results.filter((r) => r.ket_qua === null && r.thuoc_tinh).map((r) => r.thuoc_tinh!))];

      // 5. Phòng ban nhận: slug ∈ primary_departments; không có → ban_giam_doc; không có nữa → []
      let depts = departments.filter((d) => e.primary_departments.includes(d.slug_phong_ban));
      if (depts.length === 0) depts = departments.filter((d) => d.slug_phong_ban === "ban_giam_doc");
      const department_ids = depts.map((d) => d.id);

      if (thieu.length > 0) return { entity_id: e.id, trang_thai_ap_dung: "chua_du_thong_tin", thuoc_tinh_thieu: thieu, department_ids, dieu_kien };

      // 4. Ngày hiệu lực = entity ?? văn bản; sau hôm nay → sắp áp dụng
      const hieuLuc = e.ngay_co_hieu_luc ?? vanBanOf(e)?.ngay_hieu_luc ?? today;
      return {
        entity_id: e.id,
        trang_thai_ap_dung: hieuLuc > today ? "sap_ap_dung" : "ap_dung",
        thuoc_tinh_thieu: [],
        department_ids,
        dieu_kien,
      };
    });
}
