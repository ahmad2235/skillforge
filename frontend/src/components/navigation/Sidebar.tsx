import { useMemo, useState } from "react";
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
    className={
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition " +
      (active
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-slate-800 hover:bg-slate-100")
    }
    aria-current={active ? "page" : undefined}
  >
    <span
      className={
        "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold " +
        (active
          ? "bg-primary/20 text-primary"
          : "bg-slate-200 text-slate-700")
      }
    >
      {label.charAt(0).toUpperCase()}
    </span>
    {!collapsed && <span>{label}</span>}
  </Link>
);

export const Sidebar = ({ isMobileOpen, onClose }: SidebarProps) => {
  const { placementMode } = useNavigation();
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navGroups = useMemo(() => {
    if (!user?.role) return [];
    return roleNavConfig[user.role] ?? [];
  }, [user?.role]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  if (placementMode || !user) {
    return null;
  }

  const content = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">Navigation</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden md:inline-flex"
        >
          {collapsed ? "Expand" : "Collapse"}
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
        {user.email} • {user.role}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={
          "hidden h-screen shrink-0 border-r border-slate-200 bg-slate-50 md:flex " +
          (collapsed ? "w-16" : "w-64")
        }
      >
        {content}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
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
            {content}
          </div>
        </div>
      )}
    </>
  );
};
