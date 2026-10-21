import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardCheck,
  FileInput,
  FileSearch,
  History,
  Inbox,
  LayoutDashboard,
  Library,
  RefreshCw,
} from "lucide-react";

import { COPY } from "@/lib/copy";

/*
 * Menu sidebar cho 2 vai trò. Chữ lấy từ lib/copy.ts (nexora-wording-v1 mục 3.1, 4).
 * Route group (curator) / (khach-hang) KHÔNG tạo đoạn URL — nên tên route 2 bên phải khác nhau.
 * URL giữ nguyên (vd /duyet-diagnostic) để không hỏng link; chỉ đổi chữ hiển thị.
 * Khi thêm trang mới: tạo thư mục trong đúng route group + thêm 1 dòng ở đây.
 */

export type Role = "curator" | "khach-hang";

export type NavItem = { title: string; href: string; icon: LucideIcon };

export type RoleNav = {
  role: Role;
  badge: string; // badge vai trò dưới tên người dùng
  groupLabel?: string; // nhãn nhóm menu (phía doanh nghiệp không có)
  crumb?: string; // đoạn đầu breadcrumb; phía doanh nghiệp dùng tên công ty
  items: NavItem[];
};

const P = COPY.page;

export const curatorNav: RoleNav = {
  role: "curator",
  badge: COPY.role.curatorBadge,
  groupLabel: COPY.role.curatorCrumb,
  crumb: COPY.role.curatorCrumb,
  items: [
    { title: P.nhapVanBan.title, href: "/nhap-van-ban", icon: FileInput },
    { title: P.kiemDuyet.title, href: "/duyet-ban-nhap", icon: FileSearch },
    { title: P.thuVien.title, href: "/kho-entity", icon: Library },
    { title: P.capNhat.title, href: "/quet-lai", icon: RefreshCw },
    { title: P.lichSu.title, href: "/nhat-ky", icon: History },
  ],
};

export const khachHangNav: RoleNav = {
  role: "khach-hang",
  badge: COPY.role.customerBadge,
  items: [
    { title: P.tongQuan.title, href: "/tong-quan", icon: LayoutDashboard },
    { title: P.xacNhan.title, href: "/duyet-diagnostic", icon: ClipboardCheck },
    { title: P.thongBao.title, href: "/hop-thu", icon: Inbox },
    { title: P.hoSo.title, href: "/onboarding", icon: Building2 },
  ],
};

// Tra menu theo vai trò. Server component chỉ truyền `role` (string) xuống client,
// vì icon là function — không truyền qua ranh giới server → client được.
export const navByRole: Record<Role, RoleNav> = {
  curator: curatorNav,
  "khach-hang": khachHangNav,
};
