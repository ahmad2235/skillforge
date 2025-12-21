import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "./NavigationContext";

type TopbarProps = {
  onToggleSidebar?: () => void;
  leftSlot?: ReactNode;
  fullBleed?: boolean;
};

export const Topbar = ({ onToggleSidebar, leftSlot, fullBleed = false }: TopbarProps) => {
  const { isAuthenticated: ctxIsAuthenticated, user, token, logout } = useAuth();
  const { placementMode, setPlacementMode } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  // Ensure authentication state is computed deterministically from token & user
  const isAuthenticated = !!token && !!user;
  const dashboardPath = user?.role === "student" ? "/student" : user?.role === "business" ? "/business" : "/admin";

  const routeTitleMap: { pattern: RegExp; title: string }[] = [
    { pattern: /^\/$/, title: "Home" },
    { pattern: /^\/student$/, title: "Student Dashboard" },
    { pattern: /^\/student\/placement\/intro$/, title: "Placement Intro" },
    { pattern: /^\/student\/placement/, title: "Placement" },
    { pattern: /^\/student\/roadmap$/, title: "Roadmap" },
    { pattern: /^\/student\/blocks(\/|$)/, title: "Block" },
    { pattern: /^\/student\/tasks(\/|$)/, title: "Task" },
    { pattern: /^\/student\/projects/, title: "Projects" },
    { pattern: /^\/student\/profile/, title: "Profile" },
    { pattern: /^\/student\/assignments$/, title: "Assignments" },
    { pattern: /^\/student\/portfolios$/, title: "Portfolio" },
    { pattern: /^\/business$/, title: "Business Dashboard" },
    { pattern: /^\/business\/projects$/, title: "Projects" },
    { pattern: /^\/business\/projects\/new$/, title: "New Project" },
    { pattern: /^\/business\/projects\//, title: "Project" },
    { pattern: /^\/business\/projects\/.+\/candidates/, title: "Candidates" },
    { pattern: /^\/business\/monitoring$/, title: "Monitoring" },
    { pattern: /^\/business\/profile/, title: "Profile" },
    { pattern: /^\/admin$/, title: "Admin Dashboard" },
    { pattern: /^\/admin\/dashboard$/, title: "Admin Dashboard" },
    { pattern: /^\/admin\/users/, title: "Users" },
    { pattern: /^\/admin\/projects$/, title: "Projects" },
    { pattern: /^\/admin\/projects\//, title: "Project" },
    { pattern: /^\/admin\/monitoring$/, title: "Monitoring" },
    { pattern: /^\/admin\/milestones\/submissions$/, title: "Milestone reviews" },
    { pattern: /^\/admin\/reports/, title: "Reports" },
  ];

  const routeTitle = leftSlot
    ? leftSlot
    : routeTitleMap.find(({ pattern }) => pattern.test(location.pathname))?.title;

  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuFirstItemRef = useRef<HTMLButtonElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      setTimeout(() => menuFirstItemRef.current?.focus(), 0);
    } else {
      menuTriggerRef.current?.focus();
    }
  }, [isMenuOpen]);

  return (
    <header
      role="banner"
      className={
        fullBleed
          ? "sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/60 backdrop-blur"
          : "sticky top-0 z-30 border-b border-slate-200 bg-white"
      }
    >
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        {!placementMode && !fullBleed && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
          >
            <span aria-hidden>☰</span>
            <span className="sr-only">Toggle navigation</span>
          </Button>
        )}

        <Link
          to="/"
          className={
            fullBleed
              ? "text-base font-semibold text-slate-100 hover:text-sky-300"
              : "text-base font-semibold text-slate-900 hover:text-primary"
          }
        >
          SkillForge
        </Link>

        {routeTitle ? (
          <div
            className={
              fullBleed
                ? "ml-2 flex-1 text-sm text-slate-200"
                : "ml-2 flex-1 text-sm text-slate-700"
            }
          >
            {routeTitle}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {placementMode ? (
            <>
              <span className={fullBleed ? "text-xs text-slate-200" : "text-xs text-slate-600"}>
                Placement mode
              </span>

              <Button
                variant={fullBleed ? "ghost" : "ghost"}
                size="sm"
                className="ml-2"
                onClick={() => {
                  // clear placement mode and navigate back to the student's roadmap (fallback to dashboard)
                  setPlacementMode(false);
                  if (user?.role === "student") {
                    navigate("/student/roadmap");
                  } else {
                    navigate("/student/dashboard");
                  }
                }}
              >
                Exit placement
              </Button>
            </>
          ) : isAuthenticated ? (
            <>
              <div className="hidden flex-col items-end text-right sm:flex">
                <div className={fullBleed ? "text-sm font-medium text-slate-100" : "text-sm font-medium text-slate-900"}>
                  {user?.email ?? user?.name ?? "User"}
                </div>
                <div className={fullBleed ? "text-xs text-slate-300 capitalize" : "text-xs text-slate-500 capitalize"}>
                  {user?.role ?? ""}
                </div>
              </div>

              <Button asChild size="sm" className={fullBleed ? "text-slate-100" : undefined}>
                <Link to={dashboardPath}>
                  Dashboard
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={fullBleed ? "ghost" : "ghost"}
                size="sm"
                asChild
                className={fullBleed ? "text-slate-100 hover:text-sky-200" : undefined}
              >
                <Link to="/auth/login">Log in</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className={fullBleed ? "bg-sky-600 text-white hover:bg-sky-500" : undefined}
              >
                <Link to="/auth/register?intent=placement">Get started</Link>
              </Button>
            </>
          )}

          <button
            ref={menuTriggerRef}
            onClick={() => setIsMenuOpen((s) => !s)}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            aria-controls="topbar-menu"
            aria-label="Open user menu"
            className="relative h-8 w-8 rounded-full bg-slate-200 text-slate-900 ring-1 ring-slate-900/5 transition-all hover:ring-slate-900/10"
          >
            {/* ...icon or avatar... */}
          </button>

          {isMenuOpen && (
            <div
              id="topbar-menu"
              role="menu"
              aria-labelledby="topbar-menu"
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsMenuOpen(false);
              }}
              className="absolute right-0 top-14 z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
              <button
                ref={menuFirstItemRef}
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  // navigate to role-specific profile
                  navigate(user?.role === 'student' ? '/student/profile' : user?.role === 'business' ? '/business/profile' : '/admin/profile');
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                Profile
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                  navigate('/');
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
