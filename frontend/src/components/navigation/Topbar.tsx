import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "./NavigationContext";

type TopbarProps = {
  onToggleSidebar?: () => void;
  leftSlot?: ReactNode;
  fullBleed?: boolean;
};

export const Topbar = ({ onToggleSidebar, leftSlot, fullBleed = false }: TopbarProps) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { placementMode } = useNavigation();
  const location = useLocation();

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

  return (
    <header
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
            <span className={fullBleed ? "text-xs text-slate-200" : "text-xs text-slate-600"}>
              Placement mode
            </span>
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
              <Button
                variant={fullBleed ? "secondary" : "outline"}
                size="sm"
                onClick={logout}
              >
                Logout
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
                <Link to="/auth/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
