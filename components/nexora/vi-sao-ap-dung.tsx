import { Check, CircleHelp, X } from "lucide-react";

import { COPY } from "@/lib/copy";
import type { LyDoDoiChieu } from "@/lib/data/queries";
import { domainLabel, formatDate } from "@/lib/labels";
import { formatGiaTri, type GiaTriThuocTinh } from "@/lib/thuoc-tinh-format";
import type { Entity, ThuocTinhHoSo } from "@/lib/types";

/*
 * "Vì sao áp dụng cho công ty bạn" (buổi mentoring): đọc lý do lần đối chiếu gần nhất (pipeline_runs.output — cùng
 * nguồn với trang Cập nhật khách hàng) và nói bằng lời của doanh nghiệp, không nhắc cách hệ thống chạy.
 * Không có lý do đã lưu (vd lần đối chiếu cũ) → suy từ chính nghĩa vụ: lĩnh vực + ngày hiệu lực.
 */
export function ViSaoApDung({
  lyDo,
  entity,
  ngayHieuLucVanBan,
  dict,
}: {
  lyDo?: LyDoDoiChieu;
  entity?: Entity;
  ngayHieuLucVanBan?: string | null;
  dict: ThuocTinhHoSo[];
}) {
  const ngay = lyDo?.ngay_hieu_luc ?? entity?.ngay_co_hieu_luc ?? ngayHieuLucVanBan ?? null;
  const linhVuc = entity ? domainLabel(entity.domain) : null;
  const dieuKien = lyDo?.dieu_kien ?? [];
  const ly = lyDo?.ly_do;

  const cau =
    ly === "ngoai_linh_vuc"
      ? `Nghĩa vụ thuộc lĩnh vực ${linhVuc ?? "khác"} mà công ty hiện không theo dõi.`
      : ly === "dieu_kien_khong_thoa"
        ? "Hồ sơ của công ty không đáp ứng điều kiện của nghĩa vụ này."
        : ly === "thieu_thong_tin"
          ? "Hồ sơ còn thiếu thông tin để xác định chắc chắn nghĩa vụ này có áp dụng hay không."
          : [
              linhVuc ? `Công ty đang theo dõi lĩnh vực ${linhVuc}` : "Nghĩa vụ thuộc lĩnh vực công ty đang theo dõi",
              dieuKien.length ? " và hồ sơ đáp ứng các điều kiện bên dưới" : "",
              ngay ? (ly === "chua_den_ngay_hieu_luc" ? `. Nghĩa vụ sẽ có hiệu lực từ ${formatDate(ngay)}.` : `. Nghĩa vụ có hiệu lực từ ${formatDate(ngay)}.`) : ".",
            ].join("");

  return (
    <section className="space-y-1.5" aria-label={COPY.term.viSao}>
      <h3 className="text-xs font-semibold text-muted-foreground">{COPY.term.viSao}</h3>
      <p className="text-sm">{cau}</p>
      {dieuKien.length > 0 && (
        <ul className="space-y-1 text-sm">
          {dieuKien.map((dk, i) => {
            const tt = dict.find((t) => t.ma === dk.dieu_kien_may_doc.thuoc_tinh);
            const Icon = dk.ket_qua === true ? Check : dk.ket_qua === false ? X : CircleHelp;
            return (
              <li key={i} className="flex gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-gold-text" aria-hidden />
                <span>
                  {tt?.cau_hoi ?? dk.ten_entity}: <b>{formatGiaTri(tt, dk.gia_tri_khach_hang as GiaTriThuocTinh | undefined)}</b>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
