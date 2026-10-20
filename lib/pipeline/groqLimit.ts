// Groq free tier từ chối NGAY request có input (tính cả JSON schema của structured output) + maxOutputTokens
// > 8.000 token/phút ("Request too large ... Requested N") — chunk dài mà để trần 4.600 là bị chặn.
// Tính trần output mới = hạ đúng phần vượt Groq báo; null = không phải lỗi này / chunk quá dài, phải tách nhỏ.
export const GROQ_TPM = 8000;
const MIN_OUTPUT_TOKENS = 1500;

export function maxOutputTokensSauTuChoi(err: unknown, current: number): number | null {
  const message = err instanceof Error ? err.message : String(err);
  const requested = /Request too large[\s\S]*?Requested (\d+)/.exec(message)?.[1];
  if (!requested) return null;
  const next = current - (Number(requested) - GROQ_TPM) - 100;
  return next >= MIN_OUTPUT_TOKENS && next < current ? next : null;
}
