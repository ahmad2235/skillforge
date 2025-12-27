import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "../../lib/utils";

const routeLabels: Record<string, string> = {
  student: "Student",
  business: "Business",
  admin: "Admin",
  roadmap: "Roadmap",
  placement: "Placement",
  intro: "Intro",
  progress: "In Progress",
  results: "Results",
  blocks: "Block",
  tasks: "Task",
  projects: "Projects",
  assignments: "Assignments",
  portfolios: "Portfolio",
  users: "Users",
  monitoring: "Monitoring",
  dashboard: "Dashboard",
  new: "New",
  candidates: "Candidates",
  profile: "Profile",
  milestones: "Milestones",
  submissions: "Submissions",
  reports: "Reports",
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // If we are at root, don't show breadcrumbs
  if (pathnames.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="hidden md:flex items-center text-sm ml-4 animate-in fade-in slide-in-from-left-1 duration-200"
    >
      <Link
        to="/"
        className="flex items-center text-slate-500 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-100/50"
        title="Home"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>
      
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        
        // Try to get a friendly label
        let label = routeLabels[value] || value;
        
        // Simple capitalization if not in map and looks like a word
        if (!routeLabels[value] && /^[a-z]+$/.test(value)) {
            label = value.charAt(0).toUpperCase() + value.slice(1);
        }

        // If it's a number, it's likely an ID. 
        if (/^\d+$/.test(label)) {
            label = `#${label}`;
        }

        return (
          <Fragment key={to}>
            <ChevronRight className="h-4 w-4 mx-1 text-slate-300 flex-shrink-0" />
            {isLast ? (
              <span 
                className="font-semibold text-slate-900 truncate max-w-[200px]" 
                aria-current="page"
                title={label}
              >
                {label}
              </span>
            ) : (
              <Link
                to={to}
                className="font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};
