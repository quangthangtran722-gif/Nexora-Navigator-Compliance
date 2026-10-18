import { FlaskConical } from "lucide-react";

// Nhãn cảnh báo dữ liệu mẫu — gắn ở mọi màn hình đang dùng lib/mock
export function MockNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        Dữ liệu mẫu để dựng giao diện. Nội dung điều khoản là câu minh hoạ, không phải trích dẫn văn bản pháp luật thật.
        Các nút thao tác chỉ đổi trạng thái trên màn hình, chưa lưu.
      </span>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
