import { Construction } from "lucide-react";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

// Khung giữ chỗ cho màn hình chưa dựng — nội dung thật chờ types/mock theo schema v3
export function PagePlaceholder({ note }: { note?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
      <Construction className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">Màn hình đang chờ dựng</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {note ?? "Sẽ dựng sau khi backend chốt field của schema v3."}
      </p>
    </div>
  );
}
