// Đầu trang (v3 mục 5): tiêu đề 22–24px/700, mô tả 14px muted. Top bar chỉ nhắc tên trang, h1 nằm ở đây.
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-[22px] leading-tight font-bold">{title}</h1>
      {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
