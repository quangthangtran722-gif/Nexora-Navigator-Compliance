"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { LoiTruong, OnboardKetQuaMuc, OnboardResponse } from "@/lib/onboard";
import type { SlugPhongBan } from "@/lib/types";

/*
 * Gọi API onboarding (docs/CONTRACT.md §8) bằng JWT người dùng — KHÔNG dùng service role key.
 *  POST /api/onboard        đăng ký doanh nghiệp mới + quét ngược (201 | 202 | 400 | 409)
 *  GET  /api/onboard/{id}   đọc lần quét gần nhất (200 | 202 đang quét)
 *  POST /api/onboard/{id}   quét lại (200) — dùng sau khi sửa hồ sơ, sau "loi_quet" / "can_lam_moi_phien"
 * Tài khoản mới: JWT cấp TRƯỚC khi gắn customer_id → phải refreshSession() trước mọi lần đọc dữ liệu dưới RLS.
 */

export type OnboardKetQua = OnboardResponse & { run_id: string };
export type { OnboardKetQuaMuc };

export type OnboardBody = {
  ten_cong_ty: string;
  ma_so_thue: string | null;
  nganh: string | null;
  quy_mo: "nho" | "vua" | "lon" | null;
  domains: string[];
  thuoc_tinh: Record<string, boolean | number | string | string[] | null>;
  phong_ban: { ten_phong_ban: string; slug_phong_ban?: SlugPhongBan; email_head: string | null }[];
};

type Cho = { khach_hang_id: string; trang_thai: "dang_quet" | "chua_quet" | "loi_quet" | "can_lam_moi_phien"; error?: string };

// Lỗi từ API onboarding; chiTiet = danh sách trường sai (400/409) để hiện ngay tại từng ô
export class OnboardError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public chiTiet: LoiTruong[] = [],
  ) {
    super(message);
  }
}

const POLL_MS = 2000;
const POLL_TOI_DA = 30; // ~60 giây (route chạy tối đa 60 giây)

async function goi(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new OnboardError(401, "Chưa đăng nhập.", "PT401");
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new OnboardError(0, "Không kết nối được tới máy chủ.");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (json ?? {}) as { error?: string; code?: string; chi_tiet?: LoiTruong[] };
    throw new OnboardError(res.status, e.error ?? `Lỗi ${res.status}`, e.code, Array.isArray(e.chi_tiet) ? e.chi_tiet : []);
  }
  return { status: res.status, json };
}

const laKetQua = (j: unknown): j is OnboardKetQua => !!j && typeof j === "object" && "theo_phong_ban" in j;

// Làm mới JWT để có customer_id vừa gắn (bắt buộc — thiếu bước này màn kết quả trống mà không báo lỗi)
export async function lamMoiPhien(): Promise<void> {
  const { error } = await getSupabase().auth.refreshSession();
  if (error) throw new OnboardError(401, "Không làm mới được phiên đăng nhập. Hãy đăng nhập lại.", "PT401");
}

export async function quetLaiDoanhNghiep(id: string): Promise<OnboardKetQua> {
  const { json } = await goi("POST", `/api/onboard/${id}`);
  if (!laKetQua(json)) throw new OnboardError(500, "Kết quả đối chiếu không đúng định dạng.");
  return json;
}

// 202 "dang_quet": hỏi lại tới khi xong; quá lâu thì tự quét lại 1 lần
async function choQuetXong(id: string): Promise<OnboardKetQua> {
  for (let i = 0; i < POLL_TOI_DA; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const { status, json } = await goi("GET", `/api/onboard/${id}`);
    if (status === 200 && laKetQua(json)) return json;
  }
  return quetLaiDoanhNghiep(id);
}

export async function dangKyDoanhNghiep(body: OnboardBody): Promise<OnboardKetQua> {
  const { status, json } = await goi("POST", "/api/onboard", body);
  // Doanh nghiệp đã tạo (201 hoặc 202) → làm mới phiên trước khi đọc / quét tiếp dưới RLS
  await lamMoiPhien();
  if (status === 201 && laKetQua(json)) return json;
  const cho = json as Cho;
  if (cho.trang_thai === "dang_quet") return choQuetXong(cho.khach_hang_id);
  // "can_lam_moi_phien" (server thiếu service role key) hoặc "loi_quet" → quét lại bằng phiên vừa làm mới
  return quetLaiDoanhNghiep(cho.khach_hang_id);
}
