import { Fragment, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const routeLabels: Record<string, string> = {
  student: "Student",
  business: "Business",
  admin: "Admin",
  roadmap: "Roadmap",
  placement: "Placement",
  intro: "Intro",
  progress: "In Progress",
  results: "Results",
  blocks: "Blocks",
  tasks: "Tasks",
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

type BreadcrumbItem = {
  label: string;
  to: string;
  isLast: boolean;
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const state = (location as any).state ?? {};

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function buildBreadcrumbs() {
      // If we are at root, don't show breadcrumbs
      if (pathnames.length === 0) {
        setBreadcrumbs([]);
        return;
      }

      // Special handling for student task pages: /student/tasks/:id
      if (pathnames[0] === 'student' && pathnames[1] === 'tasks' && pathnames.length === 3) {
        const taskId = pathnames[2];
        
        // Try to get data from state first
        let taskTitle = state?.taskTitle || null;
        let blockTitle = state?.blockTitle || null;
        let blockId = state?.blockId || null;

        // If we don't have the data in state, fetch it
        if (!taskTitle || !blockTitle) {
          setLoading(true);
          try {
            const res = await apiClient.get(`/student/tasks/${taskId}`);
            const taskData = res.data?.data ?? res.data;
            taskTitle = taskData?.title || `Task #${taskId}`;
            blockId = taskData?.roadmap_block_id || blockId;

            // Get block title from the task response
            if (!blockTitle && taskData?.block) {
              blockTitle = taskData.block.title;
              blockId = taskData.block.id || blockId;
            } else if (blockId && !blockTitle) {
              blockTitle = `Block #${blockId}`;
            }
          } catch (err) {
            taskTitle = `Task #${taskId}`;
            blockTitle = blockId ? `Block #${blockId}` : 'Unknown Block';
          } finally {
            setLoading(false);
          }
        }

        // Build custom breadcrumb: Home > Student > Roadmap > Blocks > BlockTitle > TaskTitle
        setBreadcrumbs([
          { label: 'Student', to: '/student', isLast: false },
          { label: 'Roadmap', to: '/student/roadmap', isLast: false },
          { label: 'Blocks', to: '/student/roadmap', isLast: false },
          { label: blockTitle || 'Block', to: blockId ? `/student/blocks/${blockId}` : '/student/roadmap', isLast: false },
          { label: taskTitle || `Task #${taskId}`, to: location.pathname, isLast: true },
        ]);
        return;
      }

      // Special handling for student block pages: /student/blocks/:id
      if (pathnames[0] === 'student' && pathnames[1] === 'blocks' && pathnames.length === 3) {
        const blockId = pathnames[2];
        let blockTitle = state?.blockTitle || `Block #${blockId}`;

        // Build custom breadcrumb: Home > Student > Roadmap > Blocks > BlockTitle
        setBreadcrumbs([
          { label: 'Student', to: '/student', isLast: false },
          { label: 'Roadmap', to: '/student/roadmap', isLast: false },
          { label: 'Blocks', to: '/student/roadmap', isLast: false },
          { label: blockTitle, to: location.pathname, isLast: true },
        ]);
        return;
      }

      // Default breadcrumb building for other pages
      const items: BreadcrumbItem[] = pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        
        let label = routeLabels[value] || value;
        
        if (!routeLabels[value] && /^[a-z]+$/.test(value)) {
          label = value.charAt(0).toUpperCase() + value.slice(1);
        }

        if (/^\d+$/.test(value)) {
          label = `#${value}`;
        }

        return { label, to, isLast };
      });

      setBreadcrumbs(items);
    }

    buildBreadcrumbs();
  }, [location.pathname, state?.taskTitle, state?.blockTitle, state?.blockId]);

  if (breadcrumbs.length === 0 && !loading) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="hidden md:flex items-center text-sm ml-4 animate-in fade-in slide-in-from-left-1 duration-200"
    >
      <Link
        to="/"
        className="flex items-center text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-md hover:bg-slate-800/60"
        title="Home"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>
      
      {breadcrumbs.map((item, index) => (
        <Fragment key={item.to + index}>
          <ChevronRight className="h-4 w-4 mx-1 text-slate-300 flex-shrink-0" />
          {item.isLast ? (
            <span 
              className="font-semibold text-slate-100 truncate max-w-[200px]" 
              aria-current="page"
              title={item.label}
            >
              {item.label}
            </span>
          ) : (
            <Link
              to={item.to}
              className="font-medium text-slate-400 hover:text-slate-100 transition-colors truncate max-w-[150px]"
              title={item.label}
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
};
