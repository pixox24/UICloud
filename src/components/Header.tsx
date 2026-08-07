"use client";

import { useEffect, useState } from "react";
import { MenuIcon } from "@/components/menu-icons";
import type { Menu as MenuItem } from "@/types";

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function Header() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    fetch("/api/menus")
      .then((response) => response.json())
      .then((data) => setMenus(data.menus || []))
      .catch(() => undefined);
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => setLogoUrl(data.settings?.logo_url || ""))
      .catch(() => undefined);
  }, []);

  const activeMenus = menus
    .filter((menu) => menu.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="relative flex h-28 items-center">
        <a
          href="/"
          title="首页"
          className="flex shrink-0 items-center pl-4 sm:pl-6"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="max-h-[72px] max-w-[240px] object-contain"
            />
          ) : (
            <span className="h-[72px] w-[240px] shrink-0" />
          )}
        </a>

        <div className="pointer-events-none absolute inset-0 mx-auto w-full max-w-[1680px] px-3 sm:px-4 lg:px-5">
          <nav className="pointer-events-auto flex h-full min-w-0 flex-wrap items-center justify-end gap-2.5 py-2">
            {activeMenus.map((menu) => {
              const external = isExternalUrl(menu.url);
              return (
                <a
                  key={menu.id}
                  href={menu.url}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  title={menu.title}
                  className="flex items-center gap-2.5 rounded-xl bg-card/50 px-5 py-3 text-base text-muted-foreground ring-1 ring-inset ring-white/[0.05] backdrop-blur-sm transition-colors hover:bg-card/75 hover:text-foreground"
                >
                  <MenuIcon id={menu.icon} className="h-6 w-6" />
                  <span>{menu.title}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
