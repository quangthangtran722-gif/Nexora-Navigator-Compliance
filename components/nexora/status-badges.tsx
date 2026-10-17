import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleDashed, CircleMinus, Clock, ShieldAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Badge trạng thái dùng chung cho cả 2 track — không tự vẽ badge trạng thái ở chỗ khác.
 * Màu lấy từ token --status-* / --duyet-* trong app/globals.css.
 *
 * Key ở đây là key HIỂN THỊ của UI, cố ý tách khỏi giá trị lưu trong DB:
 * khi schema v3 chốt, chỉ cần viết 1 hàm map giá trị DB → key này, badge không đổi.
 */

const base =
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3.5";

type BadgeConfig = { label: string; className: string; Icon: LucideIcon };

/* ---------- 1. Trạng thái áp dụng (kết quả match của rule engine) ---------- */

export type ApDungStatus = "ap_dung" | "sap_ap_dung" | "khong_ap_dung";

const apDungConfig: Record<ApDungStatus, BadgeConfig> = {
  ap_dung: { label: "Áp dụng", className: "bg-status-ap-dung-bg text-status-ap-dung", Icon: ShieldAlert },
  sap_ap_dung: { label: "Sắp áp dụng", className: "bg-status-sap-ap-dung-bg text-status-sap-ap-dung", Icon: Clock },
  khong_ap_dung: {
    label: "Không áp dụng",
    className: "bg-status-khong-ap-dung-bg text-status-khong-ap-dung",
    Icon: CircleMinus,
  },
};

/* ---------- 2. Trạng thái duyệt (entity, relationship, diagnostic) ---------- */

export type DuyetStatus = "cho_duyet" | "da_duyet" | "tu_choi";

const duyetConfig: Record<DuyetStatus, BadgeConfig> = {
  cho_duyet: { label: "Chờ duyệt", className: "bg-duyet-cho-bg text-duyet-cho", Icon: CircleDashed },
  da_duyet: { label: "Đã duyệt", className: "bg-duyet-da-bg text-duyet-da", Icon: CircleCheck },
  tu_choi: { label: "Từ chối", className: "bg-duyet-tu-choi-bg text-duyet-tu-choi", Icon: XCircle },
};

/* ---------- Khung chung ---------- */

function StatusPill({ config, className }: { config: BadgeConfig; className?: string }) {
  const { label, className: color, Icon } = config;
  return (
    <span className={cn(base, color, className)}>
      <Icon aria-hidden />
      {label}
    </span>
  );
}

export function ApDungBadge({ status, className }: { status: ApDungStatus; className?: string }) {
  return <StatusPill config={apDungConfig[status]} className={className} />;
}

export function DuyetBadge({ status, className }: { status: DuyetStatus; className?: string }) {
  return <StatusPill config={duyetConfig[status]} className={className} />;
}

/* ---------- 3. Mức ảnh hưởng tới phòng ban ---------- */

export type AnhHuongLevel = "primary" | "secondary";

export function AnhHuongBadge({ level, className }: { level: AnhHuongLevel; className?: string }) {
  return (
    <span
      className={cn(
        base,
        level === "primary"
          ? "bg-primary text-primary-foreground"
          : "border border-primary/40 bg-transparent text-primary",
        className,
      )}
    >
      {level === "primary" ? "Ảnh hưởng chính" : "Ảnh hưởng phụ"}
    </span>
  );
}
