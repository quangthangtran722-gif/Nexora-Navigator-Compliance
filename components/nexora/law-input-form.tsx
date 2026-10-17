"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FormField, PayloadPreview } from "@/components/nexora/form-field";
import { domainLabel } from "@/lib/labels";
import { extractRequestSchema, LOAI_VAN_BAN, toFieldErrors, type ExtractRequest } from "@/lib/schemas";
import type { Domain } from "@/lib/types";

const LOAI_LABEL: Record<(typeof LOAI_VAN_BAN)[number], string> = {
  luat: "Luật",
  nghi_dinh: "Nghị định",
  thong_tu: "Thông tư",
  quyet_dinh: "Quyết định",
  khac: "Khác",
};
const LOAI_ITEMS = LOAI_VAN_BAN.map((v) => ({ value: v, label: LOAI_LABEL[v] }));

// State form cho phép giá trị rỗng; Zod quyết định hợp lệ lúc gửi
type FormState = Omit<ExtractRequest, "loai_van_ban"> & {
  loai_van_ban: ExtractRequest["loai_van_ban"] | "";
};

const EMPTY: FormState = {
  ten_van_ban: "",
  so_hieu: "",
  loai_van_ban: "",
  domains: [],
  ngay_co_hieu_luc: null,
  noi_dung: "",
};

export function LawInputForm() {
  const [data, setData] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [payload, setPayload] = useState<ExtractRequest | null>(null);

  const update = (patch: Partial<FormState>) => setData((d) => ({ ...d, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = extractRequestSchema.safeParse(data);
    if (!result.success) return setErrors(toFieldErrors(result.error));
    setErrors({});
    setPayload(result.data);
    setStatus("sending");
    // MOCK: chưa gọi POST /api/pipeline/extract (Groq). Chỉ mô phỏng thời gian chờ.
    setTimeout(() => setStatus("done"), 1500);
  }

  if (status === "done" && payload) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden /> Đã gửi yêu cầu trích xuất (mô phỏng)
          </CardTitle>
          <CardDescription>
            Chưa gọi AI. Khi có API, hệ thống sẽ chia văn bản thành các đoạn, trích entity + quan hệ dưới dạng bản nháp
            chờ duyệt, và ghi lại lần chạy vào nhật ký pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayloadPreview data={payload} />
        </CardContent>
        <CardFooter className="gap-2">
          <Link href="/duyet-ban-nhap" className={buttonVariants()}>
            Xem ví dụ bản nháp
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setStatus("idle");
              setData(EMPTY);
              setPayload(null);
            }}
          >
            Nhập văn bản khác
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={submit} noValidate>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Thông tin văn bản</CardTitle>
          <CardDescription>Nguồn chính thống: vbpl.vn hoặc Công báo. Kiểm tra số hiệu và ngày hiệu lực trước khi gửi.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <FormField id="ten_van_ban" label="Tên văn bản" error={errors.ten_van_ban}>
            <Input
              id="ten_van_ban"
              value={data.ten_van_ban}
              onChange={(e) => update({ ten_van_ban: e.target.value })}
              placeholder="Nghị định sửa đổi, bổ sung quy định về hoá đơn, chứng từ"
              aria-invalid={!!errors.ten_van_ban}
              disabled={sending}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-3">
            <FormField id="so_hieu" label="Số hiệu" error={errors.so_hieu}>
              <Input
                id="so_hieu"
                value={data.so_hieu}
                onChange={(e) => update({ so_hieu: e.target.value })}
                placeholder="70/2025/NĐ-CP"
                aria-invalid={!!errors.so_hieu}
                disabled={sending}
              />
            </FormField>
            <FormField label="Loại văn bản" error={errors.loai_van_ban}>
              <Select
                items={LOAI_ITEMS}
                value={data.loai_van_ban || null}
                onValueChange={(v) => update({ loai_van_ban: (v ?? "") as FormState["loai_van_ban"] })}
                disabled={sending}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.loai_van_ban}>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  {LOAI_ITEMS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="ngay_co_hieu_luc" label="Ngày có hiệu lực" hint="Bỏ trống nếu chưa rõ" error={errors.ngay_co_hieu_luc}>
              <Input
                id="ngay_co_hieu_luc"
                type="date"
                value={data.ngay_co_hieu_luc ?? ""}
                onChange={(e) => update({ ngay_co_hieu_luc: e.target.value || null })}
                disabled={sending}
              />
            </FormField>
          </div>

          {/* Chọn nhiều — khớp van_ban.domains TEXT[] */}
          <FormField label="Lĩnh vực" hint="Chọn tất cả lĩnh vực văn bản này điều chỉnh" error={errors.domains}>
            <div className="flex gap-6">
              {(Object.keys(domainLabel) as Domain[]).map((d) => (
                <Label key={d} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={data.domains.includes(d)}
                    disabled={sending}
                    onCheckedChange={(on) =>
                      update({ domains: on ? [...data.domains, d] : data.domains.filter((x) => x !== d) })
                    }
                  />
                  {domainLabel[d]}
                </Label>
              ))}
            </div>
          </FormField>

          <FormField
            id="noi_dung"
            label="Nội dung điều luật"
            hint={`Dán nguyên văn, không sửa chữ — AI chỉ trích xuất, curator sẽ so lại với bản gốc. ${data.noi_dung.length.toLocaleString("vi-VN")} ký tự.`}
            error={errors.noi_dung}
          >
            <Textarea
              id="noi_dung"
              rows={12}
              value={data.noi_dung}
              onChange={(e) => update({ noi_dung: e.target.value })}
              placeholder={"Điều 8. …\n1. …\n2. …"}
              className="font-mono text-sm"
              aria-invalid={!!errors.noi_dung}
              disabled={sending}
            />
          </FormField>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Kết quả AI luôn là bản nháp &quot;Chờ duyệt&quot; — không có gì vào kho cho tới khi curator duyệt.
          </p>

          {sending && (
            <div className="space-y-2" aria-live="polite">
              <p className="text-sm text-muted-foreground">Đang gửi yêu cầu trích xuất…</p>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={sending}>
            <Sparkles /> {sending ? "Đang gửi…" : "Trích xuất bằng AI"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
