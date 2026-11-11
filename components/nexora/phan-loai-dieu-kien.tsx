"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAN_MA_DIEU_KIEN, patchKhiDoiMa } from "@/lib/entity-rules";
import type { EntityPatch } from "@/lib/data/mutations";
import { formatDate } from "@/lib/labels";
import type { BoMaDieuKien, Entity } from "@/lib/types";

/*
 * S6 trên màn duyệt (U1a): chuyên viên phân loại điều kiện trước khi duyệt — HE_THONG_DA_CHOT §4 điểm 2–3.
 * - hanh_vi: xác nhận phạm vi (chung / có điều kiện).
 * - chu_the / dieu_kien / nguong: chọn mã C0–C7; theo nhóm của mã hiện ĐÚNG MỘT thao tác:
 *   nhóm chung → tick xác nhận phạm vi chung; nhóm máy đọc → viết điều kiện (DieuKienEditor ở EntityRow);
 *   nhóm không hình thức hóa → gắn cờ (+ số hiệu văn bản dẫn chiếu với C4 / C5).
 * - Mọi entity: ngày có hiệu lực riêng (vd Luật 108 Điều 13, Điều 26 phần hóa đơn hộ kinh doanh: 01/01/2026).
 * Chỉ ghi các cột của entity đang cho_duyet (RLS + GRANT theo cột + khoa_entity). Không gọi hàm duyệt.
 */

export function PhanLoaiDieuKien({
  entity: e,
  boMa,
  ngayHieuLucVanBan,
  busy,
  onPatch,
}: {
  entity: Entity;
  boMa: BoMaDieuKien[];
  ngayHieuLucVanBan: string;
  busy: boolean;
  onPatch: (patch: EntityPatch) => Promise<void>;
}) {
  const canMa = (CAN_MA_DIEU_KIEN as readonly string[]).includes(e.loai_entity);
  const ma = boMa.find((m) => m.ma === e.ma_dieu_kien);
  const chonDuoc = boMa.filter((m) => m.nhom !== "chung" || e.loai_entity === "chu_the");
  const [vanBan, setVanBan] = useState(e.van_ban_dan_chieu ?? "");
  const [ngay, setNgay] = useState(e.ngay_co_hieu_luc ?? "");

  return (
    <div className="space-y-3 border p-3">
      <p className="text-xs font-medium text-muted-foreground">Phân loại điều kiện (bắt buộc trước khi duyệt)</p>

      {e.loai_entity === "hanh_vi" && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm">Phạm vi của nghĩa vụ</legend>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={e.pham_vi === "chung" ? "default" : "outline"} disabled={busy} aria-pressed={e.pham_vi === "chung"}
              onClick={() => onPatch({ pham_vi: "chung" })}>
              Chung — mọi đối tượng của văn bản
            </Button>
            <Button size="sm" variant={e.pham_vi === "co_dieu_kien" ? "default" : "outline"} disabled={busy} aria-pressed={e.pham_vi === "co_dieu_kien"}
              onClick={() => onPatch({ pham_vi: "co_dieu_kien" })}>
              Có điều kiện
            </Button>
          </div>
          {e.pham_vi === null && <p className="text-xs text-attention">Chưa xác nhận.</p>}
        </fieldset>
      )}

      {canMa && (
        <div className="space-y-1.5">
          <Label>Mã điều kiện</Label>
          <Select
            items={chonDuoc.map((m) => ({ value: m.ma, label: `${m.ma} — ${m.ten}` }))}
            value={e.ma_dieu_kien}
            onValueChange={(v) => {
              const moi = boMa.find((m) => m.ma === v);
              if (moi && moi.ma !== e.ma_dieu_kien) {
                setVanBan("");
                void onPatch(patchKhiDoiMa(moi, e));
              }
            }}
          >
            <SelectTrigger className="w-full" disabled={busy}>
              <SelectValue placeholder="Chọn mã C0–C7" />
            </SelectTrigger>
            <SelectContent>
              {chonDuoc.map((m) => (
                <SelectItem key={m.ma} value={m.ma}>
                  {m.ma} — {m.ten}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ma && <p className="text-xs text-muted-foreground">{ma.mo_ta}</p>}

          {ma?.nhom === "chung" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={e.pham_vi === "chung"} disabled={busy}
                onCheckedChange={(v) => onPatch({ pham_vi: v === true ? "chung" : null })} />
              Xác nhận: chủ thể này là mọi đối tượng của văn bản
            </label>
          )}

          {ma?.nhom === "khong_hinh_thuc_hoa" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={e.khong_hinh_thuc_hoa} disabled={busy}
                  onCheckedChange={(v) => onPatch({ khong_hinh_thuc_hoa: v === true })} />
                Không viết được điều kiện máy đọc — hệ trả &quot;cần bổ sung thông tin&quot; (
                {ma.ly_do_mac_dinh === "can_chuyen_mon" ? "cần chuyên môn" : "thư viện chưa đủ"})
              </label>
              {ma.can_van_ban_dan_chieu && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1 space-y-1">
                    <Label htmlFor={`vbdc-${e.id}`}>Số hiệu văn bản được dẫn chiếu</Label>
                    <Input id={`vbdc-${e.id}`} value={vanBan} onChange={(ev) => setVanBan(ev.target.value)} placeholder="vd 252/2026/NĐ-CP" />
                  </div>
                  <Button size="sm" variant="outline" disabled={busy || vanBan.trim() === (e.van_ban_dan_chieu ?? "")}
                    onClick={() => onPatch({ van_ban_dan_chieu: vanBan.trim() || null })}>
                    Lưu
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`nhl-${e.id}`}>Ngày có hiệu lực riêng (để trống = theo văn bản, {formatDate(ngayHieuLucVanBan)})</Label>
          <Input id={`nhl-${e.id}`} type="date" value={ngay} onChange={(ev) => setNgay(ev.target.value)} className="w-44" />
        </div>
        <Button size="sm" variant="outline" disabled={busy || ngay === (e.ngay_co_hieu_luc ?? "")}
          onClick={() => onPatch({ ngay_co_hieu_luc: ngay || null })}>
          Lưu ngày
        </Button>
      </div>
    </div>
  );
}
