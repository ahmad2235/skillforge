import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { parseApiError } from "../../lib/apiErrors";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export function BusinessProjectsListPage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<unknown | null>(null);
	const [projects, setProjects] = useState<any[]>([]);
	const [canCreate, setCanCreate] = useState(true);

	const fetchProjects = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await apiClient.get("/business/projects");
			const data = response.data.data ?? response.data;
			setProjects(data);
		} catch (err: unknown) {
			setError(err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProjects();
	}, [fetchProjects]);

	if (loading) {
		return (
			<div className="mx-auto max-w-5xl p-4 sm:p-6">
				<SkeletonList rows={6} />
			</div>
		);
	}

	if (error) {
		const parsed = parseApiError(error);
		return (
			<div className="mx-auto max-w-5xl p-4 sm:p-6">
				<ApiStateCard kind={parsed.kind} description={parsed.message} primaryActionLabel="Retry" onPrimaryAction={fetchProjects} />
			</div>
		);
	}

	if (projects.length === 0) {
		return (
			<div className="mx-auto max-w-5xl p-4 sm:p-6">
				<Card className="space-y-3 border border-slate-200 bg-white p-6 shadow-sm text-center">
					<h3 className="text-lg font-semibold text-slate-900">No projects yet</h3>
					<p className="text-sm text-slate-700">You haven't created any projects yet. Create a project to get applications from students.</p>
					<div className="mt-4 flex justify-center">
						<Button onClick={() => navigate("/business/projects/new")} disabled={!canCreate}>Create project</Button>
					</div>
					{!canCreate && <p className="text-xs text-slate-600 mt-2">Project creation is disabled for your account. Contact support or verify your business profile.</p>}
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<header className="flex items-center justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold text-slate-900">Your Projects</h1>
					<p className="text-sm text-slate-700">Create and manage projects to assign to students.</p>
				</div>
				<Button asChild>
					<Link to="/business/projects/new">+ New Project</Link>
				</Button>
			</header>

			<div className="space-y-3">
				{projects.map((project) => (
					<Card key={project.id} className="border border-slate-200 bg-white p-4 shadow-sm">
						<Link to={`/business/projects/${project.id}`} className="block space-y-2">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold text-slate-900">{project.title}</h2>
								{project.status && (
									<span className="text-xs rounded-full border border-slate-200 px-2 py-0.5 text-slate-700">
										{project.status}
									</span>
								)}
							</div>
							{project.description && (
								<p className="text-sm text-slate-700 line-clamp-2">{project.description}</p>
							)}
							{(project.level || project.domain) && (
								<p className="text-xs text-slate-600">
									{project.level && <>Level: {project.level} · </>}
									{project.domain && <>Domain: {project.domain}</>}
								</p>
							)}
						</Link>
					</Card>
				))}
			</div>
		</div>
	);
}
