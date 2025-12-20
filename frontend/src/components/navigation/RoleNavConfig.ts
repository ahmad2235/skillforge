export type RoleKey = "student" | "business" | "admin";

export type NavItem = {
  label: string;
  path: string;
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
        { label: "Dashboard", path: "/student" },
        { label: "Roadmap", path: "/student/roadmap" },
        { label: "Assignments", path: "/student/assignments" },
        { label: "Portfolio", path: "/student/portfolios" },
        { label: "Placement", path: "/student/placement" },
      ],
    },
  ],
  business: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", path: "/business" },
        { label: "Projects", path: "/business/projects" },
        { label: "New Project", path: "/business/projects/new" },
        { label: "Monitoring", path: "/business/monitoring" },
      ],
    },
  ],
  admin: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", path: "/admin/dashboard" }],
    },
    {
      label: "People",
      items: [
        { label: "Users", path: "/admin/users" },
        { label: "Students", path: "/admin/students" },
      ],
    },
    {
      label: "Projects",
      items: [
        { label: "Projects", path: "/admin/projects" },
      ],
    },
    {
      label: "Learning",
      items: [
        { label: "Blocks", path: "/admin/learning/blocks" },
      ],
    },
    {
      label: "Assessment",
      items: [{ label: "Questions", path: "/admin/assessment/questions" }],
    },
    {
      label: "Monitoring",
      items: [
        { label: "Monitoring", path: "/admin/monitoring" },
        { label: "Milestone reviews", path: "/admin/milestones/submissions" },
      ],
    },
  ],
};
