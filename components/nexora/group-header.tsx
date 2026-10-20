import { cn } from "@/lib/utils";

/*
 * Dải đầu nhóm (palette v4 mục 9.2) — chia trang thành NHÓM LỚN. Mỗi màn tối đa 1 cấp, không lồng.
 * Chỉ đọc màu từ biến --group-* / --alert-chip-*: bản sáng = khối espresso đặc; bản tối = nền ánh vàng nhẹ + viền vàng.
 * Nhóm rỗng dùng EmptyGroupLine, không hiện dải.
 */

export type GroupCount = {
  label: string; // vd "chờ duyệt"
  n: number;
  tone?: "action" | "neutral"; // action = số việc cần làm (chip đỏ đặc), neutral = số khác
};

export function GroupHeader({
  id,
  title,
  subtitle,
  counts = [],
  children,
  className,
}: {
  id?: string; // id của tiêu đề, dùng cho aria-labelledby của section
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  counts?: GroupCount[];
  children?: React.ReactNode; // nội dung thêm bên phải (hiếm dùng)
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-l-4 border-group-border border-l-group-edge bg-group px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={id} className="text-base font-bold text-group-title">
          {title}
        </h2>
        {subtitle && <p className="truncate text-xs text-group-sub">{subtitle}</p>}
      </div>
      {(counts.length > 0 || children) && (
        <div className="flex flex-wrap items-center gap-2">
          {counts.map((c) => (
            <span
              key={c.label}
              className={cn(
                "px-2 py-0.5 text-xs font-medium tabular-nums",
                c.tone === "action" ? "bg-alert-chip text-alert-chip-foreground" : "bg-group-chip text-group-chip-foreground",
              )}
            >
              {c.n} {c.label}
            </span>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}

// Nhóm rỗng: 1 dòng nền card viền border, chữ muted — "Tên nhóm · chưa có …"
export function EmptyGroupLine({ title, text }: { title: React.ReactNode; text: string }) {
  return (
    <p className="border bg-card px-4 py-2.5 text-xs text-muted-foreground">
      <span className="font-medium">{title}</span> · {text}
    </p>
  );
}
