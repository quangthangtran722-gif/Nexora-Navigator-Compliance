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

/*
 * Menu sidebar cho 2 vai trò.
 * Route group (curator) / (khach-hang) KHÔNG tạo đoạn URL — nên tên route 2 bên phải khác nhau.
 * Khi thêm trang mới: tạo thư mục trong đúng route group + thêm 1 dòng ở đây.
 */

export type Role = "curator" | "khach-hang";

export type NavItem = { title: string; href: string; icon: LucideIcon };

export type RoleNav = {
  role: Role;
  label: string; // tên vai trò hiển thị
  description: string;
  items: NavItem[];
};

export const curatorNav: RoleNav = {
  role: "curator",
  label: "Curator",
  description: "Xây và duyệt kho văn bản luật",
  items: [
    { title: "Nhập văn bản luật", href: "/nhap-van-ban", icon: FileInput },
    { title: "Duyệt bản nháp", href: "/duyet-ban-nhap", icon: FileSearch },
    { title: "Kho entity", href: "/kho-entity", icon: Library },
    { title: "Quét lại khách hàng", href: "/quet-lai", icon: RefreshCw },
    { title: "Nhật ký pipeline", href: "/nhat-ky", icon: History },
  ],
};

export const khachHangNav: RoleNav = {
  role: "khach-hang",
  label: "Khách hàng",
  description: "Người đầu mối tuân thủ của doanh nghiệp",
  items: [
    { title: "Tổng quan", href: "/tong-quan", icon: LayoutDashboard },
    { title: "Onboarding", href: "/onboarding", icon: Building2 },
    { title: "Duyệt diagnostic", href: "/duyet-diagnostic", icon: ClipboardCheck },
    { title: "Hộp thư phòng ban", href: "/hop-thu", icon: Inbox },
  ],
};

// Tra menu theo vai trò. Server component chỉ truyền `role` (string) xuống client,
// vì icon là function — không truyền qua ranh giới server → client được.
export const navByRole: Record<Role, RoleNav> = {
  curator: curatorNav,
  "khach-hang": khachHangNav,
};
