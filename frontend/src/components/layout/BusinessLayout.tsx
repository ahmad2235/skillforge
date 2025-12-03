import type { ReactNode } from "react";

interface BusinessLayoutProps {
  children: ReactNode;
}

export function BusinessLayout({ children }: BusinessLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-4">Business Area</h1>
        {children}
      </div>
    </div>
  );
}
