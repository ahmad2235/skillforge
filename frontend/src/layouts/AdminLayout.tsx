import { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type AdminLayoutProps = {
  children: ReactNode;
  title?: string;
};

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/learning", label: "Learning" },
  { to: "/admin/assessment", label: "Assessment" },
  { to: "/admin/placement", label: "Placement" },
  { to: "/admin/monitoring", label: "Monitoring" },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex bg-muted/30 text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background/80 backdrop-blur">
        <div className="px-4 py-4 border-b">
          <Link
            to="/admin/dashboard"
            className="font-bold text-xl tracking-tight"
          >
            SkillForge Admin
          </Link>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold">{title ?? "Admin"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Admin</span>
            <Avatar className="h-8 w-8">
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
