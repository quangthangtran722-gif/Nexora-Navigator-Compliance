"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, CircleCheck, CircleHelp, Plus, RotateCw, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { FormField } from "@/components/nexora/form-field";
import { PageHeader } from "@/components/nexora/page-header";
import { Stepper } from "@/components/nexora/progress";
import { ApDungBadge } from "@/components/nexora/status-badges";
import { ThuocTinhField } from "@/components/nexora/thuoc-tinh-field";
import { COPY, HO_SO } from "@/lib/copy";
import { PHONG_BAN, PHONG_BAN_LABEL } from "@/lib/department-codes";
import { domainLabel, KNOWN_DOMAINS, QUY_MO_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine, ok, useErrorHandler } from "@/lib/data/errors";
import { saveOnboarding } from "@/lib/data/mutations";
import { dangKyDoanhNghiep, lamMoiPhien, OnboardError, quetLaiDoanhNghiep, type OnboardKetQua } from "@/lib/data/onboard";
import { generateAll } from "@/lib/data/pipeline";
import { getCustomer, getDepartments, getNganh, getThuocTinhHoSo } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import {
  onboardingSchema,
  onboardingSchemaDangKy,
  onboardingStep1,
  onboardingStep1DangKy,
  onboardingStep2,
  onboardingStep3,
  onboardingStep4,
  onboardingStep4DangKy,
  toFieldErrors,
} from "@/lib/schemas";
import type { GiaTriThuocTinh } from "@/lib/thuoc-tinh-format";
import type { QuyMo, ThuocTinhHoSo, TrangThaiApDung } from "@/lib/types";
import { cn } from "@/lib/utils";
import { THUOC_TINH_TU_COT } from "@/lib/pipeline/ruleEngine";

/*
 * Hồ sơ doanh nghiệp (URL /onboarding giữ nguyên) — 4 bước. 2 chế độ, CÙNG 1 màn kết quả (CONTRACT §8):
 *  - Đăng ký (tài khoản chưa gắn doanh nghiệp): POST /api/onboard → refreshSession() BẮT BUỘC (JWT cũ chưa có
 *    customer_id) → 202 thì hỏi lại GET /api/onboard/{id} / quét lại POST /api/onboard/{id}. Mã phòng ban tuỳ chọn —
 *    backend đoán từ tên, đoán không ra thì báo lỗi ngay tại ô "Loại phòng ban". 400/409 hiện lỗi tại từng ô.
 *  - Sửa hồ sơ (đã có doanh nghiệp — 1 tài khoản chỉ 1 doanh nghiệp, không gọi POST /api/onboard): lưu customers +
 *    departments như cũ → POST /api/onboard/{id} quét lại để có cùng dạng kết quả.
 * Sau đối chiếu: tạo việc cần làm (/api/pipeline/generate, AI viết draft chờ người đầu mối duyệt); lỗi bước này
 * không làm mất kết quả — người dùng vẫn bấm "Tạo việc cần làm" ở trang Xác nhận nghĩa vụ.
 * Bước 3 render câu hỏi TỪ thuoc_tinh_ho_so, không hard-code; nganh/quy_mo là cột riêng, không hỏi lại trong thuoc_tinh.
 */

const CHUA_CHON = "chua_chon";
const TU_NHAN = "tu_nhan"; // Select không nhận value "" → giá trị riêng cho "Tự nhận diện theo tên phòng"

const QUY_MO_ITEMS = [{ value: CHUA_CHON, label: HO_SO.chuaChon }, ...(Object.keys(QUY_MO_LABEL) as QuyMo[]).map((q) => ({ value: q, label: QUY_MO_LABEL[q] }))];
const PHONG_BAN_ITEMS = PHONG_BAN.map((s) => ({ value: s, label: PHONG_BAN_LABEL[s] }));
const PHONG_BAN_ITEMS_DANG_KY = [{ value: TU_NHAN, label: HO_SO.loaiPhongTuNhan }, ...PHONG_BAN_ITEMS];
const DOMAIN_HINT: Record<string, string> = {
  thue: "Hoá đơn, thuế GTGT, thuế TNDN, kê khai và nộp thuế",
  ke_toan: "Chứng từ, sổ sách, báo cáo tài chính, lưu trữ",
  chung_khoan: "Môi giới, tự doanh, tư vấn đầu tư, giấy phép UBCKNN",
};
const THU_TU_TRANG_THAI: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];

type DeptState = { ten_phong_ban: string; slug_phong_ban: string; email_head: string };
type FormState = {
  ten_cong_ty: string;
  ma_so_thue: string;
  nganh: string;
  quy_mo: QuyMo | typeof CHUA_CHON;
  domains: string[];
  thuoc_tinh: Record<string, GiaTriThuocTinh | undefined>;
  departments: DeptState[];
};
// kq null = doanh nghiệp đã lưu nhưng đối chiếu lỗi → hiện nút "Đối chiếu lại"
type Done = { id: string; kq: OnboardKetQua | null };

const EMPTY_DEPT: DeptState = { ten_phong_ban: "", slug_phong_ban: "", email_head: "" };
const EMPTY: FormState = { ten_cong_ty: "", ma_so_thue: "", nganh: "", quy_mo: CHUA_CHON, domains: [], thuoc_tinh: {}, departments: [EMPTY_DEPT] };

// Lỗi từng trường từ API (chi_tiet) → key lỗi của form + câu tiếng Việt cho người dùng (không lộ mã nội bộ)
function loiTuApi(e: OnboardError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { truong, loi } of e.chiTiet) {
    const key = truong.replace(/^phong_ban\[(\d+)\]\./, "departments.$1.").replace(/^phong_ban$/, "departments");
    out[key] = key.startsWith("thuoc_tinh.")
      ? HO_SO.loi.thuocTinh
      : key === "ma_so_thue"
        ? e.status === 409
          ? HO_SO.loi.mstDaDangKy
          : HO_SO.loi.mstSai
        : key.endsWith(".slug_phong_ban")
          ? HO_SO.loi.loaiPhong
          : key.endsWith(".ten_phong_ban")
            ? /trùng/i.test(loi)
              ? HO_SO.loi.tenPhongTrung
              : HO_SO.loi.tenPhong
            : key.endsWith(".email_head")
              ? HO_SO.loi.email
              : key === "ten_cong_ty"
                ? HO_SO.loi.tenCongTy
                : key === "domains"
                  ? HO_SO.loi.linhVuc
                  : key === "departments"
                    ? HO_SO.loi.phongBan
                    : HO_SO.loi.khac;
  }
  return out;
}

// Bước chứa ô lỗi — để đưa người dùng về đúng bước
function buocCuaLoi(key: string): number {
  if (["ten_cong_ty", "ma_so_thue", "nganh", "quy_mo"].includes(key)) return 0;
  if (key === "domains") return 1;
  if (key.startsWith("thuoc_tinh")) return 2;
  return 3;
}

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const router = useRouter();
  const { customerId } = useAuth();
  // Chưa gắn doanh nghiệp → đăng ký mới. Chốt theo lúc mở form: sau khi đăng ký, refreshSession làm customerId có giá trị
  const [laDangKy] = useState(() => !customerId);
  const handleError = useErrorHandler();
  // Câu hỏi hồ sơ đọc từ bảng thuoc_tinh_ho_so, danh sách ngành từ bảng nganh — KHÔNG hard-code
  const dictQuery = useQuery(() => combine({ dict: getThuocTinhHoSo(), nganh: getNganh() }), []);
  const dict = dictQuery.data?.dict ?? [];
  const nganhItems = [...(dictQuery.data?.nganh ?? [])].sort((a, b) => a.ten_hien_thi.localeCompare(b.ten_hien_thi, "vi")).map((n) => ({ value: n.ma, label: n.ten_hien_thi }));

  // Hồ sơ đã có → điền sẵn câu trả lời cũ để sửa, không bắt khai lại từ đầu
  const profile = useQuery(
    () => (laDangKy || !customerId ? Promise.resolve(ok(null)) : combine({ customer: getCustomer(customerId), departments: getDepartments(customerId) })),
    [laDangKy ? null : customerId],
  );
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && profile.data) {
    setPrefilled(true); // set state trong render (1 lần) — không cần effect
    const { customer: c, departments: ds } = profile.data;
    setData({
      ten_cong_ty: c.ten_cong_ty,
      ma_so_thue: c.ma_so_thue ?? "",
      nganh: c.nganh ?? "",
      quy_mo: c.quy_mo ?? CHUA_CHON,
      domains: c.domains,
      thuoc_tinh: c.thuoc_tinh,
      departments: ds.length ? ds.map((d) => ({ ten_phong_ban: d.ten_phong_ban, slug_phong_ban: d.slug_phong_ban, email_head: d.email_head ?? "" })) : [EMPTY_DEPT],
    });
  }
  // Đã từng hoàn tất hồ sơ (có lĩnh vực theo dõi) → "Hồ sơ doanh nghiệp", chưa thì "Thiết lập hồ sơ doanh nghiệp"
  const daHoanTat = !!done || (profile.data?.customer.domains.length ?? 0) > 0;
  const header = <PageHeader title={daHoanTat ? COPY.page.hoSo.title : COPY.page.hoSo.titleSetup} description={COPY.page.hoSo.description} />;

  const update = (patch: Partial<FormState>) => setData((d) => ({ ...d, ...patch }));
  const setDept = (i: number, patch: Partial<DeptState>) => update({ departments: data.departments.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  // Lĩnh vực: lấy từ danh mục thuoc_tinh_ho_so.domain (thêm lĩnh vực mới chỉ cần thêm dòng trong DB) + lĩnh vực hồ sơ đang có
  const domainList = [...new Set([...KNOWN_DOMAINS, ...dict.flatMap((t) => (t.domain ? [t.domain] : [])), ...data.domains])];
  // Câu hỏi: dùng chung (domain null) + theo lĩnh vực đã chọn; nganh, quy_mo là cột riêng ở bước 1 → không hỏi lại
  const questions = dict.filter((t) => !THUOC_TINH_TU_COT.includes(t.ma) && (t.domain === null || data.domains.includes(t.domain)));

  const stepSchemas = laDangKy
    ? ([onboardingStep1DangKy, onboardingStep2, onboardingStep3, onboardingStep4DangKy] as const)
    : ([onboardingStep1, onboardingStep2, onboardingStep3, onboardingStep4] as const);

  // State form → payload đúng shape CONTRACT
  function toPayload() {
    return {
      ten_cong_ty: data.ten_cong_ty,
      ...(laDangKy ? { ma_so_thue: data.ma_so_thue } : {}),
      nganh: data.nganh === "" ? null : data.nganh, // mã ngành từ bảng nganh
      quy_mo: data.quy_mo === CHUA_CHON ? null : data.quy_mo,
      domains: data.domains,
      // Chưa trả lời (undefined) → không gửi key; "Chưa chắc" → null. Bỏ câu của lĩnh vực đã bỏ chọn.
      thuoc_tinh: Object.fromEntries(Object.entries(data.thuoc_tinh).filter(([ma, v]) => v !== undefined && questions.some((q) => q.ma === ma))),
      departments: data.departments.map((d) => ({
        ...d,
        slug_phong_ban: d.slug_phong_ban === TU_NHAN ? "" : d.slug_phong_ban,
        email_head: d.email_head.trim() === "" ? null : d.email_head.trim(),
      })),
    };
  }

  // Tạo việc cần làm cho nghĩa vụ áp dụng — lỗi không chặn màn kết quả
  async function taoViec(id: string, kq: OnboardKetQua) {
    if (kq.tong_nghia_vu === 0) return;
    try {
      await generateAll({ customer_id: id });
    } catch (e) {
      console.warn("[Nexora] Tạo việc cần làm sau khi lưu hồ sơ thất bại", e);
    }
  }

  async function doiChieuLai(id: string) {
    setBusy(true);
    try {
      const kq = await quetLaiDoanhNghiep(id);
      await taoViec(id, kq);
      setDone({ id, kq });
    } catch (e) {
      console.warn("[Nexora] Đối chiếu lại thất bại", e);
      setDone({ id, kq: null });
    }
    setBusy(false);
  }

  async function dangKy(payload: ReturnType<typeof toPayload>) {
    const full = onboardingSchemaDangKy.safeParse(payload);
    if (!full.success) return setErrors(toFieldErrors(full.error));
    const p = full.data;
    setBusy(true);
    try {
      const kq = await dangKyDoanhNghiep({
        ten_cong_ty: p.ten_cong_ty,
        ma_so_thue: p.ma_so_thue,
        nganh: p.nganh,
        quy_mo: p.quy_mo,
        domains: p.domains,
        thuoc_tinh: p.thuoc_tinh,
        phong_ban: p.departments.map((d) => ({ ten_phong_ban: d.ten_phong_ban, slug_phong_ban: d.slug_phong_ban, email_head: d.email_head })),
      });
      await taoViec(kq.khach_hang_id, kq);
      setDone({ id: kq.khach_hang_id, kq });
    } catch (e) {
      if (!(e instanceof OnboardError)) throw e;
      if ((e.status === 400 || e.status === 409) && e.chiTiet.length) {
        const loi = loiTuApi(e);
        setErrors({ ...loi, _form: HO_SO.loi.chung });
        setStep(Math.min(...Object.keys(loi).map(buocCuaLoi)));
      } else if (e.status === 409) {
        // Tài khoản đã gắn doanh nghiệp (JWT cũ) → làm mới phiên rồi về Tổng quan
        await lamMoiPhien().catch(() => undefined);
        router.replace("/tong-quan");
      } else {
        setErrors({ _form: handleError({ code: e.code ?? String(e.status), message: e.message, status: e.status })! });
      }
    }
    setBusy(false);
  }

  async function next() {
    const payload = toPayload();
    const result = stepSchemas[step].safeParse(payload);
    if (!result.success) return setErrors(toFieldErrors(result.error));
    setErrors({});
    if (step < HO_SO.buoc.length - 1) return setStep(step + 1);
    if (laDangKy) return dangKy(payload);

    // Sửa hồ sơ: lưu → quét lại (cùng hàm với đăng ký) → tạo việc cần làm
    const full = onboardingSchema.safeParse(payload);
    if (!full.success) return setErrors(toFieldErrors(full.error));
    setBusy(true);
    const { error } = await saveOnboarding(customerId!, full.data);
    if (error) {
      setBusy(false);
      return setErrors({ _form: handleError(error)! });
    }
    await doiChieuLai(customerId!);
  }

  if (done) {
    return (
      <>
        {header}
        <KetQuaHoSo
          done={done}
          dict={dict}
          busy={busy}
          onRetry={() => doiChieuLai(done.id)}
          onEdit={() => {
            // Vừa đăng ký xong → tải lại để form vào chế độ sửa (đọc hồ sơ đã lưu); gọi lại POST /api/onboard sẽ bị 409
            if (laDangKy) return window.location.reload();
            setDone(null);
            setStep(0);
          }}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <Card className="max-w-2xl">
        <CardHeader>
          <Stepper steps={HO_SO.buoc} current={step} />
          <CardTitle className="pt-2">{HO_SO.buocSo(step + 1, HO_SO.buoc.length, HO_SO.buoc[step])}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <FormField id="ten_cong_ty" label={HO_SO.tenCongTy} error={errors.ten_cong_ty}>
                <Input id="ten_cong_ty" value={data.ten_cong_ty} onChange={(e) => update({ ten_cong_ty: e.target.value })} placeholder={HO_SO.tenCongTyPh} aria-invalid={!!errors.ten_cong_ty} />
              </FormField>
              {laDangKy && (
                <FormField id="ma_so_thue" label={HO_SO.mst} hint={HO_SO.mstHint} error={errors.ma_so_thue}>
                  <Input
                    id="ma_so_thue"
                    inputMode="numeric"
                    className="sm:w-56"
                    value={data.ma_so_thue}
                    onChange={(e) => update({ ma_so_thue: e.target.value })}
                    placeholder="0312345678"
                    aria-invalid={!!errors.ma_so_thue}
                  />
                </FormField>
              )}
              <FormField label={HO_SO.nganh} hint={HO_SO.nganhHint} error={errors.nganh}>
                <Select items={nganhItems} value={data.nganh || null} onValueChange={(v) => update({ nganh: (v as string | null) ?? "" })}>
                  <SelectTrigger className="w-full sm:w-80" aria-invalid={!!errors.nganh}>
                    <SelectValue placeholder={HO_SO.nganhPh} />
                  </SelectTrigger>
                  <SelectContent>
                    {nganhItems.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={HO_SO.quyMo} error={errors.quy_mo}>
                <Select items={QUY_MO_ITEMS} value={data.quy_mo} onValueChange={(v) => update({ quy_mo: ((v as string | null) ?? CHUA_CHON) as FormState["quy_mo"] })}>
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
            <FormField label={HO_SO.linhVucHoi} error={errors.domains}>
              <div className="grid gap-3 sm:grid-cols-2">
                {domainList.map((d) => {
                  const checked = data.domains.includes(d);
                  return (
                    <Label key={d} className={cn("flex cursor-pointer items-start gap-3 border p-3 font-normal", checked && "border-primary bg-accent")}>
                      <Checkbox checked={checked} onCheckedChange={(on) => update({ domains: on ? [...data.domains, d] : data.domains.filter((x) => x !== d) })} />
                      <span className="space-y-0.5">
                        <span className="block font-medium">{domainLabel(d)}</span>
                        {DOMAIN_HINT[d] && <span className="block text-xs text-muted-foreground">{DOMAIN_HINT[d]}</span>}
                      </span>
                    </Label>
                  );
                })}
              </div>
            </FormField>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">{HO_SO.dacDiemMoTa}</p>
              {dictQuery.loading && <LoadingBlock />}
              {dictQuery.error && <ErrorBlock error={dictQuery.error} onRetry={dictQuery.reload} />}
              {!dictQuery.loading && !dictQuery.error && questions.length === 0 && (
                <p className="border bg-muted px-4 py-3 text-sm text-muted-foreground">{HO_SO.dacDiemRong}</p>
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
              <p className="text-sm text-muted-foreground">{laDangKy ? HO_SO.phongMoTaDangKy : HO_SO.phongMoTa}</p>
              {data.departments.map((dept, i) => (
                <div key={i} className="grid gap-3 border p-3 sm:grid-cols-2">
                  <FormField id={`dept-${i}-ten`} label={HO_SO.tenPhong} error={errors[`departments.${i}.ten_phong_ban`]}>
                    <Input id={`dept-${i}-ten`} value={dept.ten_phong_ban} onChange={(e) => setDept(i, { ten_phong_ban: e.target.value })} placeholder="Phòng Tài chính – Kế toán" />
                  </FormField>
                  <FormField label={HO_SO.loaiPhong} error={errors[`departments.${i}.slug_phong_ban`]}>
                    <Select
                      items={laDangKy ? PHONG_BAN_ITEMS_DANG_KY : PHONG_BAN_ITEMS}
                      value={dept.slug_phong_ban || (laDangKy ? TU_NHAN : null)}
                      onValueChange={(v) => setDept(i, { slug_phong_ban: (v as string | null) ?? "" })}
                    >
                      <SelectTrigger className="w-full" aria-invalid={!!errors[`departments.${i}.slug_phong_ban`]}>
                        <SelectValue placeholder={HO_SO.loaiPhong} />
                      </SelectTrigger>
                      <SelectContent>
                        {(laDangKy ? PHONG_BAN_ITEMS_DANG_KY : PHONG_BAN_ITEMS).map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField id={`dept-${i}-email`} label={HO_SO.emailPhong} hint={HO_SO.khongBatBuoc} error={errors[`departments.${i}.email_head`]}>
                    <Input id={`dept-${i}-email`} type="email" value={dept.email_head} onChange={(e) => setDept(i, { email_head: e.target.value })} placeholder="ketoan@congty.vn" />
                  </FormField>
                  <div className="flex items-end justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={HO_SO.xoaPhong(i + 1)}
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
                <Plus /> {HO_SO.themPhong}
              </Button>
            </div>
          )}

          {errors._form && (
            <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {errors._form}
            </p>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          <Button variant="outline" disabled={step === 0 || busy} onClick={() => (setErrors({}), setStep(step - 1))}>
            {COPY.action.back}
          </Button>
          <Button onClick={next} disabled={busy}>
            {step === HO_SO.buoc.length - 1 ? (busy ? COPY.state.matching : COPY.action.hoanTatHoSo) : COPY.action.next}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

/* ---------- Màn kết quả "Hồ sơ đã sẵn sàng" — dữ liệu từ OnboardKetQua (CONTRACT §8) ---------- */

function KetQuaHoSo({
  done,
  dict,
  busy,
  onRetry,
  onEdit,
}: {
  done: Done;
  dict: ThuocTinhHoSo[];
  busy: boolean;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const kq = done.kq;
  const R = HO_SO.ketQua;
  // Số văn bản đã đối chiếu = số văn bản khác nhau trong kết quả (mọi trạng thái)
  const soVanBan = kq ? new Set(kq.ket_qua.map((k) => k.van_ban.so_hieu)).size : 0;
  const nguon = (k: OnboardKetQua["ket_qua"][number]) => [k.van_ban.so_hieu, k.van_ban.so_dieu ? R.dieu(k.van_ban.so_dieu) : null].filter(Boolean).join(", ");
  // 1 dòng / nghĩa vụ (chua_du_thong_tin không gắn phòng)
  const canBoSung = kq ? [...new Map(kq.ket_qua.filter((k) => k.trang_thai_ap_dung === "chua_du_thong_tin").map((k) => [k.entity_id, k])).values()] : [];
  const thieuPhong = kq
    ? new Set(kq.ket_qua.filter((k) => (k.trang_thai_ap_dung === "ap_dung" || k.trang_thai_ap_dung === "sap_ap_dung") && !k.ten_phong_ban).map((k) => k.entity_id)).size
    : 0;
  const cauHoi = (ma: string) => dict.find((t) => t.ma === ma)?.cau_hoi;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CircleCheck className="size-5 text-duyet-da" aria-hidden /> {R.title}
        </CardTitle>
        <CardDescription className="text-sm">{!kq ? R.chuaDoiChieu : soVanBan === 0 ? R.chuaCoVanBan : R.body(soVanBan, kq.tong_nghia_vu)}</CardDescription>
      </CardHeader>

      {kq && soVanBan > 0 && (
        <CardContent className="space-y-6">
          {/* Phân bổ theo phòng ban — phần chính: MỌI phòng đã khai, kể cả phòng 0 nghĩa vụ */}
          <section aria-labelledby="phan-bo-title" className="space-y-2">
            <div>
              <h3 id="phan-bo-title" className="text-sm font-semibold">
                {R.phanBo}
              </h3>
              <p className="text-xs text-muted-foreground">{R.phanBoPhu}</p>
            </div>
            <ul className="border [&>li+li]:border-t">
              {kq.theo_phong_ban.map((p) => {
                const viec = kq.ket_qua.filter((k) => k.ten_phong_ban === p.ten_phong_ban);
                if (p.so_nghia_vu === 0 || viec.length === 0) {
                  return (
                    <li key={p.ten_phong_ban} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="font-medium">{p.ten_phong_ban}</span>
                      <span className="text-muted-foreground">{R.khongCoViec}</span>
                    </li>
                  );
                }
                return (
                  <li key={p.ten_phong_ban}>
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                        <span className="font-medium">{p.ten_phong_ban}</span>
                        <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
                          {R.soViec(p.so_nghia_vu)}
                          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                        </span>
                      </summary>
                      {/* Mỗi nghĩa vụ kèm văn bản nguồn (số hiệu + điều) */}
                      <ul className="border-t bg-muted/30 px-3 py-1 [&>li+li]:border-t">
                        {viec.map((v) => (
                          <li key={`${v.entity_id}-${p.ten_phong_ban}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                            <span className="min-w-48 flex-1">
                              <span className="block">{v.ten_entity}</span>
                              <span className="block text-xs text-muted-foreground" title={v.van_ban.ten_van_ban}>
                                {nguon(v)}
                              </span>
                            </span>
                            {v.trang_thai_ap_dung !== "ap_dung" && <ApDungBadge status={v.trang_thai_ap_dung} />}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
            {thieuPhong > 0 && <p className="text-sm text-status-ap-dung">{R.thieuPhong(thieuPhong)}</p>}
          </section>

          {/* Đủ 4 trạng thái, đếm theo nghĩa vụ */}
          <section aria-labelledby="thong-ke-title" className="space-y-2">
            <h3 id="thong-ke-title" className="text-sm font-semibold">
              {R.thongKe}
            </h3>
            <dl className="grid grid-cols-2 gap-px border bg-border sm:grid-cols-4">
              {THU_TU_TRANG_THAI.map((s) => (
                <div key={s} className="bg-card px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{COPY.status.apDung[s]}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{kq.thong_ke[s] || "–"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Chưa đủ thông tin → nêu đúng câu cần trả lời, dẫn tới khối "Cần bổ sung thông tin" */}
          {canBoSung.length > 0 && (
            <section aria-labelledby="bo-sung-title" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="bo-sung-title" className="flex items-center gap-1.5 text-sm font-semibold">
                  <CircleHelp className="size-4 text-status-ap-dung" aria-hidden /> {COPY.status.apDung.chua_du_thong_tin}
                </h3>
                <Link href="/duyet-diagnostic#hoi-bo-sung" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {R.traLoiNgay} <ArrowRight />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">{R.canBoSungMoTa(canBoSung.length)}</p>
              <ul className="border [&>li+li]:border-t">
                {canBoSung.map((k) => {
                  const hoi = k.thuoc_tinh_thieu.map(cauHoi).filter(Boolean);
                  return (
                    <li key={k.entity_id} className="space-y-0.5 px-3 py-2 text-sm">
                      <span className="block">{k.ten_entity}</span>
                      <span className="block text-xs text-muted-foreground">{nguon(k)}</span>
                      {hoi.length > 0 && (
                        <span className="block text-xs">
                          <span className="text-muted-foreground">{R.canTraLoi} </span>
                          {hoi.join(" · ")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </CardContent>
      )}

      <CardFooter className="flex-wrap justify-end gap-2">
        {!kq ? (
          <Button onClick={onRetry} disabled={busy}>
            <RotateCw /> {busy ? COPY.state.matching : R.doiChieuLai}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onEdit}>
              {R.suaHoSo}
            </Button>
            <Link href="/duyet-diagnostic" className={buttonVariants()}>
              {COPY.action.xemXacNhan} <ArrowRight />
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
