import { ReactNode, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { Topbar } from "../components/navigation/Topbar";
import { useNavigation } from "../components/navigation/NavigationContext";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { placementMode } = useNavigation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  const fullBleed = useMemo(() => {
    const path = location.pathname;

    if (
      path === "/" ||
      path === "/login" ||
      path === "/register" ||
      path === "/forgot-password" ||
      path.startsWith("/auth") ||
      path.startsWith("/public")
    ) {
      return true;
    }

    return false;
  }, [location.pathname]);

  const breadcrumbSlot = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const current = segments[segments.length - 1] ?? "Home";
    const title = current
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Home";

    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="text-slate-700">Home</span>
        <span aria-hidden className="text-slate-400">
          /
        </span>
        <span className="font-medium text-slate-900">{title}</span>
      </div>
    );
  }, [location.pathname]);

  return (
    <div className={`min-h-screen text-slate-900 ${fullBleed ? "" : "bg-slate-50"}`}>
      <Topbar
        onToggleSidebar={() => setMobileNavOpen(true)}
        leftSlot={fullBleed ? undefined : breadcrumbSlot}
        fullBleed={fullBleed}
      />

      <div className="flex min-h-[calc(100vh-56px)]">
        {!placementMode && !fullBleed && (
          <Sidebar
            isMobileOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
          />
        )}

        <main className={fullBleed ? "flex-1 w-full" : "flex-1 px-4 sm:px-6 py-6"}>
          {fullBleed ? children : (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
