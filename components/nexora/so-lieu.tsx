// Số trong bảng số liệu (duyệt đợt 3): 0 hiện "–" màu --ink-faint (#98A2B3, tối #5C5650) cho đỡ nhiễu, số khác 0 giữ nguyên.
// sr-only đọc "0" để trình đọc màn hình không đọc nhầm dấu gạch.
export function SoLieu({ n }: { n: number }) {
  if (n !== 0) return <>{n}</>;
  return (
    <>
      <span className="text-ink-faint" aria-hidden>
        –
      </span>
      <span className="sr-only">0</span>
    </>
  );
}
