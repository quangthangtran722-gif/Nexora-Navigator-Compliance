"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GiaTriThuocTinh } from "@/lib/thuoc-tinh-format";
import type { ThuocTinhHoSo } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * 1 câu hỏi hồ sơ, render theo thuoc_tinh_ho_so.kieu (CONTRACT §3.2) — dùng chung cho
 * onboarding và "hỏi bổ sung". "Chưa chắc" = ghi null vào key (không xoá key).
 *  boolean → Có / Không / Chưa chắc · number → ô số · text → chọn 1 · text_array → chọn nhiều
 */

type Props = {
  tt: ThuocTinhHoSo;
  value: GiaTriThuocTinh | undefined; // undefined = chưa trả lời
  onChange: (v: GiaTriThuocTinh) => void;
  error?: string;
};

const NULL_OPTION = "__chua_chac__";

export function ThuocTinhField({ tt, value, onChange, error }: Props) {
  const id = `tt-${tt.ma}`;
  const unsure = value === null;

  return (
    <fieldset className="space-y-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-sm font-medium">{tt.cau_hoi}</legend>
      {tt.mo_ta && <p className="text-xs text-muted-foreground">{tt.mo_ta}</p>}

      {tt.kieu === "boolean" && (
        <div className="inline-flex rounded-lg bg-muted p-1" role="radiogroup" aria-label={tt.cau_hoi}>
          {([true, false, null] as const).map((opt) => (
            <button
              key={String(opt)}
              type="button"
              role="radio"
              aria-checked={value === opt}
              onClick={() => onChange(opt)}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                value === opt ? "bg-card font-semibold text-foreground ring-1 ring-gold-edge" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt === true ? "Có" : opt === false ? "Không" : "Chưa chắc"}
            </button>
          ))}
        </div>
      )}

      {tt.kieu === "number" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={0}
              disabled={unsure}
              value={typeof value === "number" ? value : ""}
              onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
              className="w-48"
              aria-invalid={!!error}
            />
            {tt.don_vi && <span className="text-sm text-muted-foreground">{tt.don_vi}</span>}
          </div>
          <UnsureToggle checked={unsure} onChange={(on) => onChange(on ? null : 0)} />
          {typeof value === "number" && value >= 1000 && (
            <span className="text-xs text-muted-foreground tabular-nums">= {value.toLocaleString("vi-VN")} {tt.don_vi ?? ""}</span>
          )}
        </div>
      )}

      {tt.kieu === "text" &&
        (tt.lua_chon ? (
          <Select
            items={[...tt.lua_chon.map((o) => ({ value: o, label: o })), { value: NULL_OPTION, label: "Chưa chắc" }]}
            value={value === null ? NULL_OPTION : typeof value === "string" ? value : null}
            onValueChange={(v) => onChange(v === NULL_OPTION || v == null ? null : String(v))}
          >
            <SelectTrigger className="w-full sm:w-80" aria-invalid={!!error}>
              <SelectValue placeholder="Chọn 1 phương án" />
            </SelectTrigger>
            <SelectContent>
              {tt.lua_chon.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
              <SelectItem value={NULL_OPTION}>Chưa chắc</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value.trim() === "" ? null : e.target.value)}
            aria-invalid={!!error}
          />
        ))}

      {tt.kieu === "text_array" &&
        (tt.lua_chon ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {tt.lua_chon.map((o) => {
              const arr = Array.isArray(value) ? value : [];
              return (
                <Label key={o} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={arr.includes(o)}
                    disabled={unsure}
                    onCheckedChange={(on) => onChange(on ? [...arr, o] : arr.filter((x) => x !== o))}
                  />
                  {o}
                </Label>
              );
            })}
            <UnsureToggle checked={unsure} onChange={(on) => onChange(on ? null : [])} />
          </div>
        ) : (
          <Input
            id={id}
            placeholder="Nhiều giá trị, cách nhau bằng dấu phẩy"
            value={Array.isArray(value) ? value.join(", ") : ""}
            onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            aria-invalid={!!error}
          />
        ))}

      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function UnsureToggle({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(on) => onChange(!!on)} /> Chưa chắc
    </Label>
  );
}
