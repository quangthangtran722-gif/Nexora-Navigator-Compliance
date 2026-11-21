// Đối chiếu bộ lọc phân luồng (phan-luong-v1) với quyết định thật 17/11 trên 70 entity Luật 108. CHỈ ĐỌC DB MIS.
// Cách đo chốt trước khi chạy: research/bao-cao/PHAN_LUONG.md §3. Đây là đo TRONG MẪU (§4).
// Dùng: node scripts/research/kiem-phan-luong.mjs → research/sau/phan-luong-108.{json,md}
import { readFileSync, writeFileSync } from "node:fs";
import { truyVanMis, docDeXuat } from "./do-duyet-lib.mjs";
import { phanLuong, phanLuongLuotHai, PHAN_LUONG_VERSION } from "../../lib/pipeline/phanLuong.ts";

const NHOM_CO_HOC = ["NN-CT", "NN-NV", "GQ", "DV"];
const TEN_CHUNG = new Set(["luật này", "điều này", "khoản này", "văn bản này", "nghị định này", "thông tư này"]);
const TEN_K2A = "Đăng ký, quản lý, sử dụng chứng từ điện tử"; // Đ27 k2a — từ chối nhầm 17/11

const deXuat = docDeXuat();
const ids = new Set(deXuat.map((e) => e.id));
const goc = new Map(deXuat.map((e) => [e.id, e]));
const d = truyVanMis(`select json_build_object(
  'e', (select coalesce(json_agg(json_build_object('id', e.id, 'so_dieu', e.so_dieu, 'dieu_khoan', e.dieu_khoan,
     'noi_dung_goc', e.noi_dung_goc, 'trang_thai_duyet', e.trang_thai_duyet, 'ten_dieu', c.tieu_de)), '[]')
     from entities e left join van_ban_chunks c on c.id = e.chunk_id),
  'r', (select coalesce(json_agg(json_build_object('source_entity_id', source_entity_id, 'target_entity_id', target_entity_id,
     'loai_relationship', loai_relationship)), '[]') from entity_relationships))`);
const ents = d.e.filter((e) => ids.has(e.id)).map((e) => ({ ...e, ten_entity: goc.get(e.id).ten_entity, loai_entity: goc.get(e.id).loai_entity }));
if (ents.length !== 70 || ents.some((e) => e.trang_thai_duyet === "cho_duyet")) throw new Error("cần đủ 70 entity đã xử lý");

const nhom = new Map(JSON.parse(readFileSync("research/sau/phan-loai-sau.json", "utf8")).tu_choi_ds.map((x) => [x.id, x.nhom]));
const k2a = ents.filter((e) => e.so_dieu === 27 && e.ten_entity === TEN_K2A);
if (k2a.length !== 1) throw new Error(`không tìm đúng 1 entity Đ27 k2a (thấy ${k2a.length})`);

const dapAn = (e) => {
  if (e.trang_thai_duyet !== "tu_choi" || e.id === k2a[0].id) return "B";
  const n = nhom.get(e.id);
  if (NHOM_CO_HOC.includes(n)) return "A";
  if (n === "TX" && TEN_CHUNG.has(e.ten_entity.trim().toLowerCase())) return "A";
  return "B";
};

// Lượt một: mọi entity như lúc vừa trích xuất (chờ duyệt)
const r1 = new Map(ents.map((e) => [e.id, phanLuong(e)]));
// Lượt hai: điều kiện chờ duyệt, nghĩa vụ đã có quyết định cuối 17/11
const tt = new Map(ents.map((e) => [e.id, e.trang_thai_duyet]));
const r2 = new Map(r1);
for (const [id, kq] of phanLuongLuotHai(ents.map((e) => ({ ...e, trang_thai_duyet: e.loai_entity === "dieu_kien" ? "cho_duyet" : e.trang_thai_duyet })), d.r, tt))
  r2.set(id, kq);

const bang = (r) => {
  const o = { AA: [], AB: [], BA: [], BB: [] }; // [bộ lọc][đáp án]
  for (const e of ents) o[r.get(e.id).luong + dapAn(e)].push(e);
  return o;
};
const dong = (e, r) => ({ id: e.id, dieu_khoan: e.dieu_khoan, loai: e.loai_entity, ten: e.ten_entity, quyet_dinh: e.trang_thai_duyet,
  nhom: nhom.get(e.id) ?? null, quy_tac: r.get(e.id).quy_tac });
const tom = (o, r) => ({
  bo_loc_A_dap_an_A: o.AA.length, bo_loc_A_dap_an_B: o.AB.length, bo_loc_B_dap_an_A: o.BA.length, bo_loc_B_dap_an_B: o.BB.length,
  luong_A: o.AA.length + o.AB.length, khop: o.AA.length + o.BB.length,
  nham_sang_A: o.AB.map((e) => dong(e, r)), nham_sang_B: o.BA.map((e) => dong(e, r)),
});
const b1 = bang(r1), b2 = bang(r2);
const demQuyTac = (r) => [...r.values()].reduce((m, x) => ((m[x.quy_tac] = (m[x.quy_tac] ?? 0) + 1), m), {});
const out = { chay_luc: new Date().toISOString(), phien_ban: PHAN_LUONG_VERSION, n: ents.length,
  dap_an_A: ents.filter((e) => dapAn(e) === "A").length, luot_mot: tom(b1, r1), luot_hai: tom(b2, r2),
  quy_tac_luot_mot: demQuyTac(r1), quy_tac_luot_hai: demQuyTac(r2) };
writeFileSync("research/sau/phan-luong-108.json", JSON.stringify(out, null, 1));

const pc = (x) => `${x}/70 (${((100 * x) / 70).toFixed(1)}%)`;
const bangMd = (t, ten) => [`### ${ten}`, "", "| | Đáp án A | Đáp án B | Cộng |", "|---|---|---|---|",
  `| **Bộ lọc A** | ${t.bo_loc_A_dap_an_A} | **${t.bo_loc_A_dap_an_B}** (nhầm sang A) | ${t.luong_A} |`,
  `| **Bộ lọc B** | ${t.bo_loc_B_dap_an_A} (nhầm sang B) | ${t.bo_loc_B_dap_an_B} | ${70 - t.luong_A} |`, "",
  `- Luồng A: ${pc(t.luong_A)}. Khớp đáp án: ${pc(t.khop)}. **Nhầm sang A: ${t.bo_loc_A_dap_an_B}.**`, "",
  "| Hướng nhầm | Điều khoản | Loại | Tên (đề xuất LLM) | Quyết định 17/11 | Nhóm | Luật khớp |", "|---|---|---|---|---|---|---|",
  ...t.nham_sang_A.map((x) => `| → A | ${x.dieu_khoan} | ${x.loai} | ${x.ten} | ${x.quyet_dinh} | ${x.nhom ?? ""} | ${x.quy_tac} |`),
  ...t.nham_sang_B.map((x) => `| → B | ${x.dieu_khoan} | ${x.loai} | ${x.ten} | ${x.quyet_dinh} | ${x.nhom ?? ""} | ${x.quy_tac} |`), ""];
const md = [`# Phân luồng ${PHAN_LUONG_VERSION} trên 70 entity Luật 108 — đo TRONG MẪU`, "",
  `Chạy: ${out.chay_luc}. Cách đo và giới hạn: \`research/bao-cao/PHAN_LUONG.md\` §3–§4. Đáp án "phải ở A": ${out.dap_an_A}/70.`, "",
  ...bangMd(out.luot_mot, "Lượt một (ngay sau trích xuất)"), ...bangMd(out.luot_hai, "Sau lượt hai (A6: điều kiện mất nguồn)"),
  "### Số entity theo luật khớp (lượt hai)", "", "| Luật | Số |", "|---|---|",
  ...Object.entries(out.quy_tac_luot_hai).sort().map(([k, v]) => `| ${k} | ${v} |`), ""].join("\n");
writeFileSync("research/sau/phan-luong-108.md", md);
console.log(md);
