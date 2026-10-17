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
import { FormField, PayloadPreview } from "@/components/nexora/form-field";
import { domainLabel } from "@/lib/labels";
import {
  onboardingSchema,
  onboardingStep1,
  onboardingStep2,
  onboardingStep3,
  toFieldErrors,
  type OnboardingPayload,
} from "@/lib/schemas";
import type { Domain } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Thông tin công ty", "Lĩnh vực theo dõi", "Phòng ban"] as const;
const STEP_SCHEMAS = [onboardingStep1, onboardingStep2, onboardingStep3] as const;

const QUY_MO = [
  { value: "Dưới 10 nhân viên", label: "Dưới 10 nhân viên" },
  { value: "10–49 nhân viên", label: "10–49 nhân viên" },
  { value: "50–199 nhân viên", label: "50–199 nhân viên" },
  { value: "Từ 200 nhân viên", label: "Từ 200 nhân viên" },
];

const DOMAIN_HINT: Record<Domain, string> = {
  thue: "Hoá đơn, thuế GTGT, thuế TNDN, kê khai và nộp thuế",
  ke_toan: "Chứng từ, sổ sách, báo cáo tài chính, lưu trữ",
};

// Gợi ý nhanh — chỉ điền sẵn tên, người dùng vẫn sửa được
const DEPT_PRESETS = ["Kế toán", "Kinh doanh", "Kho vận", "Ban Giám đốc"];

const EMPTY: OnboardingPayload = {
  ten_cong_ty: "",
  nganh: "",
  quy_mo: "",
  domains: [],
  departments: [{ ten_phong_ban: "", email_head: "" }],
};

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingPayload>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<OnboardingPayload | null>(null);

  const update = (patch: Partial<OnboardingPayload>) => setData((d) => ({ ...d, ...patch }));

  const setDept = (i: number, patch: Partial<OnboardingPayload["departments"][number]>) =>
    update({ departments: data.departments.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  // Chỉ validate phần của bước hiện tại trước khi sang bước sau
  function next() {
    const result = STEP_SCHEMAS[step].safeParse(data);
    if (!result.success) return setErrors(toFieldErrors(result.error));
    setErrors({});
    if (step < STEPS.length - 1) return setStep(step + 1);

    const full = onboardingSchema.safeParse(data);
    if (!full.success) return setErrors(toFieldErrors(full.error));
    setSubmitted(full.data); // MOCK: chưa gọi POST /api/customers/:id/onboard
  }

  if (submitted) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck className="size-5 text-duyet-da" aria-hidden /> Đã ghi nhận hồ sơ (mô phỏng)
          </CardTitle>
          <CardDescription>
            Chưa lưu vào hệ thống. Khi có API, bước này sẽ tạo công ty + phòng ban và chạy quét đối chiếu quy định.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayloadPreview data={submitted} />
        </CardContent>
        <CardFooter className="gap-2">
          <Link href="/tong-quan" className={buttonVariants()}>
            Xem tổng quan
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setSubmitted(null);
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
        {/* Thanh tiến trình theo bước */}
        <ol className="flex gap-2" aria-label="Các bước onboarding">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1 space-y-1.5">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("text-xs", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>
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
              <Input
                id="ten_cong_ty"
                value={data.ten_cong_ty}
                onChange={(e) => update({ ten_cong_ty: e.target.value })}
                placeholder="Công ty TNHH Thương mại Minh Phát"
                aria-invalid={!!errors.ten_cong_ty}
              />
            </FormField>
            <FormField id="nganh" label="Ngành kinh doanh" hint="Mô tả ngắn, vd: bán lẻ qua sàn TMĐT" error={errors.nganh}>
              <Input
                id="nganh"
                value={data.nganh}
                onChange={(e) => update({ nganh: e.target.value })}
                placeholder="Thương mại điện tử — Shopee, TikTok Shop"
                aria-invalid={!!errors.nganh}
              />
            </FormField>
            <FormField label="Quy mô" error={errors.quy_mo}>
              <Select items={QUY_MO} value={data.quy_mo || null} onValueChange={(v) => update({ quy_mo: v ?? "" })}>
                <SelectTrigger className="w-full sm:w-72" aria-invalid={!!errors.quy_mo}>
                  <SelectValue placeholder="Chọn quy mô nhân sự" />
                </SelectTrigger>
                <SelectContent>
                  {QUY_MO.map((q) => (
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
              {(Object.keys(domainLabel) as Domain[]).map((d) => {
                const checked = data.domains.includes(d);
                return (
                  <Label
                    key={d}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal",
                      checked && "border-primary bg-accent",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) =>
                        update({ domains: on ? [...data.domains, d] : data.domains.filter((x) => x !== d) })
                      }
                    />
                    <span className="space-y-0.5">
                      <span className="block font-medium">{domainLabel[d]}</span>
                      <span className="block text-xs text-muted-foreground">{DOMAIN_HINT[d]}</span>
                    </span>
                  </Label>
                );
              })}
            </div>
          </FormField>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Diagnostic sẽ được gửi tới email trưởng phòng của phòng ban liên quan.
            </p>

            {data.departments.map((dept, i) => (
              <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                <FormField id={`dept-${i}-ten`} label="Tên phòng ban" error={errors[`departments.${i}.ten_phong_ban`]}>
                  <Input
                    id={`dept-${i}-ten`}
                    value={dept.ten_phong_ban}
                    onChange={(e) => setDept(i, { ten_phong_ban: e.target.value })}
                    placeholder="Kế toán"
                  />
                </FormField>
                <FormField id={`dept-${i}-email`} label="Email trưởng phòng" error={errors[`departments.${i}.email_head`]}>
                  <Input
                    id={`dept-${i}-email`}
                    type="email"
                    value={dept.email_head}
                    onChange={(e) => setDept(i, { email_head: e.target.value })}
                    placeholder="ketoan@congty.vn"
                  />
                </FormField>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Xoá phòng ban ${i + 1}`}
                  disabled={data.departments.length === 1}
                  onClick={() => update({ departments: data.departments.filter((_, j) => j !== i) })}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            {errors.departments && <p className="text-xs text-destructive">{errors.departments}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => update({ departments: [...data.departments, { ten_phong_ban: "", email_head: "" }] })}
              >
                <Plus /> Thêm phòng ban
              </Button>
              <span className="text-xs text-muted-foreground">Thêm nhanh:</span>
              {DEPT_PRESETS.filter((p) => !data.departments.some((d) => d.ten_phong_ban === p)).map((p) => (
                <Button
                  key={p}
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    // Điền vào dòng trống đầu tiên nếu có, không thì thêm dòng mới
                    const empty = data.departments.findIndex((d) => !d.ten_phong_ban && !d.email_head);
                    if (empty >= 0) setDept(empty, { ten_phong_ban: p });
                    else update({ departments: [...data.departments, { ten_phong_ban: p, email_head: "" }] });
                  }}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => (setErrors({}), setStep(step - 1))}>
          Quay lại
        </Button>
        <Button onClick={next}>{step === STEPS.length - 1 ? "Hoàn tất" : "Tiếp tục"}</Button>
      </CardFooter>
    </Card>
  );
}
