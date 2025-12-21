import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { roleNavConfig } from "./RoleNavConfig";
import { useNavigation } from "./NavigationContext";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";

type SidebarProps = {
  isMobileOpen: boolean;
  onClose: () => void;
};

type NavItemProps = {
  label: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
};

const NavItem = ({ label, path, active, collapsed, onNavigate }: NavItemProps) => (
  <Link
    to={path}
    onClick={onNavigate}
    title={collapsed ? label : undefined}
    aria-label={label}
    className={
      "flex items-center gap-2 h-10 rounded-md px-3 text-sm transition-all duration-150 overflow-hidden whitespace-nowrap " +
      (active
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-slate-800 hover:bg-slate-100") +
      (collapsed ? " justify-center" : "")
    }
    aria-current={active ? "page" : undefined}
  >
    <span
      className={
        "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-semibold " +
        (active
          ? "bg-primary/20 text-primary"
          : "bg-slate-200 text-slate-700")
      }
      aria-hidden="true"
    >
      {label.charAt(0).toUpperCase()}
    </span>
    <span className={"ml-1 transition-opacity duration-150 " + (collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100")}>
      {label}
    </span>
  </Link>
);

export const Sidebar = ({ isMobileOpen, onClose }: SidebarProps) => {
  const { placementMode, collapsed, setCollapsed } = useNavigation();
  const { user } = useAuth();
  const location = useLocation();

  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileFirstLinkRef = useRef<HTMLAnchorElement | null>(null);

  const navGroups = useMemo(() => {
    if (!user?.role) return [];
    return roleNavConfig[user.role] ?? [];
  }, [user?.role]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    if (isMobileOpen) {
      setTimeout(() => mobileFirstLinkRef.current?.focus(), 0);
    } else {
      mobileTriggerRef.current?.focus();
    }
  }, [isMobileOpen]);

  if (placementMode || !user) {
    return null;
  }

  const content = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold text-slate-700 ${collapsed ? 'sr-only' : ''}`}>Navigation</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((prev) => !prev)}
          className="inline-flex"
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {/* small chevron that rotates */}
          <span className={"transform transition-transform " + (collapsed ? "rotate-180" : "rotate-0")}>▸</span>
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            {!collapsed && (
              <div className="px-2 text-xs font-semibold uppercase text-slate-500">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  active={isActive(item.path)}
                  collapsed={collapsed}
                  onNavigate={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
            <span className={`text-xs ${collapsed ? 'sr-only' : ''}`}>{user.email}</span>
            <span className={`text-xs capitalize ${collapsed ? 'sr-only' : ''}`}>{user.role}</span>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => setCollapsed((prev) => !prev)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <span className={"transform transition-transform " + (collapsed ? "rotate-180" : "rotate-0")}>▸</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <nav aria-label="Primary navigation" className="flex">
      <>
        <aside
          className={
            "hidden h-screen shrink-0 border-r border-slate-200 bg-slate-50 md:flex flex-col transition-all duration-200 ease-in-out overflow-hidden " +
            (collapsed ? "w-16" : "w-64")
          }
        >
          {content}
        </aside>

        <button
          ref={mobileTriggerRef}
          aria-label="Open navigation"
          aria-haspopup="menu"
          aria-expanded={isMobileOpen}
          onClick={() => null}
          className="md:hidden"
        >
          {/* hamburger icon */}
        </button>

        {isMobileOpen && (
          <div
            role="menu"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            className="fixed inset-0 z-40 flex md:hidden"
          >
            <div
              className="absolute inset-0 bg-black/40"
              aria-hidden="true"
              onClick={onClose}
            />
            <div className="relative h-full w-72 max-w-[80%] bg-slate-50 shadow-xl">
              <div className="flex h-12 items-center justify-between border-b px-4">
                <span className="text-sm font-semibold">Menu</span>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
              <div className="flex h-full flex-col gap-4 p-4">
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {navGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <div className="px-2 text-xs font-semibold uppercase text-slate-500">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <NavItem
                            key={item.path}
                            label={item.label}
                            path={item.path}
                            active={isActive(item.path)}
                            collapsed={false}
                            onNavigate={onClose}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
                  {user.email} • {user.role}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    </nav>
  );
};
