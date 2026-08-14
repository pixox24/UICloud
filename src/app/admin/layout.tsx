"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import SideNav from "@/components/SideNav";
import type { User } from "@/types";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen md:flex">
      <div className="sticky top-0 h-screen shrink-0 hidden md:block">
        <SideNav user={user} activeItem="admin" />
      </div>
      <div className="min-w-0 flex-1">
        <AdminNav />
        <div className="container py-6">{children}</div>
      </div>
    </div>
  );
}
