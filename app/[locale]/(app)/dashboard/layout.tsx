"use client";

import { RequireAuth } from "@/components/shared/RequireAuth";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth>
      <div className="dashboard-shell">
        <div className="dashboard-shell__inner">
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
