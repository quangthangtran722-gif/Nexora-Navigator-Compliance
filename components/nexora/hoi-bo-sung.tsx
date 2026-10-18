"use client";

import { useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThuocTinhField } from "@/components/nexora/thuoc-tinh-field";
import { ApDungBadge } from "@/components/nexora/status-badges";
import { TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useErrorHandler } from "@/lib/data/errors";
import { updateCustomerThuocTinh } from "@/lib/data/mutations";
import { PipelineError, pipelineErrorCode, postPipeline } from "@/lib/data/pipeline";
import type { GiaTriThuocTinh } from "@/lib/thuoc-tinh-format";
import type { Customer, Entity, ThuocTinhHoSo, TrangThaiApDung } from "@/lib/types";

/*
 * "Hỏi bổ sung" — vòng đời chua_du_thong_tin (CONTRACT §3.6):
 *  câu hỏi = thuoc_tinh_thieu → thuoc_tinh_ho_so.cau_hoi → trả lời ghi customers.thuoc_tinh
 *  → gọi lại POST /api/pipeline/filter cho RIÊNG entity đó (rule engine ở backend) → áp dụng thì gọi /generate
 *  → màn cha đọc lại bảng diagnostics để hiển thị (không tính trạng thái áp dụng ở client).
 * Dùng chung ThuocTinhField với onboarding (không tạo luồng nhập liệu mới).
 */

type Props = {
  customer: Customer;
  entity: Entity;
  thuocTinhThieu: string[]; // hợp các mã thiếu của mọi diagnostic cùng entity
  dict: ThuocTinhHoSo[];
  onDone: (r: { entityTen: string; status: TrangThaiApDung | null; error?: string }) => void;
};

export function HoiBoSungCard({ customer, entity, thuocTinhThieu, dict, onDone }: Props) {
  const questions = thuocTinhThieu.map((ma) => dict.find((t) => t.ma === ma)).filter((t): t is ThuocTinhHoSo => !!t);
  const [answers, setAnswers] = useState<Record<string, GiaTriThuocTinh | undefined>>(() =>
    Object.fromEntries(questions.map((q) => [q.ma, customer.thuoc_tinh[q.ma] ?? undefined])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrangThaiApDung | null>(null);
  const handleError = useErrorHandler();

  const unanswered = questions.filter((q) => answers[q.ma] === undefined);

  async function submit() {
    setBusy(true);
    setError(null);
    // undefined = chưa đụng tới → không gửi; null = "Chưa chắc" → vẫn ghi null (không xoá key)
    const patch = Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== undefined)) as Record<string, GiaTriThuocTinh>;
    const { error: err } = await updateCustomerThuocTinh(customer.id, patch);
    if (err) {
      setBusy(false);
      return setError(handleError(err)); // PT400: thuộc tính sai kiểu / ngoài lua_chon — message tiếng Việt từ DB
    }
    let status: TrangThaiApDung | null = null;
    let failMsg: string | undefined;
    try {
      const { ket_qua } = await postPipeline("/api/pipeline/filter", { customer_id: customer.id, entity_id: entity.id });
      const kq = ket_qua[0];
      status = kq?.trang_thai_ap_dung ?? null;
      setResult(status);
      if (kq && (kq.trang_thai_ap_dung === "ap_dung" || kq.trang_thai_ap_dung === "sap_ap_dung")) {
        await postPipeline("/api/pipeline/generate", { customer_id: customer.id, diagnostic_ids: kq.diagnostic_ids });
      }
    } catch (e) {
      failMsg =
        (e instanceof PipelineError ? handleError({ code: pipelineErrorCode(e), message: e.error, status: e.status }) : null) ??
        "Không chạy lại được rule engine.";
      setError(failMsg);
    }
    setBusy(false);
    onDone({ entityTen: entity.ten_entity, status, error: failMsg });
  }

  return (
    <Card className="ring-1 ring-status-chua-du-tt/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestion className="size-4 text-status-chua-du-tt" aria-hidden /> {entity.ten_entity}
        </CardTitle>
        <CardDescription>
          Hệ thống chưa đủ thông tin để xác định nghĩa vụ này có áp dụng cho doanh nghiệp không. Trả lời {questions.length} câu dưới đây — chọn
          &quot;Chưa chắc&quot; nếu chưa có số liệu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((q) => (
          <ThuocTinhField key={q.ma} tt={q} value={answers[q.ma]} onChange={(v) => setAnswers((a) => ({ ...a, [q.ma]: v }))} />
        ))}
        {result && (
          <p className="flex flex-wrap items-center gap-2 text-sm" role="status">
            Kết quả sau khi chạy lại rule engine: <ApDungBadge status={result} />
            {result === "chua_du_thong_tin" && <span className="text-muted-foreground">— vẫn còn thiếu dữ liệu.</span>}
            {(result === "ap_dung" || result === "sap_ap_dung") && <span className="text-muted-foreground">— AI đã viết checklist, chờ duyệt bên dưới.</span>}
            {result === "khong_ap_dung" && <span className="text-muted-foreground">— {TRANG_THAI_AP_DUNG_LABEL.khong_ap_dung.toLowerCase()} với doanh nghiệp.</span>}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button onClick={submit} disabled={busy || unanswered.length === questions.length}>
          <Send /> Gửi câu trả lời
        </Button>
        {unanswered.length > 0 && <span className="text-xs text-muted-foreground">Còn {unanswered.length} câu chưa trả lời</span>}
      </CardFooter>
    </Card>
  );
}
