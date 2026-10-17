import { Label } from "@/components/ui/label";

// Khung 1 trường form: nhãn + ô nhập + gợi ý/lỗi. Dùng chung cho mọi form.
export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// Khối xem trước payload — giúp backend đối chiếu data shape khi chưa có API
export function PayloadPreview({ data }: { data: unknown }) {
  return (
    <details className="rounded-lg border bg-muted/40 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-medium">Payload sẽ gửi lên API (JSON)</summary>
      <pre className="overflow-x-auto px-3 pb-3 font-mono leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
