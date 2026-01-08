import { ReactNode } from "react";
import { Topbar } from "../components/navigation/Topbar";
import { Outlet } from "react-router-dom";

const PublicLayout = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-slate-950 focus:font-medium focus:text-sm"
      >
        Skip to content
      </a>

      <Topbar fullBleed />

      <main id="main-content" className="pt-14">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};

export default PublicLayout;
