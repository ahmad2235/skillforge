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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      {/* Skip to content - visually hidden off-screen, visible on focus */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
          mainRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:font-medium focus:text-sm"
      >
        Skip to content
      </a>

      <Topbar
        onToggleSidebar={() => setMobileNavOpen(true)}
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
          className={fullBleed ? "flex-1 w-full" : "flex-1 px-4 sm:px-6 py-8"}
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
