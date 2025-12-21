import { ReactNode, useMemo, useState, useRef } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { Topbar } from "../components/navigation/Topbar";
import { useNavigation } from "../components/navigation/NavigationContext";
import { ErrorBoundary } from "../components/security/ErrorBoundary";

const AppLayout = ({ children }: { children?: ReactNode }) => {
  const { placementMode } = useNavigation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

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
      {/* Skip to content - visually hidden off-screen, visible on focus */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
          mainRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        className="absolute -left-[9999px] focus:left-4 focus:top-4 focus:static focus:inline-block focus:bg-white focus:text-slate-900 focus:p-2 focus:rounded z-50"
      >
        Skip to content
      </a>

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

        <main
          id="main-content"
          tabIndex={-1}
          ref={mainRef}
          className={fullBleed ? "flex-1 w-full" : "flex-1 px-4 sm:px-6 py-6"}
        >
          {fullBleed ? (children ?? <Outlet />) : (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              {children ?? (
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
