import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "./NavigationContext";
import { Breadcrumbs } from "./Breadcrumbs";
import { User, LogOut } from "lucide-react";
import { Logo, LogoColors } from "../ui/Logo";
import { useChatSocket } from "../../hooks/useChatSocket";

type TopbarProps = {
  onToggleSidebar?: () => void;
  leftSlot?: ReactNode;
  fullBleed?: boolean;
};

export const Topbar = ({ onToggleSidebar, leftSlot, fullBleed = false }: TopbarProps) => {
  const { isAuthenticated, user, logout, initialized } = useAuth();
  const { placementMode, setPlacementMode } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = user?.role === "student" ? "/student" : user?.role === "business" ? "/business" : "/admin";

  const { isConnected } = useChatSocket();

  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuFirstItemRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      setTimeout(() => menuFirstItemRef.current?.focus(), 0);
    } else {
      menuTriggerRef.current?.focus();
    }
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuTriggerRef.current &&
        !menuTriggerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header
      role="banner"
      className={
        fullBleed
          ? "sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur"
          : "sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70"
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
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Logo variant="icon" className="w-8 h-8 text-sky-400" />
          <span className="text-base font-semibold text-slate-100">SkillForge</span>
        </Link>

        {!fullBleed && (
          <>
            <div className="hidden h-6 w-px bg-border md:block mx-2" />
            <Breadcrumbs />
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {placementMode ? (
            <>
              <span className="text-xs text-slate-300">
                Placement mode
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="ml-2 text-slate-100"
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
          ) : !initialized ? (
            // Show loading state while initializing auth
            <div className="h-9 w-32 bg-slate-800/50 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden flex-col items-end text-right sm:flex">
                <div className="text-sm font-medium text-slate-100">
                  {user?.email ?? user?.name ?? "User"}
                </div>
                <div className="text-xs text-slate-400 capitalize">
                  {user?.role ?? ""}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="secondary" className="text-slate-100">
                  <Link to={dashboardPath}>Dashboard</Link>
                </Button>

                {/* Chat shortcut (visible only to students and business owners) */}
                {user && (user.role === 'student' || user.role === 'business') && (
                  <Button asChild variant="ghost" size="icon" className="ml-2" title="Chat">
                    <Link to="/chat" aria-label="Open chat" className="relative">
                      {/* Lucide chat icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {/* show online indicator only when socket is connected */}
                      {isConnected && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />}
                    </Link>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-slate-100 hover:text-sky-200"
              >
                <Link to="/auth/login">Log in</Link>
              </Button>
              <Button
                size="sm"
                variant="default"
                asChild
                className="bg-sky-500 text-slate-950 hover:bg-sky-400"
              >
                <Link to="/auth/register?intent=placement">Get started</Link>
              </Button>
            </>
          )}

          {/* Profile menu - only show when authenticated and initialized */}
          {initialized && isAuthenticated && (
            <>
              <button
                ref={menuTriggerRef}
                onClick={() => setIsMenuOpen((s) => !s)}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                aria-controls="topbar-menu"
                aria-label="Open user menu"
                className="relative h-9 w-9 rounded-full bg-slate-900 text-slate-100 ring-1 ring-slate-800/60 transition-all hover:ring-slate-700 flex items-center justify-center"
              >
                <User className="h-5 w-5" />
              </button>

              {isMenuOpen && (
                <div
                  ref={menuRef}
                  id="topbar-menu"
                  role="menu"
                  aria-labelledby="topbar-menu"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsMenuOpen(false);
                  }}
                  className="absolute right-0 top-14 z-50 mt-2 w-48 rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/40 focus:outline-none"
                >
                  <button
                    ref={menuFirstItemRef}
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      // navigate to role-specific profile
                      navigate(user?.role === 'student' ? '/student/profile' : user?.role === 'business' ? '/business/profile' : '/admin/profile');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
