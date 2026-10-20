import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Building,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleMinus,
  Clock,
  FilePen,
  Gauge,
  Gavel,
  ListChecks,
  Loader,
  Package,
  Percent,
  ShieldAlert,
  TicketPercent,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  LOAI_ENTITY_LABEL,
  TRANG_THAI_AP_DUNG_LABEL,
  TRANG_THAI_CHUNK_LABEL,
  TRANG_THAI_DUYET_LABEL,
  TRANG_THAI_VAN_BAN_LABEL,
} from "@/lib/labels";
import type { LoaiEntity, TrangThaiApDung, TrangThaiChunk, TrangThaiDuyet, TrangThaiRun, TrangThaiVanBan } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Badge trạng thái dùng chung cho cả 2 track — không tự vẽ badge trạng thái ở chỗ khác.
 * Nhãn lấy từ bảng *_LABEL của CONTRACT.md (lib/labels.ts); màu lấy từ token --status-* / --duyet-* (app/globals.css).
 */

const base =
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-none px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3.5";

type Style = { className: string; Icon: LucideIcon };

function Pill({ label, style, className }: { label: string; style: Style; className?: string }) {
  const { className: color, Icon } = style;
  return (
    <span className={cn(base, color, className)}>
      <Icon aria-hidden />
      {label}
    </span>
  );
}

/* ---------- 1. Trạng thái áp dụng — 4 trạng thái rule engine ---------- */

const apDungStyle: Record<TrangThaiApDung, Style> = {
  ap_dung: { className: "bg-status-ap-dung-bg text-status-ap-dung", Icon: ShieldAlert },
  sap_ap_dung: { className: "bg-status-sap-ap-dung-bg text-status-sap-ap-dung", Icon: Clock },
  khong_ap_dung: { className: "bg-status-khong-ap-dung-bg text-status-khong-ap-dung", Icon: CircleMinus },
  chua_du_thong_tin: { className: "bg-status-chua-du-tt-bg text-status-chua-du-tt", Icon: CircleHelp },
};

export function ApDungBadge({ status, className }: { status: TrangThaiApDung; className?: string }) {
  return <Pill label={TRANG_THAI_AP_DUNG_LABEL[status]} style={apDungStyle[status]} className={className} />;
}

/* ---------- 2. Trạng thái duyệt (entity, diagnostic) ---------- */

const duyetStyle: Record<TrangThaiDuyet, Style> = {
  cho_duyet: { className: "bg-duyet-cho-bg text-duyet-cho", Icon: CircleDashed },
  da_duyet: { className: "bg-duyet-da-bg text-duyet-da", Icon: CircleCheck },
  tu_choi: { className: "bg-duyet-tu-choi-bg text-duyet-tu-choi", Icon: XCircle },
};

export function DuyetBadge({ status, className }: { status: TrangThaiDuyet; className?: string }) {
  return <Pill label={TRANG_THAI_DUYET_LABEL[status]} style={duyetStyle[status]} className={className} />;
}

/* ---------- 3. Trạng thái chunk / lần chạy pipeline ---------- */

const chunkStyle: Record<TrangThaiChunk, Style> = {
  cho_xu_ly: { className: "bg-muted text-muted-foreground", Icon: CircleDashed },
  dang_xu_ly: { className: "bg-duyet-cho-bg text-duyet-cho", Icon: Loader },
  da_trich_xuat: { className: "bg-status-sap-ap-dung-bg text-status-sap-ap-dung", Icon: Clock },
  hoan_tat: { className: "bg-duyet-da-bg text-duyet-da", Icon: CircleCheck },
  loi: { className: "bg-duyet-tu-choi-bg text-duyet-tu-choi", Icon: TriangleAlert },
};

export function ChunkBadge({ status, className }: { status: TrangThaiChunk; className?: string }) {
  return <Pill label={TRANG_THAI_CHUNK_LABEL[status]} style={chunkStyle[status]} className={className} />;
}

// CONTRACT không có *_LABEL cho TrangThaiRun → nhãn phía UI
export const RUN_LABEL: Record<TrangThaiRun, string> = { cho_xu_ly: "Chờ xử lý", dang_xu_ly: "Đang chạy", hoan_tat: "Hoàn tất", loi: "Lỗi" };

const runStyle: Record<TrangThaiRun, Style> = {
  cho_xu_ly: chunkStyle.cho_xu_ly,
  dang_xu_ly: chunkStyle.dang_xu_ly,
  hoan_tat: chunkStyle.hoan_tat,
  loi: chunkStyle.loi,
};

export function RunBadge({ status, className }: { status: TrangThaiRun; className?: string }) {
  return <Pill label={RUN_LABEL[status]} style={runStyle[status]} className={className} />;
}

/* ---------- 4. Loại entity (nhãn phân loại → tông trung tính) ---------- */

const loaiIcon: Record<LoaiEntity, LucideIcon> = {
  chu_the: Building,
  doi_tuong: Package,
  hanh_vi: ListChecks,
  che_tai: Gavel,
  dieu_kien: Ban,
  muc_thue: Percent,
  thoi_han: CalendarClock,
  mien_giam: TicketPercent,
  nguong: Gauge,
};

export function LoaiEntityBadge({ loai, className }: { loai: LoaiEntity; className?: string }) {
  return (
    <Pill
      label={LOAI_ENTITY_LABEL[loai]}
      style={{ className: "", Icon: loaiIcon[loai] }}
      className={cn("border bg-muted/60 text-foreground/80", className)}
    />
  );
}

/* ---------- 5. Phòng ban chính / phụ của 1 entity (primary_departments / secondary_departments) ---------- */

export function AnhHuongBadge({ level, className }: { level: "primary" | "secondary"; className?: string }) {
  return (
    <span
      className={cn(
        base,
        level === "primary" ? "bg-primary text-primary-foreground" : "border border-primary/40 bg-transparent text-primary",
        className,
      )}
    >
      {level === "primary" ? "Chính" : "Phụ"}
    </span>
  );
}

/* ---------- Trạng thái văn bản (draft → active → replaced) ---------- */

const vanBanStyle: Record<TrangThaiVanBan, Style> = {
  draft: { className: "bg-duyet-cho-bg text-duyet-cho", Icon: FilePen },
  active: { className: "bg-duyet-da-bg text-duyet-da", Icon: CircleCheck },
  replaced: { className: "bg-status-khong-ap-dung-bg text-status-khong-ap-dung", Icon: CircleMinus },
};

export function VanBanBadge({ status, className }: { status: TrangThaiVanBan; className?: string }) {
  return <Pill label={TRANG_THAI_VAN_BAN_LABEL[status]} style={vanBanStyle[status]} className={className} />;
}
