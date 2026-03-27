"use client";

import { usePathname } from "next/navigation";
import { Upload, List, FolderTree, ArrowLeft } from "lucide-react";

const links = [
  { href: "/admin/upload", label: "上传资产", icon: Upload },
  { href: "/admin/assets", label: "资产管理", icon: List },
  { href: "/admin/categories", label: "分类管理", icon: FolderTree },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border px-6 bg-card">
      <a
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-3 transition-colors mr-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </a>

      {links.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          className={`flex items-center gap-1.5 text-sm px-3 py-3 border-b-2 transition-colors ${
            pathname === href
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </a>
      ))}
    </nav>
  );
}
