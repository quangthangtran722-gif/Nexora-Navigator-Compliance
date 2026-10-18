"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOAN_TU_LABEL, TOAN_TU_THEO_KIEU } from "@/lib/thuoc-tinh-format";
import type { DieuKienMayDoc, ThuocTinhHoSo } from "@/lib/types";

/*
 * Curator điền điều kiện máy đọc (CONTRACT §3.4) — AI không sinh field này.
 * Chọn thuộc tính (từ thuoc_tinh_ho_so) → toán tử hợp lệ theo kiểu → giá trị.
 */

type Props = {
  dict: ThuocTinhHoSo[];
  value: DieuKienMayDoc | null;
  onSave: (dk: DieuKienMayDoc) => void;
  onCancel: () => void;
  saving?: boolean;
};

type Toan = DieuKienMayDoc["toan_tu"];
const MULTI: Toan[] = ["in", "not_in", "contains_any"];

export function DieuKienEditor({ dict, value, onSave, onCancel, saving }: Props) {
  const [ma, setMa] = useState(value?.thuoc_tinh ?? "");
  const [toan, setToan] = useState<Toan | "">(value?.toan_tu ?? "");
  // Giá trị nhập thô; chuyển đúng kiểu lúc lưu
  const [raw, setRaw] = useState<string>(value && !Array.isArray(value.gia_tri) ? String(value.gia_tri) : "");
  const [multi, setMulti] = useState<string[]>(value && Array.isArray(value.gia_tri) ? value.gia_tri.map(String) : []);
  const [err, setErr] = useState<string | null>(null);

  const tt = dict.find((t) => t.ma === ma);
  const ops = tt ? TOAN_TU_THEO_KIEU[tt.kieu] : [];
  const isMulti = !!toan && MULTI.includes(toan);

  function build(): DieuKienMayDoc | string {
    if (!tt) return "Chọn thuộc tính";
    if (!toan) return "Chọn toán tử";
    const num = (s: string) => Number(s.replace(/[.\s]/g, "").replace(",", "."));
    if (isMulti) {
      if (multi.length === 0) return "Chọn hoặc nhập ít nhất 1 giá trị";
      if (tt.kieu === "number") {
        const ns = multi.map(num);
        if (ns.some((n) => !Number.isFinite(n))) return "Giá trị phải là số";
        return { thuoc_tinh: ma, toan_tu: toan as "in" | "not_in", gia_tri: ns };
      }
      return { thuoc_tinh: ma, toan_tu: toan as "in" | "not_in" | "contains_any", gia_tri: multi } as DieuKienMayDoc;
    }
    if (tt.kieu === "boolean") {
      if (raw !== "true" && raw !== "false") return "Chọn Có hoặc Không";
      return { thuoc_tinh: ma, toan_tu: toan as "eq" | "neq", gia_tri: raw === "true" };
    }
    if (raw.trim() === "") return "Nhập giá trị";
    if (tt.kieu === "number") {
      const n = num(raw);
      if (!Number.isFinite(n)) return "Giá trị phải là số";
      return { thuoc_tinh: ma, toan_tu: toan as "eq" | "neq" | "gt" | "gte" | "lt" | "lte", gia_tri: n };
    }
    return { thuoc_tinh: ma, toan_tu: toan as "eq" | "neq" | "contains", gia_tri: raw.trim() } as DieuKienMayDoc;
  }

  function save() {
    const r = build();
    if (typeof r === "string") return setErr(r);
    setErr(null);
    onSave(r);
  }

  const options = tt?.lua_chon ?? null;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Thuộc tính hồ sơ</Label>
          <Select
            items={dict.map((t) => ({ value: t.ma, label: t.cau_hoi }))}
            value={ma || null}
            onValueChange={(v) => {
              setMa((v as string | null) ?? "");
              setToan("");
              setRaw("");
              setMulti([]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn thuộc tính" />
            </SelectTrigger>
            <SelectContent>
              {dict.map((t) => (
                <SelectItem key={t.ma} value={t.ma}>
                  {t.cau_hoi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Toán tử</Label>
          <Select
            items={ops.map((o) => ({ value: o, label: TOAN_TU_LABEL[o] }))}
            value={toan || null}
            onValueChange={(v) => {
              setToan(((v as string | null) ?? "") as Toan | "");
              setRaw("");
              setMulti([]);
            }}
            disabled={!tt}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn toán tử" />
            </SelectTrigger>
            <SelectContent>
              {ops.map((o) => (
                <SelectItem key={o} value={o}>
                  {TOAN_TU_LABEL[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tt && toan && (
        <div className="space-y-1.5">
          <Label>Giá trị{tt.don_vi ? ` (${tt.don_vi})` : ""}</Label>
          {tt.kieu === "boolean" ? (
            <div className="flex gap-4">
              {(["true", "false"] as const).map((b) => (
                <Label key={b} className="flex items-center gap-2 font-normal">
                  <input type="radio" name={`dk-${ma}`} checked={raw === b} onChange={() => setRaw(b)} className="accent-primary" />
                  {b === "true" ? "Có" : "Không"}
                </Label>
              ))}
            </div>
          ) : isMulti && options ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {options.map((o) => (
                <Label key={o} className="flex items-center gap-2 font-normal">
                  <Checkbox checked={multi.includes(o)} onCheckedChange={(on) => setMulti(on ? [...multi, o] : multi.filter((x) => x !== o))} />
                  {o}
                </Label>
              ))}
            </div>
          ) : isMulti ? (
            <Input
              placeholder="Nhiều giá trị, cách nhau bằng dấu phẩy"
              value={multi.join(", ")}
              onChange={(e) => setMulti(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          ) : options ? (
            <Select items={options.map((o) => ({ value: o, label: o }))} value={raw || null} onValueChange={(v) => setRaw((v as string | null) ?? "")}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Chọn giá trị" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              inputMode={tt.kieu === "number" ? "numeric" : undefined}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={tt.kieu === "number" ? "vd 50000000000" : ""}
              className="sm:w-80"
            />
          )}
        </div>
      )}

      {err && (
        <p className="text-xs text-destructive" role="alert">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          Lưu điều kiện
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Huỷ
        </Button>
      </div>
    </div>
  );
}
