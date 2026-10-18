// Kiểm tra grounding output của extractEntities — CODE THUẦN, KHÔNG gọi AI.
// Prompt chỉ "xin" model đừng trích ngoài chunk; file này mới là chốt chặn thật (lỗ hổng #1):
// trích dẫn không tìm thấy nguyên văn trong đúng điều của chunk → entity bị loại, không vào DB.
// Kết quả (kể cả danh sách bị loại) ghi vào pipeline_runs để curator/mentor xem được.

import type {
  ExtractOutput,
  ExtractedEntity,
  ExtractedRelationship,
  LoaiEntity,
  LoaiRelationship,
} from "./extractEntities.schema";

export type Article = { soDieu: number; noiDung: string };

export type GroundingIssue = {
  muc: "entity" | "relationship" | "dieu";
  ma_tam: string | null;
  ly_do: string;
  chi_tiet: string | null;
};

export type GroundingResult = {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  rejected: GroundingIssue[];
  warnings: GroundingIssue[];
  soEntityTheoDieu: Record<number, number>;
};

const MIN_QUOTE_LENGTH = 12;
const MAX_ENTITY_PER_ARTICLE = 10;
const MAX_PRIMARY_DEPARTMENTS = 2;
const LOAI_CO_PHONG_BAN: readonly LoaiEntity[] = ["hanh_vi", "thoi_han", "che_tai", "mien_giam"];

// Loại entity hợp lệ ở 2 đầu cạnh — khớp mục 4 của prompt (extractEntities.prompt.ts).
// filterDomain đọc điều kiện THEO CHIỀU CẠNH (dieu_kien: cond → hanh_vi; ap_dung_cho: hanh_vi → chu_the),
// nên cạnh model sinh ngược phải được đảo lại ở đây, không để vào DB. bao_ham/tham_chieu/thay_the nối
// mọi loại → không suy được chiều, giữ nguyên.
const DAU_CANH: Partial<Record<LoaiRelationship, { source: readonly LoaiEntity[]; target: readonly LoaiEntity[] }>> = {
  ap_dung_cho: { source: ["hanh_vi", "muc_thue", "thoi_han", "mien_giam"], target: ["chu_the", "doi_tuong", "hanh_vi"] },
  dieu_kien: { source: ["dieu_kien", "nguong"], target: ["hanh_vi", "muc_thue", "mien_giam"] },
  che_tai_cua: { source: ["che_tai"], target: ["hanh_vi"] },
};

// "Điều 5." / "Điều 5:" / "Điều 5a." ở đầu dòng
const ARTICLE_HEADING = /^[ \t]*Điều[ \t]+(\d+)[a-zđ]?[ \t]*[.:]/gmu;

export function splitArticles(noiDung: string): Article[] {
  const text = noiDung.normalize("NFC");
  const headings = [...text.matchAll(ARTICLE_HEADING)];
  return headings.map((m, i) => ({
    soDieu: Number(m[1]),
    noiDung: text.slice(m.index, headings[i + 1]?.index ?? text.length).trim(),
  }));
}

// So khớp "nguyên văn" nhưng bỏ qua khác biệt vô hại: Unicode NFC, hoa/thường, kiểu dấu nháy, khoảng trắng/xuống dòng.
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[“”„‟"]/g, '"')
    .replace(/[‘’‚‛']/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const issue = (muc: GroundingIssue["muc"], ma_tam: string | null, ly_do: string, chi_tiet: string | null = null) => ({
  muc,
  ma_tam,
  ly_do,
  chi_tiet,
});

export function validateExtraction(articles: Article[], output: ExtractOutput): GroundingResult {
  const rejected: GroundingIssue[] = [];
  const warnings: GroundingIssue[] = [];

  const articleText = new Map(articles.map((a) => [a.soDieu, normalizeForMatch(a.noiDung)]));

  // ---- Entity ----
  const kept: ExtractedEntity[] = [];
  const keptIds = new Set<string>();
  const remap = new Map<string, string>(); // ma_tam trùng nghĩa → ma_tam được giữ
  const seenByMeaning = new Map<string, string>();

  for (const raw of output.entities) {
    const e: ExtractedEntity = { ...raw };

    if (keptIds.has(e.ma_tam) || remap.has(e.ma_tam)) {
      rejected.push(issue("entity", e.ma_tam, "trung_ma_tam"));
      continue;
    }

    const own = articleText.get(e.so_dieu);
    if (own === undefined) {
      rejected.push(issue("entity", e.ma_tam, "dieu_ngoai_chunk", `so_dieu=${e.so_dieu}`));
      continue;
    }

    const quote = normalizeForMatch(e.noi_dung_goc);
    if (quote.length < MIN_QUOTE_LENGTH) {
      rejected.push(issue("entity", e.ma_tam, "trich_dan_qua_ngan", e.noi_dung_goc));
      continue;
    }
    if (!own.includes(quote)) {
      const dieuKhac = [...articleText].find(([, text]) => text.includes(quote))?.[0];
      rejected.push(
        dieuKhac === undefined
          ? issue("entity", e.ma_tam, "trich_dan_khong_co_trong_chunk", e.noi_dung_goc)
          : issue("entity", e.ma_tam, "trich_dan_sai_dieu", `khai Điều ${e.so_dieu}, thực tế ở Điều ${dieuKhac}`),
      );
      continue;
    }

    const meaningKey = `${e.loai_entity}|${normalizeForMatch(e.ten_entity)}`;
    const firstId = seenByMeaning.get(meaningKey);
    if (firstId !== undefined) {
      remap.set(e.ma_tam, firstId);
      rejected.push(issue("entity", e.ma_tam, "trung_entity", `gộp vào ${firstId}`));
      continue;
    }

    if (e.ngay_co_hieu_luc !== null && !/^\d{4}-\d{2}-\d{2}$/.test(e.ngay_co_hieu_luc)) {
      warnings.push(issue("entity", e.ma_tam, "ngay_hieu_luc_sai_dinh_dang", e.ngay_co_hieu_luc));
      e.ngay_co_hieu_luc = null;
    } else if (e.ngay_co_hieu_luc !== null) {
      warnings.push(issue("entity", e.ma_tam, "ngay_hieu_luc_rieng_can_doi_chieu", e.ngay_co_hieu_luc));
    }

    if (!LOAI_CO_PHONG_BAN.includes(e.loai_entity)) {
      if (e.primary_departments.length || e.secondary_departments.length) {
        warnings.push(issue("entity", e.ma_tam, "bo_phong_ban_khong_hop_loai", e.loai_entity));
      }
      e.primary_departments = [];
      e.secondary_departments = [];
    } else if (e.primary_departments.length > MAX_PRIMARY_DEPARTMENTS) {
      warnings.push(issue("entity", e.ma_tam, "qua_nhieu_primary_department", e.primary_departments.join(",")));
    }

    seenByMeaning.set(meaningKey, e.ma_tam);
    keptIds.add(e.ma_tam);
    kept.push(e);
  }

  // ---- Relationship ----
  const keptRels: ExtractedRelationship[] = [];
  const relKeys = new Set<string>();
  const chunkText = [...articleText.values()].join(" ");
  const resolve = (id: string) => remap.get(id) ?? id;
  const loaiCua = new Map(kept.map((e) => [e.ma_tam, e.loai_entity]));

  output.relationships.forEach((raw, i) => {
    const label = `r${i + 1}`;
    const r: ExtractedRelationship = { ...raw, source: resolve(raw.source), target: raw.target && resolve(raw.target) };

    if (!keptIds.has(r.source)) {
      rejected.push(issue("relationship", label, "source_khong_hop_le", raw.source));
      return;
    }
    if (r.target !== null && !keptIds.has(r.target)) {
      // đích bị loại/không tồn tại: còn cụm dẫn chiếu thì giữ làm pending link, không thì bỏ
      if (r.target_ref_text) {
        warnings.push(issue("relationship", label, "target_khong_hop_le_chuyen_pending", raw.target));
        r.target = null;
      } else {
        rejected.push(issue("relationship", label, "target_khong_hop_le", raw.target));
        return;
      }
    }
    if (r.target === null && !r.target_ref_text) {
      rejected.push(issue("relationship", label, "thieu_target_va_target_ref_text"));
      return;
    }
    if (r.target === r.source) {
      rejected.push(issue("relationship", label, "tu_tro_vao_chinh_no", r.source));
      return;
    }

    // Chiều cạnh: sai chiều mà đảo lại thì đúng → đảo; sai cả 2 chiều → loại (rule engine sẽ đọc sai)
    const dau = DAU_CANH[r.loai_relationship];
    if (dau) {
      const loaiSource = loaiCua.get(r.source)!;
      const loaiTarget = r.target === null ? null : loaiCua.get(r.target)!;
      const hop = (s: LoaiEntity, t: LoaiEntity) => dau.source.includes(s) && dau.target.includes(t);
      if (loaiTarget === null) {
        if (!dau.source.includes(loaiSource)) {
          warnings.push(issue("relationship", label, "source_sai_loai_canh_pending", `${r.loai_relationship}: ${loaiSource} → (ngoài chunk)`));
        }
      } else if (!hop(loaiSource, loaiTarget)) {
        const chiTiet = `${r.loai_relationship}: ${loaiSource} → ${loaiTarget}`;
        if (!hop(loaiTarget, loaiSource)) {
          rejected.push(issue("relationship", label, "sai_loai_dau_canh", chiTiet));
          return;
        }
        warnings.push(issue("relationship", label, "dao_chieu_canh", `${chiTiet} → đảo thành ${loaiTarget} → ${loaiSource}`));
        [r.source, r.target] = [r.target!, r.source];
      }
    }

    const key = `${r.loai_relationship}|${r.source}|${r.target ?? normalizeForMatch(r.target_ref_text ?? "")}`;
    if (relKeys.has(key)) return;
    relKeys.add(key);

    if (!chunkText.includes(normalizeForMatch(r.can_cu))) {
      warnings.push(issue("relationship", label, "can_cu_khong_nguyen_van", r.can_cu));
    }
    if (r.target === null && r.target_ref_text && !chunkText.includes(normalizeForMatch(r.target_ref_text))) {
      warnings.push(issue("relationship", label, "target_ref_text_khong_nguyen_van", r.target_ref_text));
    }
    keptRels.push(r);
  });

  // ---- Độ phủ & granularity theo điều (lỗ hổng #2) — chỉ cảnh báo, không loại ----
  const soEntityTheoDieu: Record<number, number> = Object.fromEntries(articles.map((a) => [a.soDieu, 0]));
  for (const e of kept) soEntityTheoDieu[e.so_dieu] += 1;
  const boQua = new Set(output.dieu_bo_qua.map((d) => d.so_dieu));

  for (const [soDieu, n] of Object.entries(soEntityTheoDieu)) {
    if (n === 0 && !boQua.has(Number(soDieu))) {
      warnings.push(issue("dieu", null, "dieu_bi_bo_sot", `Điều ${soDieu}`));
    } else if (n > MAX_ENTITY_PER_ARTICLE) {
      warnings.push(issue("dieu", null, "qua_nhieu_entity", `Điều ${soDieu}: ${n} entity`));
    }
  }

  const coChuThe = new Set(
    keptRels
      .filter((r) => r.loai_relationship === "ap_dung_cho" && r.target !== null)
      .filter((r) => kept.find((e) => e.ma_tam === r.target)?.loai_entity === "chu_the")
      .map((r) => r.source),
  );
  for (const e of kept) {
    if (e.loai_entity === "hanh_vi" && !coChuThe.has(e.ma_tam)) {
      warnings.push(issue("entity", e.ma_tam, "hanh_vi_thieu_chu_the", e.ten_entity));
    }
  }

  return { entities: kept, relationships: keptRels, rejected, warnings, soEntityTheoDieu };
}
