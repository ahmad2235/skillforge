import { ReactNode } from "react";
import { Topbar } from "../components/navigation/Topbar";
import { Outlet } from "react-router-dom";

const PublicLayout = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <a
        href="#main-content"
        className="absolute -left-[9999px] focus:left-4 focus:top-4 focus:static focus:inline-block focus:bg-slate-900 focus:text-white focus:p-2 focus:rounded z-50"
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
