"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Plus, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { FormField, PayloadPreview } from "@/components/nexora/form-field";
import { ApDungBadge } from "@/components/nexora/status-badges";
import { ThuocTinhField } from "@/components/nexora/thuoc-tinh-field";
import { PHONG_BAN, PHONG_BAN_LABEL } from "@/lib/department-codes";
import { domainLabel, KNOWN_DOMAINS, QUY_MO_LABEL, toSlug } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { saveOnboarding } from "@/lib/data/mutations";
import { filterThenGenerate, PipelineError, toAppError, type FilterKetQua } from "@/lib/data/pipeline";
import { getCustomer, getDepartments, getThuocTinhHoSo } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { onboardingSchema, onboardingStep1, onboardingStep2, onboardingStep3, onboardingStep4, toFieldErrors, type OnboardingPayload } from "@/lib/schemas";
import type { GiaTriThuocTinh } from "@/lib/thuoc-tinh-format";
import type { QuyMo, TrangThaiApDung } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Onboarding 4 bước — ghi customers (CONTRACT §3.1) của khách hàng đang đăng nhập + departments (§3.3), rồi chạy rule engine ở backend
 * (POST /api/pipeline/filter) để ra danh sách nghĩa vụ ban đầu.
 * Bước 3 render câu hỏi TỪ thuoc_tinh_ho_so (§3.2), không hard-code — dùng chung ThuocTinhField với "hỏi bổ sung".
 */

const STEPS = ["Thông tin công ty", "Lĩnh vực theo dõi", "Hồ sơ doanh nghiệp", "Phòng ban"] as const;
const STEP_SCHEMAS = [onboardingStep1, onboardingStep2, onboardingStep3, onboardingStep4] as const;

const QUY_MO_ITEMS = [
  { value: "chua_chon", label: "Chưa chọn" },
  ...(Object.keys(QUY_MO_LABEL) as QuyMo[]).map((q) => ({ value: q, label: QUY_MO_LABEL[q] })),
];
const PHONG_BAN_ITEMS = PHONG_BAN.map((s) => ({ value: s, label: PHONG_BAN_LABEL[s] }));
const DOMAIN_HINT: Record<string, string> = {
  thue: "Hoá đơn, thuế GTGT, thuế TNDN, kê khai và nộp thuế",
  ke_toan: "Chứng từ, sổ sách, báo cáo tài chính, lưu trữ",
};

type DeptState = { ten_phong_ban: string; slug_phong_ban: string; email_head: string };
type FormState = { ten_cong_ty: string; nganh: string; quy_mo: QuyMo | "chua_chon"; domains: string[]; thuoc_tinh: Record<string, GiaTriThuocTinh | undefined>; departments: DeptState[] };

const EMPTY_DEPT: DeptState = { ten_phong_ban: "", slug_phong_ban: "", email_head: "" };
const EMPTY: FormState = { ten_cong_ty: "", nganh: "", quy_mo: "chua_chon", domains: [], thuoc_tinh: {}, departments: [EMPTY_DEPT] };

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ payload: OnboardingPayload; ketQua: FilterKetQua[] | null; soChecklist?: number; loi?: string } | null>(null);
  const { customerId } = useAuth(); // ghi vào hồ sơ của chính khách hàng đang đăng nhập (RequireRole đảm bảo có)
  const handleError = useErrorHandler();
  // Câu hỏi hồ sơ đọc từ bảng thuoc_tinh_ho_so (backend seed) — KHÔNG hard-code
  const dictQuery = useQuery(getThuocTinhHoSo, []);
  const dict = dictQuery.data ?? [];

  // Khách hàng đã onboard (vd hồ sơ seed) → điền sẵn câu trả lời cũ để sửa, không bắt khai lại từ đầu
  const profile = useQuery(() => combine({ customer: getCustomer(customerId!), departments: getDepartments(customerId!) }), [customerId]);
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && profile.data) {
    setPrefilled(true); // set state trong render (1 lần) — không cần effect
    const { customer: c, departments: ds } = profile.data;
    setData({
      ten_cong_ty: c.ten_cong_ty,
      nganh: c.nganh ?? "",
      quy_mo: c.quy_mo ?? "chua_chon",
      domains: c.domains,
      thuoc_tinh: c.thuoc_tinh,
      departments: ds.length ? ds.map((d) => ({ ten_phong_ban: d.ten_phong_ban, slug_phong_ban: d.slug_phong_ban, email_head: d.email_head ?? "" })) : [EMPTY_DEPT],
    });
  }

  const update = (patch: Partial<FormState>) => setData((d) => ({ ...d, ...patch }));
  const setDept = (i: number, patch: Partial<DeptState>) => update({ departments: data.departments.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  // Câu hỏi: dùng chung (domain null) + theo lĩnh vực đã chọn
  const questions = dict.filter((t) => t.domain === null || data.domains.includes(t.domain));

  // State form → payload đúng shape CONTRACT
  function toPayload() {
    const nganh = toSlug(data.nganh);
    return {
      ten_cong_ty: data.ten_cong_ty,
      nganh: nganh === "" ? null : nganh,
      quy_mo: data.quy_mo === "chua_chon" ? null : data.quy_mo,
      domains: data.domains,
      // Chưa trả lời (undefined) → không gửi key; "Chưa chắc" → null. Bỏ câu của lĩnh vực đã bỏ chọn.
      thuoc_tinh: Object.fromEntries(Object.entries(data.thuoc_tinh).filter(([ma, v]) => v !== undefined && questions.some((q) => q.ma === ma))),
      departments: data.departments.map((d) => ({ ...d, email_head: d.email_head.trim() === "" ? null : d.email_head.trim() })),
    };
  }

  async function next() {
    const payload = toPayload();
    const result = STEP_SCHEMAS[step].safeParse(payload);
    if (!result.success) return setErrors(toFieldErrors(result.error));
    setErrors({});
    if (step < STEPS.length - 1) return setStep(step + 1);

    const full = onboardingSchema.safeParse(payload);
    if (!full.success) return setErrors(toFieldErrors(full.error));
    setBusy(true);
    const { error } = await saveOnboarding(customerId!, full.data);
    if (error) {
      setBusy(false);
      return setErrors({ _form: handleError(error)! });
    }
    try {
      // filter không tự gọi generate → có mục áp dụng thì generate (lặp tới khi so_diagnostic = 0)
      const { filter, generate } = await filterThenGenerate({ customer_id: customerId! });
      setDone({ payload: full.data, ketQua: filter.ket_qua, soChecklist: generate.so_diagnostic });
    } catch (e) {
      // Lỗi ở bước generate (vd AI_RATE_LIMIT) — hồ sơ đã lưu, filter có thể đã chạy xong
      const loi = e instanceof PipelineError ? handleError(toAppError(e)) : null;
      setDone({ payload: full.data, ketQua: null, loi: loi ?? "Không chạy được đối chiếu." });
    }
    setBusy(false);
  }

  if (done) {
    const by = (s: TrangThaiApDung) => done.ketQua?.filter((k) => k.trang_thai_ap_dung === s).length ?? 0;
    const khongPhong = done.ketQua?.filter((k) => k.trang_thai_ap_dung !== "khong_ap_dung" && k.diagnostic_ids.length === 0).length ?? 0;
    const chuaCoEntity = done.ketQua !== null && done.ketQua.length === 0; // ket_qua [] = hợp lệ, không phải lỗi
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck className="size-5 text-duyet-da" aria-hidden /> Đã lưu hồ sơ & chạy đối chiếu
          </CardTitle>
          <CardDescription>Rule engine (không dùng AI) đã đối chiếu hồ sơ với kho nghĩa vụ đã duyệt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {chuaCoEntity ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Chưa có entity được duyệt trong kho để đối chiếu. Hồ sơ đã được lưu — khi curator duyệt văn bản mới, hệ thống sẽ quét lại.
            </p>
          ) : done.ketQua ? (
            <>
              <div className="flex flex-wrap gap-3">
                {(["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-sm">
                    <ApDungBadge status={s} /> <strong className="tabular-nums">{by(s)}</strong>
                  </span>
                ))}
              </div>
              {done.soChecklist !== undefined && done.soChecklist > 0 && (
                <p className="text-sm text-muted-foreground">AI đã viết {done.soChecklist} checklist — chờ duyệt ở màn Duyệt diagnostic.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-destructive">{done.loi}</p>
          )}
          {khongPhong > 0 && (
            <p className="text-sm text-status-ap-dung">
              {khongPhong} nghĩa vụ không giao được cho phòng nào (không có phòng khớp và không có Ban Giám đốc) — nên thêm phòng ban.
            </p>
          )}
          <PayloadPreview data={done.payload} />
        </CardContent>
        <CardFooter className="gap-2">
          <Link href="/tong-quan" className={buttonVariants()}>
            Xem tổng quan
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setDone(null);
              setData(EMPTY);
              setStep(0);
            }}
          >
            Nhập lại
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <ol className="flex gap-2" aria-label="Các bước onboarding">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1 space-y-1.5">
              <div className={cn("h-1.5 rounded-none", i <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("hidden text-xs sm:block", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>
                {i + 1}. {label}
              </p>
            </li>
          ))}
        </ol>
        <CardTitle className="pt-2">
          Bước {step + 1}/{STEPS.length} — {STEPS[step]}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {step === 0 && (
          <>
            <FormField id="ten_cong_ty" label="Tên công ty" error={errors.ten_cong_ty}>
              <Input id="ten_cong_ty" value={data.ten_cong_ty} onChange={(e) => update({ ten_cong_ty: e.target.value })} placeholder="Công ty TNHH Thương mại Minh Phát" aria-invalid={!!errors.ten_cong_ty} />
            </FormField>
            <FormField
              id="nganh"
              label="Ngành kinh doanh"
              hint={data.nganh ? `Sẽ lưu dạng mã: ${toSlug(data.nganh) || "—"}` : "Không bắt buộc, vd: Thương mại điện tử"}
              error={errors.nganh}
            >
              <Input id="nganh" value={data.nganh} onChange={(e) => update({ nganh: e.target.value })} aria-invalid={!!errors.nganh} />
            </FormField>
            <FormField label="Quy mô doanh nghiệp" error={errors.quy_mo}>
              <Select items={QUY_MO_ITEMS} value={data.quy_mo} onValueChange={(v) => update({ quy_mo: ((v as string | null) ?? "chua_chon") as FormState["quy_mo"] })}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUY_MO_ITEMS.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </>
        )}

        {step === 1 && (
          <FormField label="Doanh nghiệp cần theo dõi quy định thuộc lĩnh vực nào?" error={errors.domains}>
            <div className="grid gap-3 sm:grid-cols-2">
              {KNOWN_DOMAINS.map((d) => {
                const checked = data.domains.includes(d);
                return (
                  <Label key={d} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal", checked && "border-primary bg-accent")}>
                    <Checkbox checked={checked} onCheckedChange={(on) => update({ domains: on ? [...data.domains, d] : data.domains.filter((x) => x !== d) })} />
                    <span className="space-y-0.5">
                      <span className="block font-medium">{domainLabel(d)}</span>
                      <span className="block text-xs text-muted-foreground">{DOMAIN_HINT[d]}</span>
                    </span>
                  </Label>
                );
              })}
            </div>
          </FormField>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Trả lời để hệ thống xác định nghĩa vụ nào áp dụng. Chưa có số liệu thì chọn &quot;Chưa chắc&quot; — hệ thống sẽ hỏi lại khi cần.
            </p>
            {dictQuery.loading && <LoadingBlock />}
            {dictQuery.error && <ErrorBlock error={dictQuery.error} onRetry={dictQuery.reload} />}
            {/* Bảng thuoc_tinh_ho_so chưa được seed → để trống, không hard-code câu hỏi */}
            {!dictQuery.loading && !dictQuery.error && questions.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Chưa có câu hỏi hồ sơ cho lĩnh vực đã chọn (từ điển thuộc tính chưa được nạp). Có thể bỏ qua bước này — hệ thống sẽ hỏi bổ sung khi
                cần.
              </p>
            )}
            {questions.map((q) => (
              <ThuocTinhField
                key={q.ma}
                tt={q}
                value={data.thuoc_tinh[q.ma]}
                onChange={(v) => update({ thuoc_tinh: { ...data.thuoc_tinh, [q.ma]: v } })}
                error={errors[`thuoc_tinh.${q.ma}`]}
              />
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tên phòng ban do doanh nghiệp tự đặt; <strong>mã phòng ban chuẩn</strong> dùng để giao checklist đúng phòng.
            </p>
            {data.departments.map((dept, i) => (
              <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <FormField id={`dept-${i}-ten`} label="Tên phòng ban" error={errors[`departments.${i}.ten_phong_ban`]}>
                  <Input id={`dept-${i}-ten`} value={dept.ten_phong_ban} onChange={(e) => setDept(i, { ten_phong_ban: e.target.value })} placeholder="Phòng Tài chính – Kế toán" />
                </FormField>
                <FormField label="Mã phòng ban chuẩn" error={errors[`departments.${i}.slug_phong_ban`]}>
                  <Select items={PHONG_BAN_ITEMS} value={dept.slug_phong_ban || null} onValueChange={(v) => setDept(i, { slug_phong_ban: (v as string | null) ?? "" })}>
                    <SelectTrigger className="w-full" aria-invalid={!!errors[`departments.${i}.slug_phong_ban`]}>
                      <SelectValue placeholder="Chọn 1 trong 8 mã" />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONG_BAN_ITEMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField id={`dept-${i}-email`} label="Email trưởng phòng" hint="Không bắt buộc" error={errors[`departments.${i}.email_head`]}>
                  <Input id={`dept-${i}-email`} type="email" value={dept.email_head} onChange={(e) => setDept(i, { email_head: e.target.value })} placeholder="ketoan@congty.vn" />
                </FormField>
                <div className="flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Xoá phòng ban ${i + 1}`}
                    disabled={data.departments.length === 1}
                    onClick={() => update({ departments: data.departments.filter((_, j) => j !== i) })}
                  >
                    <Trash2 /> Xoá
                  </Button>
                </div>
              </div>
            ))}
            {errors.departments && <p className="text-xs text-destructive">{errors.departments}</p>}
            <Button variant="outline" size="sm" onClick={() => update({ departments: [...data.departments, EMPTY_DEPT] })}>
              <Plus /> Thêm phòng ban
            </Button>
          </div>
        )}

        {errors._form && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {errors._form}
          </p>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="ghost" disabled={step === 0 || busy} onClick={() => (setErrors({}), setStep(step - 1))}>
          Quay lại
        </Button>
        <Button onClick={next} disabled={busy}>
          {step === STEPS.length - 1 ? (busy ? "Đang lưu…" : "Hoàn tất") : "Tiếp tục"}
        </Button>
      </CardFooter>
    </Card>
  );
}
