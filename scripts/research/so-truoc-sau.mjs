// So hai lượt duyệt cùng 70 đề xuất LLM: màn cũ (truoc) vs màn mới U1a (sau). Chỉ đọc 4 file kết quả của nhip-duyet.mjs và
// so-sanh-de-xuat.mjs; không đọc DB. Khung phân tích: research/bao-cao/KHUNG_TRUOC_SAU.md. Kiểm định và tiêu chí cố định
// TRƯỚC khi có số liệu sau; kết quả chỉ mô tả có / không có khác biệt, không suy diễn nhân quả.
// Dùng: npm run do:sau && node scripts/research/so-truoc-sau.mjs   → research/sau/TRUOC_SAU.md
import { readFileSync, writeFileSync } from "node:fs";
import { mannWhitney, thongKe, fisher } from "./do-duyet-lib.mjs";

const doc = (p) => JSON.parse(readFileSync(`research/sau/${p}.json`, "utf8"));
const nd = { truoc: doc("nhip-duyet-truoc"), sau: doc("nhip-duyet-sau") };
const ss = { truoc: doc("so-sanh-de-xuat-truoc"), sau: doc("so-sanh-de-xuat-sau") };

const KQ = (p) => (p < 0.05 ? "có khác biệt (p < 0,05)" : "không có khác biệt (p ≥ 0,05)");
const pc = (x, n) => (n ? `${x}/${n} (${((100 * x) / n).toFixed(1)}%)` : "—");
const s1 = (s) => (s.n ? `n=${s.n}, trung vị ${s.trung_vi.toFixed(1)} giây, p90 ${s.p90.toFixed(1)} giây` : "n=0");

const dong = [];
const chan = [];
if (ss.sau.tong.chua_duyet) chan.push(`lượt sau còn ${ss.sau.tong.chua_duyet} entity chưa duyệt`);
for (const k of ["truoc", "sau"]) if (ss[k].tong.chua_gan_nhan) chan.push(`lượt ${k} còn ${ss[k].tong.chua_gan_nhan} entity bị sửa chưa có nhãn người`);

// M1 — thời gian mỗi entity
const g = { truoc: nd.truoc.khoang.map((k) => k.giay), sau: nd.sau.khoang.map((k) => k.giay) };
const mw = mannWhitney(g.truoc, g.sau);
dong.push("## M1 — Thời gian duyệt mỗi entity", "", `- Trước: ${s1(thongKe(g.truoc))}`, `- Sau: ${s1(thongKe(g.sau))}`,
  mw ? `- Mann–Whitney U hai phía: U = ${mw.U}, p = ${mw.p.toFixed(3)} → **${KQ(mw.p)}**${mw.p < 0.05 ? ` — trung vị lượt sau ${thongKe(g.sau).trung_vi > thongKe(g.truoc).trung_vi ? "cao" : "thấp"} hơn` : ""}` : "- Không kiểm định: lượt sau chưa đủ 5 khoảng đo", "");

// M2 — tỉ lệ viết lại trên entity đã duyệt
const daDuyet = (t) => t.y_nguyen + t.sua_nho + t.doi_nghia + t.chua_gan_nhan;
const T = { truoc: ss.truoc.tong, sau: ss.sau.tong };
const biSua = (t) => t.sua_nho + t.doi_nghia + t.chua_gan_nhan;
const fSua = fisher(biSua(T.truoc), T.truoc.y_nguyen, biSua(T.sau), T.sau.y_nguyen);
dong.push("## M2 — Viết lại đề xuất khi duyệt (trên entity đã duyệt)", "",
  "| | Trước | Sau |", "|---|---|---|",
  `| Đã duyệt | ${daDuyet(T.truoc)} | ${daDuyet(T.sau)} |`,
  `| Bị sửa (mọi mức) | ${pc(biSua(T.truoc), daDuyet(T.truoc))} | ${pc(biSua(T.sau), daDuyet(T.sau))} |`,
  `| — viết lại đổi nghĩa | ${pc(T.truoc.doi_nghia, daDuyet(T.truoc))} | ${pc(T.sau.doi_nghia, daDuyet(T.sau))} |`,
  `| Từ chối (trên 70) | ${pc(T.truoc.tu_choi, 70)} | ${pc(T.sau.tu_choi, 70)} |`, "",
  daDuyet(T.truoc) && daDuyet(T.sau)
    ? `- Fisher chính xác hai phía, bị sửa / không sửa: p = ${fSua.toFixed(3)} → **${KQ(fSua)}**`
    : "- Bị sửa / không sửa: chưa kiểm định — một lượt chưa có entity đã duyệt");
if (!daDuyet(T.truoc) || !daDuyet(T.sau)) dong.push("- Đổi nghĩa: chưa kiểm định — một lượt chưa có entity đã duyệt");
else if (!T.truoc.chua_gan_nhan && !T.sau.chua_gan_nhan) {
  const fDn = fisher(T.truoc.doi_nghia, daDuyet(T.truoc) - T.truoc.doi_nghia, T.sau.doi_nghia, daDuyet(T.sau) - T.sau.doi_nghia);
  dong.push(`- Fisher chính xác hai phía, đổi nghĩa / còn lại: p = ${fDn.toFixed(3)} → **${KQ(fDn)}**`);
} else dong.push("- Đổi nghĩa: chưa kiểm định — còn entity bị sửa chưa có nhãn người");
dong.push("");

// M3 — Điều 8 từng entity
const theoId = (k) => new Map(ss[k].dong.map((d) => [d.id, d]));
const A = theoId("truoc"), B = theoId("sau");
dong.push("## M3 — 13 entity Điều 8 (hành vi bị nghiêm cấm)", "", "| Đề xuất LLM | Trước | Sau | Sau duyệt (nếu sửa) |", "|---|---|---|---|");
for (const [id, d] of A) if (d.so_dieu === 8) dong.push(`| ${d.goc.ten_entity} | ${d.lop} | ${B.get(id)?.lop ?? "—"} | ${B.get(id)?.hien?.ten_entity ?? ""} |`);
dong.push("");

// M4 — trong mỗi lượt: thời gian nhóm bị sửa vs không sửa (đã tính ở so-sanh-de-xuat)
dong.push("## M4 — Trong từng lượt: thời gian nhóm bị sửa vs không sửa", "");
for (const k of ["truoc", "sau"]) { const t = ss[k].thoi_gian; dong.push(`- ${k}: không sửa ${s1(t.khong_sua)}; bị sửa ${s1(t.bi_sua)} → ${t.kiem_dinh.ket_luan}`); }
dong.push("");

// M5 — đi đường tắt: duyệt cả chunk
const tat = (k) => pc(nd[k].bo_cung_thoi_diem, nd[k].so_dong_approvals_entity);
dong.push("## M5 — Khoảng bị bỏ vì cùng thời điểm (duyệt cả chunk)", "", `- Trước: ${tat("truoc")} · Sau: ${tat("sau")}`, "");

// M6 — trường bắt buộc mới (chỉ lượt sau)
dong.push("## M6 — Phân bố mã C0–C7 (lượt sau; màn cũ không có mã)", "");
for (const [m, s] of Object.entries(nd.sau.theo_ma_dieu_kien ?? {})) dong.push(`- ${m}: ${s1(s)}`);

const md = ["# Trước / sau — cùng 70 đề xuất LLM, hai màn duyệt", "", `Chạy: ${new Date().toISOString()}. Khung: \`research/bao-cao/KHUNG_TRUOC_SAU.md\`.`,
  chan.length ? `\n**CHƯA ĐỦ ĐỂ KẾT LUẬN:** ${chan.join("; ")}.\n` : "", "Mọi kết luận dưới đây chỉ mô tả có / không có khác biệt giữa hai lượt; không suy ra nguyên nhân (xem giới hạn trong khung).", "", ...dong].join("\n");
writeFileSync("research/sau/TRUOC_SAU.md", md);
console.log(md);
