"use client";

import { useState } from "react";
import { Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useErrorHandler } from "@/lib/data/errors";
import { activateVanBan } from "@/lib/data/mutations";
import type { VanBan } from "@/lib/types";

/*
 * Nút "Kích hoạt văn bản" (draft → active) + Dialog xác nhận (team chốt 20/10).
 * Rule engine chỉ đọc entity của văn bản active → curator phải bấm tay và xác nhận, không tự kích hoạt.
 */
export function ActivateVanBanButton({
  vanBan,
  disabled,
  size,
  onActivated,
}: {
  vanBan: Pick<VanBan, "id" | "ten_van_ban" | "so_hieu">;
  disabled?: boolean;
  size?: "sm" | "default";
  onActivated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleError = useErrorHandler();

  async function confirm() {
    setBusy(true);
    setError(null);
    const { error: err } = await activateVanBan(vanBan.id);
    setBusy(false);
    if (err) return setError(handleError(err, { onReload: onActivated }) ?? err.message);
    setOpen(false);
    onActivated();
  }

  return (
    <>
      <Button size={size} disabled={disabled} onClick={() => setOpen(true)}>
        <Power /> Kích hoạt văn bản
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kích hoạt văn bản?</DialogTitle>
            <DialogDescription>
              <b>{vanBan.ten_van_ban}</b> ({vanBan.so_hieu}) sẽ chuyển từ Bản nháp sang Đang hiệu lực. Từ lúc đó rule engine đọc các entity đã duyệt của văn
              bản này khi đối chiếu cho mọi khách hàng. Sau khi kích hoạt, chạy &quot;Quét lại khách hàng&quot; để áp cho khách hàng hiện có.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="bg-brand-red-bg px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={busy} />}>Huỷ</DialogClose>
            <Button onClick={confirm} disabled={busy}>
              <Power /> {busy ? "Đang kích hoạt…" : "Kích hoạt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
