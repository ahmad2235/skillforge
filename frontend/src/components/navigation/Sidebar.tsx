import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { roleNavConfig } from "./RoleNavConfig";
import { useNavigation } from "./NavigationContext";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import { ChevronRight } from "lucide-react";

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
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group " +
      (active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground")
    }
    aria-current={active ? "page" : undefined}
  >
    {/* Active indicator bar */}
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-lg" aria-hidden="true" />
    )}
    
    {/* Icon indicator */}
    <span
      className={
        "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors " +
        (active
          ? "bg-primary/20 text-primary"
          : "bg-muted text-muted-foreground group-hover:bg-muted/80")
      }
      aria-hidden="true"
    >
      {label.charAt(0).toUpperCase()}
    </span>
    
    {/* Label */}
    <span className={"transition-all duration-200 " + (collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100")}>
      {label}
    </span>
    
    {/* Hover indicator on right (visible when collapsed) */}
    {collapsed && (
      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
    )}
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
    const groups = roleNavConfig[user.role] ?? [];

    // If student, customize the Placement link based on status
    if (user.role === "student") {
      return groups.map((group) => ({
        ...group,
        items: group.items.map((item) => {
          if (item.label === "Placement") {
            // If placement is done (level exists), point to results
            if (user.level) {
              return { ...item, path: "/student/placement/results" };
            }
            // Otherwise keep default (Intro/Choose Path)
            return item;
          }
          return item;
        }),
      }));
    }

    return groups;
  }, [user?.role, user?.level]);

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
    <div className="flex h-full flex-col gap-0">
      {/* Header section with brand and collapse button */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 py-4 flex items-center justify-between gap-3">
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'sr-only' : ''}`}>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-sm flex-shrink-0">
            S
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">SkillForge</h2>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((prev) => !prev)}
          className={`text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 flex-shrink-0 h-8 w-8 p-0`}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight 
            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        <div className="space-y-6">
          {navGroups.map((group, idx) => (
            <div key={group.label} className="space-y-2">
              {!collapsed && (
                <div className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => (
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
      </nav>

      {/* User info footer */}
      <div className="border-t border-slate-200 bg-slate-50/50 px-3 py-4 mt-auto">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex-shrink-0`}>
            {user.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <nav aria-label="Primary navigation" className="flex">
      <>
        {/* Desktop sidebar */}
        <aside
          className={
            "hidden h-screen shrink-0 border-r border-slate-200 bg-white md:flex flex-col transition-all duration-300 ease-out overflow-hidden shadow-sm " +
            (collapsed ? "w-16" : "w-64")
          }
        >
          {content}
        </aside>

        {/* Mobile trigger button (hidden, used for focus management) */}
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

        {/* Mobile drawer */}
        {isMobileOpen && (
          <div
            role="menu"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            className="fixed inset-0 z-40 flex md:hidden"
          >
            {/* Backdrop overlay */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
              onClick={onClose}
            />
            
            {/* Mobile drawer panel */}
            <div className="relative h-full w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col">
              {/* Mobile header with close button */}
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-sm flex-shrink-0">
                    S
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 truncate">SkillForge</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 flex-shrink-0"
                  aria-label="Close navigation menu"
                >
                  ✕
                </Button>
              </div>

              {/* Mobile navigation content */}
              <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Mobile navigation">
                <div className="space-y-6">
                  {navGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <div className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              </nav>

              {/* Mobile user footer */}
              <div className="border-t border-slate-200 bg-slate-50/50 px-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    </nav>
  );
};
