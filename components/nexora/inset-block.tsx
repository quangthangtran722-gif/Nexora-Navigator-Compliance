import { cn } from "@/lib/utils";

/*
 * Khối trích dẫn / nội dung (palette v3 mục 9.6): nền gold-50 (dark #26211A = --accent), viền trái 3px #CFAE68.
 * Dùng cho: đầu mục checklist, trích nguyên văn điều luật, căn cứ pháp lý, đoạn được highlight trong văn bản gốc.
 */
export function InsetBlock({
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  as?: "div" | "ul" | "blockquote" | "p";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("border-l-[3px] border-gold-edge bg-accent px-3 py-2.5 text-sm", className)} {...rest}>
      {children}
    </Tag>
  );
}
