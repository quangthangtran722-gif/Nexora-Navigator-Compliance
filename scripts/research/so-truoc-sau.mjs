// So hai lượt duyệt cùng 70 đề xuất LLM: màn cũ (truoc) vs màn mới U1a (sau). Chỉ đọc 4 file kết quả của nhip-duyet.mjs và
// so-sanh-de-xuat.mjs; không đọc DB. Khung phân tích: research/bao-cao/KHUNG_TRUOC_SAU.md. Kiểm định và tiêu chí cố định
// TRƯỚC khi có số liệu sau; kết quả chỉ mô tả có / không có khác biệt, không suy diễn nhân quả.
// Dùng: npm run do:sau && node scripts/research/so-truoc-sau.mjs   → research/sau/TRUOC_SAU.md
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mannWhitney, thongKe, fisher, cohenKappa, docTruoc } from "./do-duyet-lib.mjs";

const doc = (p) => JSON.parse(readFileSync(`research/sau/${p}.json`, "utf8"));
const nd = { truoc: doc("nhip-duyet-truoc"), sau: doc("nhip-duyet-sau") };
const ss = { truoc: doc("so-sanh-de-xuat-truoc"), sau: doc("so-sanh-de-xuat-sau") };

const KQ = (p) => (p < 0.05 ? "có khác biệt (p < 0,05)" : "không có khác biệt (p ≥ 0,05)");
const pc = (x, n) => (n ? `${x}/${n} (${((100 * x) / n).toFixed(1)}%)` : "—");
const s1 = (s) => (s.n ? `n=${s.n}, trung vị ${s.trung_vi.toFixed(1)} giây, p90 ${s.p90.toFixed(1)} giây` : "n=0");

const dau = []; // kết quả trung tâm (bảng chéo + kappa), in trước M1
const dong = [];
const chan = [];
if (ss.sau.tong.chua_duyet) chan.push(`lượt sau còn ${ss.sau.tong.chua_duyet} entity chưa duyệt`);
for (const k of ["truoc", "sau"]) if (ss[k].tong.chua_gan_nhan) chan.push(`lượt ${k} còn ${ss[k].tong.chua_gan_nhan} entity bị sửa chưa có nhãn người`);

// M1 — thời gian mỗi entity
const g = { truoc: nd.truoc.khoang.map((k) => k.giay), sau: nd.sau.khoang.map((k) => k.giay) };
const mw = mannWhitney(g.truoc, g.sau);
dong.push("## M1 — Thời gian duyệt mỗi entity", "", `- Trước: ${s1(thongKe(g.truoc))}`, `- Sau: ${s1(thongKe(g.sau))}`,
  mw ? `- Mann–Whitney U hai phía: U = ${mw.U}, p = ${mw.p.toFixed(3)} → **${KQ(mw.p)}**${mw.p < 0.05 ? ` — trung vị lượt sau ${thongKe(g.sau).trung_vi > thongKe(g.truoc).trung_vi ? "cao" : "thấp"} hơn` : ""}` : "- Không kiểm định: lượt sau chưa đủ 5 khoảng đo", "");
// M1 tách theo thao tác (thêm 18/11, sau khi có số): chỉ mô tả, không kiểm định — tiêu chí đặt trước chỉ có M1 gộp
const TEN_TT = { tu_choi: "Từ chối", duyet: "Duyệt (màn cũ: không trường bắt buộc)", duyet_gan_ma: "Duyệt, gán mã điều kiện (chủ thể)",
  duyet_chon_pham_vi: "Duyệt, chỉ chọn phạm vi (nghĩa vụ)", duyet_khong_truong: "Duyệt, không trường bắt buộc (đối tượng, thời hạn)" };
const theoTT = (k) => { const m = {}; for (const x of nd[k].khoang) (m[x.thao_tac ?? "(chưa gắn)"] ??= []).push(x.giay); return m; };
const tt = { truoc: theoTT("truoc"), sau: theoTT("sau") };
dong.push("### M1 tách theo thao tác trước khi bấm (mô tả, thêm sau khi có số, không kiểm định)", "",
  "| Thao tác | Trước | Sau |", "|---|---|---|");
for (const k of Object.keys(TEN_TT)) if (tt.truoc[k] || tt.sau[k])
  dong.push(`| ${TEN_TT[k]} | ${tt.truoc[k] ? s1(thongKe(tt.truoc[k])) : "—"} | ${tt.sau[k] ? s1(thongKe(tt.sau[k])) : "—"} |`);
const duyetSau = Object.entries(tt.sau).filter(([k]) => k.startsWith("duyet")).flatMap(([, v]) => v);
if (duyetSau.length) dong.push(`| Duyệt (gộp) | ${tt.truoc.duyet ? s1(thongKe(tt.truoc.duyet)) : "—"} | ${s1(thongKe(duyetSau))} |`);
dong.push("", "Khoảng gán cho entity của dòng duyệt kết thúc khoảng; gồm cả thời gian đọc entity đó và mọi việc làm giữa hai lần bấm.", "");

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

// Từ chối từng entity giữa hai lượt — chỉ mô tả, KHÔNG kiểm định (không có trong §3 khung; quy tắc từ chối lượt sau chốt
// giữa lượt, KHUNG §8). Chỉ chạy sau khi lượt sau duyệt xong (điều kiện làm mù).
if (!ss.sau.tong.chua_duyet) {
  const tc = (d) => d?.lop === "tu_choi";
  const nhomSau = existsSync("research/sau/phan-loai-sau.json")
    ? new Map(doc("phan-loai-sau").tu_choi_ds.map((x) => [x.id, x.nhom])) : new Map();
  const o = { TT: [], TD: [], DT: [], DD: [] };
  for (const [id, d] of A) o[(tc(d) ? "T" : "D") + (tc(B.get(id)) ? "T" : "D")].push(d);
  // Ghi chú từ chối lượt trước (bản chụp prod; không có thì bỏ qua)
  let ghiTruoc = "—";
  if (existsSync("research/baseline/raw/approvals.json")) {
    const { entities, approvals } = docTruoc(new Set(A.keys()));
    const tcTruoc = approvals.filter((a) => a.quyet_dinh === "tu_choi" && A.has(a.entity_id));
    // Entity ở trạng thái từ chối mà không có dòng approvals 'tu_choi' nào: trạng thái đổi ngoài hàm duyệt, không vết
    const khongVet = entities.filter((e) => e.trang_thai_duyet === "tu_choi"
      && !approvals.some((a) => a.entity_id === e.id && a.quyet_dinh === "tu_choi"));
    ghiTruoc = `${tcTruoc.filter((a) => a.ghi_chu && a.ghi_chu.trim()).length}/${tcTruoc.length} dòng từ chối` +
      (khongVet.length ? ` (thêm ${khongVet.length} entity trạng thái từ chối mà nhật ký chỉ có dòng duyệt — nhật ký ghi sai, CAN_THIEP_KHONG_VET §0: ${khongVet.map((e) => `Đ${e.so_dieu} "${e.ten_entity}"`).join(", ")})` : "");
  }
  const ghiSau = existsSync("research/sau/phan-loai-sau.json") ? doc("phan-loai-sau").tu_choi_ds : [];
  const dongDs = (ds) => ds.map((d) => `| Đ${d.so_dieu} | ${d.loai_goc} | ${d.goc.ten_entity} | ${nhomSau.get(d.id) ?? ""} |`);
  const kp = cohenKappa(o.DD.length, o.DT.length, o.TD.length, o.TT.length);
  const f2 = (x) => x.toFixed(2).replace(".", ",");
  // Độ nhạy (thêm sau khi thấy số): bỏ entity lượt sau từ chối theo nhóm NN-CT — nhóm có quy tắc viết sẵn ở lượt sau
  const boNNCT = (ds) => ds.filter((d) => nhomSau.get(d.id) !== "NN-CT");
  const kp2 = cohenKappa(boNNCT(o.DD).length, boNNCT(o.DT).length, boNNCT(o.TD).length, boNNCT(o.TT).length);
  const dao = o.DT.length + o.TD.length;
  dau.push("## Kết quả trung tâm — hai lượt duyệt cùng 70 đề xuất có ra cùng quyết định không", "",
    "| | Sau: duyệt | Sau: từ chối | Cộng |", "|---|---|---|---|",
    `| **Trước: duyệt** | ${o.DD.length} | ${o.DT.length} | ${o.DD.length + o.DT.length} |`,
    `| **Trước: từ chối** | ${o.TD.length} | ${o.TT.length} | ${o.TD.length + o.TT.length} |`,
    `| **Cộng** | ${o.DD.length + o.TD.length} | ${o.DT.length + o.TT.length} | ${kp.n} |`, "",
    `- Đảo quyết định: ${pc(dao, kp.n)}. Khớp quan sát p_o = ${f2(kp.po)}; khớp do ngẫu nhiên p_e = ${f2(kp.pe)}.`,
    `- **Cohen's kappa = ${f2(kp.kappa)}**, sai số chuẩn ${f2(kp.se)}, khoảng tin cậy 95% ${f2(kp.ci95[0])}–${f2(kp.ci95[1])} (sai số chuẩn tiệm cận Fleiss–Cohen–Everitt 1969).`,
    `- Thư viện lượt trước có ${o.DD.length + o.DT.length} entity đã duyệt; ${o.DT.length} (${((100 * o.DT.length) / (o.DD.length + o.DT.length)).toFixed(1)}%) bị lượt sau từ chối. Thư viện lượt sau có ${o.DD.length + o.TD.length}; ${o.TD.length} (${((100 * o.TD.length) / (o.DD.length + o.TD.length)).toFixed(1)}%) lượt trước đã từ chối.`,
    `- Độ nhạy (thêm sau khi thấy số, không phải tiêu chí đặt trước): bỏ ${kp.n - kp2.n} entity lượt sau từ chối theo nhóm NN-CT → n = ${kp2.n}, kappa = ${f2(kp2.kappa)} (95% ${f2(kp2.ci95[0])}–${f2(kp2.ci95[1])}).`,
    "- Hai lượt không cùng điều kiện (người duyệt có thể khác, màn hình khác, lượt sau có quy tắc từ chối viết sẵn). Chỉ báo, không phải thí nghiệm có đối chứng.", "");
  dong.push("## Từ chối — từng entity giữa hai lượt (chi tiết)", "",
    "| | Sau: duyệt | Sau: từ chối |", "|---|---|---|",
    `| **Trước: duyệt** | ${o.DD.length} | ${o.DT.length} |`, `| **Trước: từ chối** | ${o.TD.length} | ${o.TT.length} |`, "",
    `- Từ chối có ghi chú: trước ${ghiTruoc}; sau ${ghiSau.filter((x) => x.nhom_ghi !== "(không ghi)").length}/${ghiSau.length}.`,
    "- Quy tắc từ chối lượt sau (nhóm mã) chốt giữa lượt, không có ở lượt trước (KHUNG §8).", "",
    `### Trước duyệt → sau từ chối (${o.DT.length})`, "", "| Điều | Loại | Đề xuất LLM | Mã nhóm sau |", "|---|---|---|---|", ...dongDs(o.DT), "",
    `### Trước từ chối → sau duyệt (${o.TD.length})`, "", "| Điều | Loại | Đề xuất LLM | |", "|---|---|---|---|", ...dongDs(o.TD), "");
}

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
  chan.length ? `\n**CHƯA ĐỦ ĐỂ KẾT LUẬN:** ${chan.join("; ")}.\n` : "", "Mọi kết luận dưới đây chỉ mô tả có / không có khác biệt giữa hai lượt; không suy ra nguyên nhân (xem giới hạn trong khung).", "", ...dau, ...dong].join("\n");
writeFileSync("research/sau/TRUOC_SAU.md", md);
console.log(md);
