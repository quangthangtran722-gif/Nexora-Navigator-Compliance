"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/nexora/form-field";
import { ChunkBadge } from "@/components/nexora/status-badges";
import { domainLabel, KNOWN_DOMAINS, LOAI_VAN_BAN_LABEL } from "@/lib/labels";
import { describeError, useErrorHandler } from "@/lib/data/errors";
import { createVanBanWithChunks } from "@/lib/data/mutations";
import { PipelineError, pipelineErrorCode, postPipeline, toAppError, type PipelineRoutes } from "@/lib/data/pipeline";
import { nhapVanBanSchema, toFieldErrors } from "@/lib/schemas";
import type { LoaiVanBan, TrangThaiChunk } from "@/lib/types";

/*
 * Curator nạp văn bản: tạo van_ban (draft) + van_ban_chunks, rồi gọi POST /api/pipeline/extract
 * TUẦN TỰ từng chunk (quota Groq 8K token/phút — CONTRACT §7).
 */

type ChunkState = { tieu_de: string; dieu_khoan_range: string; noi_dung: string };
// khoa = route trả 409 (chunk đang chạy / đã có entity) → không cho trích lại
type Progress = { chunk_id: string; label: string; trang_thai: TrangThaiChunk; res?: PipelineRoutes["/api/pipeline/extract"]["res"]; loi?: string; khoa?: boolean };

const LOAI_ITEMS = (Object.keys(LOAI_VAN_BAN_LABEL) as LoaiVanBan[]).map((v) => ({ value: v, label: LOAI_VAN_BAN_LABEL[v] }));
const EMPTY_CHUNK: ChunkState = { tieu_de: "", dieu_khoan_range: "", noi_dung: "" };

export function LawInputForm() {
  const [vb, setVb] = useState({
    ten_van_ban: "",
    so_hieu: "",
    loai_van_ban: "" as LoaiVanBan | "",
    co_quan_ban_hanh: "",
    ngay_ban_hanh: "",
    ngay_hieu_luc: "",
    domains: [] as string[],
  });
  const [chunks, setChunks] = useState<ChunkState[]>([EMPTY_CHUNK]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress[] | null>(null);
  const [running, setRunning] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const handleError = useErrorHandler();

  const updateVb = (patch: Partial<typeof vb>) => setVb((v) => ({ ...v, ...patch }));
  const setChunk = (i: number, patch: Partial<ChunkState>) => setChunks((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const blankToNull = (s: string) => (s.trim() === "" ? null : s.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = nhapVanBanSchema.safeParse({
      van_ban: { ...vb, co_quan_ban_hanh: blankToNull(vb.co_quan_ban_hanh), ngay_ban_hanh: blankToNull(vb.ngay_ban_hanh) },
      chunks: chunks.map((c) => ({ tieu_de: blankToNull(c.tieu_de), dieu_khoan_range: blankToNull(c.dieu_khoan_range), noi_dung: c.noi_dung })),
    });
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    setFormError(null);
    setRunning(true);

    // 1. Ghi van_ban (draft) + chunks
    const { data, error } = await createVanBanWithChunks(parsed.data.van_ban, parsed.data.chunks);
    if (error) {
      setRunning(false);
      return setFormError(handleError(error)); // 23505: trùng số hiệu · PT400: dữ liệu sai nghiệp vụ
    }
    const list: Progress[] = data.chunks.map((c) => ({
      chunk_id: c.id,
      label: `Chunk ${c.thu_tu}${c.dieu_khoan_range ? ` · ${c.dieu_khoan_range}` : ""}`,
      trang_thai: "cho_xu_ly",
    }));
    setProgress(list);

    // 2. Trích xuất tuần tự từng chunk
    await extractChunks(list.map((p) => p.chunk_id));
  }

  const setChunkProgress = (id: string, patch: Partial<Progress>) =>
    setProgress((ps) => ps!.map((x) => (x.chunk_id === id ? { ...x, ...patch } : x)));

  // Gọi /extract lần lượt (quota Groq). 429 → dừng cả hàng đợi: các chunk sau chắc chắn cũng bị từ chối.
  async function extractChunks(ids: string[]) {
    setRunning(true);
    setRateLimited(false);
    for (const id of ids) {
      setChunkProgress(id, { trang_thai: "dang_xu_ly", loi: undefined, khoa: false });
      try {
        const res = await postPipeline("/api/pipeline/extract", { chunk_id: id });
        // Không entity nào qua grounding → backend chuyển chunk thẳng sang hoan_tat
        setChunkProgress(id, { trang_thai: res.so_entity === 0 ? "hoan_tat" : "da_trich_xuat", res });
      } catch (err) {
        if (!(err instanceof PipelineError)) {
          setChunkProgress(id, { trang_thai: "loi", loi: "Lỗi không xác định" });
          continue;
        }
        const code = pipelineErrorCode(err);
        if (code === "AI_RATE_LIMIT") {
          setChunkProgress(id, { trang_thai: "cho_xu_ly", loi: describeError(toAppError(err)) });
          setRateLimited(true);
          break; // các chunk còn lại giữ "Chờ xử lý" để thử lại sau
        }
        if (code === "PT409") {
          // Chunk đang chạy hoặc đã có entity → không cho trích lại (hiện đúng lý do từ route)
          setChunkProgress(id, { trang_thai: "loi", loi: err.error, khoa: true });
          continue;
        }
        setChunkProgress(id, { trang_thai: "loi", loi: handleError(toAppError(err)) ?? err.error });
      }
    }
    setRunning(false);
  }

  // Thử lại: chỉ chunk chưa chạy / lỗi mà chưa bị khoá (route chỉ nhận chunk cho_xu_ly | loi chưa có entity)
  const retryIds = (progress ?? []).filter((p) => (p.trang_thai === "cho_xu_ly" || p.trang_thai === "loi") && !p.khoa).map((p) => p.chunk_id);

  if (progress) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden /> {running ? "Đang trích xuất…" : "Đã gửi trích xuất"}
          </CardTitle>
          <CardDescription>
            Văn bản <strong>{vb.so_hieu}</strong> được lưu ở trạng thái Bản nháp. Mỗi chunk gọi AI 1 lần, lần lượt. Kết quả là bản nháp chờ
            curator duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {progress.map((p) => (
              <li key={p.chunk_id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{p.label}</span>
                <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  {p.res && (
                    <span className="tabular-nums">
                      {p.res.so_entity} entity · {p.res.so_relationship} quan hệ · {p.res.so_canh_bao} cảnh báo
                    </span>
                  )}
                  {p.loi && <span className={p.khoa ? "text-muted-foreground" : "text-destructive"}>{p.loi}</span>}
                  <ChunkBadge status={p.trang_thai} />
                </span>
              </li>
            ))}
          </ul>
          {rateLimited && (
            <p className="mt-3 rounded-lg bg-status-sap-ap-dung-bg px-3 py-2 text-sm text-status-sap-ap-dung" role="status">
              Đã dừng vì AI tạm hết lượt (8K token/phút). Đợi khoảng 1 phút rồi bấm &quot;Thử lại&quot;.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          {!running && retryIds.length > 0 && (
            <Button variant="outline" onClick={() => extractChunks(retryIds)}>
              <RotateCcw /> Thử lại {retryIds.length} chunk
            </Button>
          )}
          <Link href="/duyet-ban-nhap" className={buttonVariants()} aria-disabled={running}>
            Sang Duyệt bản nháp
          </Link>
          <Link href="/nhat-ky" className={buttonVariants({ variant: "outline" })}>
            Xem nhật ký
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Thông tin văn bản</CardTitle>
          <CardDescription>Nguồn chính thống: vbpl.vn hoặc Công báo. Kiểm tra số hiệu và ngày hiệu lực trước khi lưu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField id="ten_van_ban" label="Tên văn bản" error={errors["van_ban.ten_van_ban"]}>
            <Input id="ten_van_ban" value={vb.ten_van_ban} onChange={(e) => updateVb({ ten_van_ban: e.target.value })} aria-invalid={!!errors["van_ban.ten_van_ban"]} />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="so_hieu" label="Số hiệu" hint="Không trùng với văn bản đã có" error={errors["van_ban.so_hieu"]}>
              <Input id="so_hieu" value={vb.so_hieu} onChange={(e) => updateVb({ so_hieu: e.target.value })} placeholder="109/2025/QH15" aria-invalid={!!errors["van_ban.so_hieu"]} />
            </FormField>
            <FormField label="Loại văn bản" error={errors["van_ban.loai_van_ban"]}>
              <Select items={LOAI_ITEMS} value={vb.loai_van_ban || null} onValueChange={(v) => updateVb({ loai_van_ban: ((v as string | null) ?? "") as LoaiVanBan | "" })}>
                <SelectTrigger className="w-full" aria-invalid={!!errors["van_ban.loai_van_ban"]}>
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
          </div>
          <FormField id="co_quan" label="Cơ quan ban hành" hint="Không bắt buộc">
            <Input id="co_quan" value={vb.co_quan_ban_hanh} onChange={(e) => updateVb({ co_quan_ban_hanh: e.target.value })} />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="ngay_ban_hanh" label="Ngày ban hành" hint="Không bắt buộc">
              <Input id="ngay_ban_hanh" type="date" value={vb.ngay_ban_hanh} onChange={(e) => updateVb({ ngay_ban_hanh: e.target.value })} />
            </FormField>
            <FormField id="ngay_hieu_luc" label="Ngày có hiệu lực" hint="Mặc định cho mọi entity của văn bản" error={errors["van_ban.ngay_hieu_luc"]}>
              <Input id="ngay_hieu_luc" type="date" value={vb.ngay_hieu_luc} onChange={(e) => updateVb({ ngay_hieu_luc: e.target.value })} aria-invalid={!!errors["van_ban.ngay_hieu_luc"]} />
            </FormField>
          </div>
          <FormField label="Lĩnh vực" hint="Chọn tất cả lĩnh vực văn bản điều chỉnh" error={errors["van_ban.domains"]}>
            <div className="flex gap-6">
              {KNOWN_DOMAINS.map((d) => (
                <Label key={d} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={vb.domains.includes(d)}
                    onCheckedChange={(on) => updateVb({ domains: on ? [...vb.domains, d] : vb.domains.filter((x) => x !== d) })}
                  />
                  {domainLabel(d)}
                </Label>
              ))}
            </div>
          </FormField>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Nội dung — chia thành chunk</CardTitle>
          <CardDescription>Mỗi chunk 1–2 điều, dán nguyên văn. Mỗi chunk là 1 lần gọi AI trích xuất.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {chunks.map((c, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Chunk {i + 1}</span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xoá chunk ${i + 1}`} disabled={chunks.length === 1} onClick={() => setChunks(chunks.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id={`c-${i}-range`} label="Điều khoản" hint="vd Điều 7–8 (không bắt buộc)">
                  <Input id={`c-${i}-range`} value={c.dieu_khoan_range} onChange={(e) => setChunk(i, { dieu_khoan_range: e.target.value })} />
                </FormField>
                <FormField id={`c-${i}-title`} label="Tiêu đề" hint="Không bắt buộc">
                  <Input id={`c-${i}-title`} value={c.tieu_de} onChange={(e) => setChunk(i, { tieu_de: e.target.value })} />
                </FormField>
              </div>
              <FormField
                id={`c-${i}-nd`}
                label="Nội dung nguyên văn"
                hint={`Mỗi điều bắt đầu bằng "Điều N." ở đầu dòng · ${c.noi_dung.length.toLocaleString("vi-VN")} ký tự`}
                error={errors[`chunks.${i}.noi_dung`]}
              >
                <Textarea
                  id={`c-${i}-nd`}
                  rows={7}
                  value={c.noi_dung}
                  onChange={(e) => setChunk(i, { noi_dung: e.target.value })}
                  placeholder={"Điều 7. …\n1. …\n2. …"}
                  className="font-mono text-sm"
                  aria-invalid={!!errors[`chunks.${i}.noi_dung`]}
                />
              </FormField>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setChunks([...chunks, EMPTY_CHUNK])}>
            <Plus /> Thêm chunk
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Kết quả AI luôn là bản nháp &quot;Chờ duyệt&quot; — không có gì vào kho cho tới khi curator duyệt.
          </p>
          {formError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={running}>
            <Sparkles /> Lưu & trích xuất {chunks.length} chunk
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
