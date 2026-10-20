"use client";

import { ActivateVanBanButton } from "@/components/nexora/activate-van-ban";
import { VanBanBadge } from "@/components/nexora/status-badges";
import { combine } from "@/lib/data/errors";
import { getNerExtractionSummary, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";

/*
 * Văn bản còn ở trạng thái Bản nháp → curator kích hoạt tại đây (có Dialog xác nhận).
 * /duyet-ban-nhap dẫn link về #cho-kich-hoat khi đã duyệt hết entity của 1 văn bản.
 * Không có văn bản nháp → không hiện gì.
 */
export function DraftVanBanList() {
  const res = useQuery(() => combine({ vanBan: getVanBanList(), summaries: getNerExtractionSummary() }), []);
  const drafts = (res.data?.vanBan ?? []).filter((v) => v.trang_thai === "draft");
  if (res.loading || res.error || drafts.length === 0) return null;

  return (
    <section id="cho-kich-hoat" className="max-w-3xl scroll-mt-20 space-y-2" aria-labelledby="cho-kich-hoat-title">
      <h2 id="cho-kich-hoat-title" className="text-base font-semibold">
        Văn bản chờ kích hoạt ({drafts.length})
      </h2>
      <ul className="border bg-card [&>li+li]:border-t">
        {drafts.map((v) => {
          const s = res.data!.summaries.filter((x) => x.van_ban_id === v.id);
          const cho = s.reduce((n, x) => n + x.so_cho_duyet, 0);
          const tong = s.reduce((n, x) => n + x.so_entity, 0);
          return (
            <li key={v.id} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="min-w-48 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {v.ten_van_ban} <VanBanBadge status={v.trang_thai} />
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {v.so_hieu} · {tong === 0 ? "chưa trích xuất entity" : cho > 0 ? `còn ${cho}/${tong} entity chờ duyệt` : `đã duyệt hết ${tong} entity`}
                </span>
              </span>
              <ActivateVanBanButton size="sm" vanBan={v} onActivated={res.reload} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
