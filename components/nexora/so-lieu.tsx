// Số trong bảng số liệu (duyệt đợt 3): 0 hiện "–" màu #98A2B3 cho đỡ nhiễu, số khác 0 giữ nguyên.
// sr-only đọc "0" để trình đọc màn hình không đọc nhầm dấu gạch.
export function SoLieu({ n }: { n: number }) {
  if (n !== 0) return <>{n}</>;
  return (
    <>
      <span className="text-[#98A2B3]" aria-hidden>
        –
      </span>
      <span className="sr-only">0</span>
    </>
  );
}
