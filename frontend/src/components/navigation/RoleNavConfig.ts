export type RoleKey = "student" | "business" | "admin";

import { LayoutDashboard, Map, ClipboardList, Briefcase, Folder, Flag, PlusSquare, Monitor, Users, FileText, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  path: string;
  icon?: LucideIcon; // Optional icon component from lucide-react
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const placementHiddenPrefixes = ["/placement", "/student/placement"];

export const isPlacementPath = (pathname: string) =>
  placementHiddenPrefixes.some((prefix) => pathname.startsWith(prefix));

export const roleNavConfig: Record<RoleKey, NavGroup[]> = {
  student: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", path: "/student", icon: LayoutDashboard },
        { label: "Roadmap", path: "/student/roadmap", icon: Map },
        { label: "Assignments", path: "/student/assignments", icon: ClipboardList },
        { label: "Portfolio", path: "/student/portfolios", icon: Folder },
        { label: "Placement", path: "/student/placement", icon: Flag },
      ],
    },
  ],
  business: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", path: "/business", icon: LayoutDashboard },
        { label: "Projects", path: "/business/projects", icon: Briefcase },
        { label: "New Project", path: "/business/projects/new", icon: PlusSquare },
        { label: "Monitoring", path: "/business/monitoring", icon: Monitor },
      ],
    },
  ],
  admin: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "People",
      items: [
        { label: "Users", path: "/admin/users", icon: Users },
        { label: "Students", path: "/admin/students", icon: Users },
      ],
    },
    {
      label: "Projects",
      items: [
        { label: "Projects", path: "/admin/projects", icon: Briefcase },
      ],
    },
    {
      label: "Learning",
      items: [
        { label: "Blocks", path: "/admin/learning/blocks", icon: FileText },
      ],
    },
    {
      label: "Assessment",
      items: [{ label: "Questions", path: "/admin/assessment/questions", icon: HelpCircle }],
    },
    {
      label: "Monitoring",
      items: [
        { label: "Monitoring", path: "/admin/monitoring", icon: Monitor },
        { label: "Milestone reviews", path: "/admin/milestones/submissions" },
      ],
    },
  ],
};
