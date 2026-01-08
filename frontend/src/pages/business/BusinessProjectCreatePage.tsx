import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Card } from "../../components/ui/card";

type LevelOption = "beginner" | "intermediate" | "advanced";
type DomainOption = "frontend" | "backend" | "fullstack";
type ComplexityOption = "low" | "medium" | "high";

interface MilestoneSuggestion {
  title: string;
  description?: string;
  due_in_weeks?: number | null;
  is_required?: boolean;
  order_index?: number;
}

interface PdfAnalysis {
  domain: DomainOption;
  required_level: LevelOption;
  complexity: ComplexityOption;
  language_or_framework?: string[];
  estimates?: {
    pdf_pages?: number;
    ui_pages?: { min: number; max: number };
    db_tables?: { min: number; max: number };
    db_size?: string;
  };
  milestones?: MilestoneSuggestion[];
  reasons?: {
    required_level?: string;
    complexity?: string;
    language_or_framework?: string;
  };
}

export function BusinessProjectCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredLevel, setRequiredLevel] = useState<LevelOption>("beginner");
  const [domain, setDomain] = useState<DomainOption>("frontend");
  const [complexity, setComplexity] = useState<ComplexityOption>("low");
  const [requirementsPdf, setRequirementsPdf] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfAnalysis, setPdfAnalysis] = useState<PdfAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [autoCreateMilestones, setAutoCreateMilestones] = useState(true);

  async function analyzePdf() {
    if (!requirementsPdf) return;

    setIsAnalyzing(true);
    setError(null);
    setPdfAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("pdf", requirementsPdf);

      const response = await apiClient.post("/ai/analyze-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.success && response.data?.data) {
        const analysis = response.data.data as PdfAnalysis & { title?: string; description?: string };
        setPdfAnalysis(analysis);
        setShowAnalysis(true);

        // Auto-fill fields with AI suggestions
        setDomain(analysis.domain);
        setRequiredLevel(analysis.required_level);
        setComplexity(analysis.complexity);
        if (analysis.title) setTitle(analysis.title);
        if (analysis.description) setDescription(analysis.description);
      } else {
        setError(response.data?.error || "Failed to analyze PDF.");
      }
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        "Failed to analyze PDF. The AI service may be unavailable.";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handlePdfChange(file: File | null) {
    setRequirementsPdf(file);
    setPdfAnalysis(null);
    setShowAnalysis(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!title.trim() && !requirementsPdf) {
      setError("Title is required unless you upload a PDF to auto-suggest it.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description);
      formData.append("domain", domain);
      formData.append("required_level", requiredLevel);
      formData.append("complexity", complexity);
      if (requirementsPdf) {
        formData.append("requirements_pdf", requirementsPdf);
      }

      // Send whether to auto-create milestones (1 or 0)
      formData.append("auto_create_milestones", autoCreateMilestones ? "1" : "0");

      const response = await apiClient.post("/business/projects", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const created = response.data?.data ?? response.data;
      const id = created?.id;

      if (id) {
        navigate(`/business/projects/${id}`);
      } else {
        navigate("/business/projects");
      }
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to create project. Please check your input.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-8 animate-page-enter">
      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <Card className="space-y-4 border border-border bg-card p-6 shadow-sm animate-card-enter">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Project</h1>
            <p className="text-muted-foreground text-sm">
              Define a project that students can work on. You can later invite
              specific students or let the system recommend candidates.
            </p>

            <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-950/10 p-3 text-sm text-amber-100">
              <strong className="block text-amber-300">Important:</strong>
              Uploading a <span className="font-medium">Requirements PDF</span> is recommended — it will auto-suggest the project title, domain, level, and complexity, and can <span className="font-medium">generate suggested milestones</span> for this project.
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-700/20 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="title" className="block text-sm text-slate-300">
                Title
              </label>
              <input
                id="title"
                className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="E.g. Landing page for SaaS startup"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm text-slate-300">
                Description
              </label>
              <textarea
                id="description"
                className="w-full min-h-[120px] rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about? What skills are needed?"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="block text-sm text-slate-300">Required level</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50"
                  value={requiredLevel}
                  onChange={(e) => setRequiredLevel(e.target.value as LevelOption)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-300">Domain</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as DomainOption)}
                >
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                  <option value="fullstack">Full Stack</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-300">Complexity</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50"
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value as ComplexityOption)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-300">Requirements PDF</label>

              <div className="flex items-center gap-3">
                <input
                  id="requirements_pdf_input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handlePdfChange(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => document.getElementById('requirements_pdf_input')?.click()}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-50 hover:bg-slate-700"
                >
                  <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">{requirementsPdf ? 'Change file' : 'Choose file'}</span>
                </button>

                {requirementsPdf ? (
                  <div className="flex items-center gap-3">
                    <div className="truncate max-w-xs text-sm text-slate-200">{requirementsPdf.name}</div>
                    <button
                      type="button"
                      onClick={() => handlePdfChange(null)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Remove
                    </button>
                    {!showAnalysis && (
                      <button
                        type="button"
                        onClick={analyzePdf}
                        disabled={isAnalyzing}
                        className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-1 text-xs font-medium text-white whitespace-nowrap"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze PDF'}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="auto-create-milestones"
                  type="checkbox"
                  checked={autoCreateMilestones}
                  onChange={(e) => setAutoCreateMilestones(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-700 bg-slate-900/80 text-violet-600"
                />
                <label htmlFor="auto-create-milestones" className="text-xs text-slate-300">
                  Automatically create suggested milestones from the PDF analysis (recommended)
                </label>
              </div>

              <p className="text-xs text-slate-400">
                Upload a project brief and click "Analyze PDF" to auto-suggest title, domain, level, and complexity. When saved, suggested milestones will be created (if enabled).
              </p>
            </div>

            {/* PDF Analysis Results */}
            {showAnalysis && pdfAnalysis && (
              <Card className="border border-violet-600/30 bg-violet-950/20 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-semibold text-violet-100">AI Analysis Results</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAnalysis(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Suggested Title/Description */}
                {(pdfAnalysis as any).title && (
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Suggested Title</p>
                    <p className="font-medium text-violet-200">{(pdfAnalysis as any).title}</p>
                  </div>
                )}
                {(pdfAnalysis as any).description && (
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Suggested Description</p>
                    <p className="text-slate-200 text-sm leading-relaxed">{(pdfAnalysis as any).description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Domain</p>
                    <p className="font-medium text-violet-200 capitalize">{pdfAnalysis.domain}</p>
                    {pdfAnalysis.reasons?.language_or_framework && (
                      <p className="text-xs text-slate-400 mt-1">{pdfAnalysis.reasons.language_or_framework}</p>
                    )}
                  </div>
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Required Level</p>
                    <p className="font-medium text-violet-200 capitalize">{pdfAnalysis.required_level}</p>
                    {pdfAnalysis.reasons?.required_level && (
                      <p className="text-xs text-slate-400 mt-1">{pdfAnalysis.reasons.required_level}</p>
                    )}
                  </div>
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Complexity</p>
                    <p className="font-medium text-violet-200 capitalize">{pdfAnalysis.complexity}</p>
                    {pdfAnalysis.reasons?.complexity && (
                      <p className="text-xs text-slate-400 mt-1">{pdfAnalysis.reasons.complexity}</p>
                    )}
                  </div>
                </div>

                {pdfAnalysis.language_or_framework && pdfAnalysis.language_or_framework.length > 0 && (
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-2">Technologies Detected</p>
                    <div className="flex flex-wrap gap-2">
                      {pdfAnalysis.language_or_framework.map((tech, idx) => (
                        <span key={idx} className="px-2 py-1 bg-violet-900/30 border border-violet-600/30 rounded text-xs text-violet-200">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {pdfAnalysis.milestones && pdfAnalysis.milestones.length > 0 && (
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-2">Suggested Milestones</p>
                    <ol className="list-decimal pl-4 space-y-2 text-sm text-slate-200">
                      {pdfAnalysis.milestones.slice(0, 6).map((m, idx) => (
                        <li key={idx}>
                          <div className="font-medium text-violet-200">{m.title}</div>
                          {m.description && <div className="text-xs text-slate-400">{m.description}</div>}
                          <div className="text-xs text-slate-400 mt-1">{m.due_in_weeks != null ? `${m.due_in_weeks} week(s)` : "Due: TBD"} {m.is_required === false ? "· Optional" : ""}</div>
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs text-slate-400 mt-2">
                      These milestones will be created when you save the project if "Automatically create suggested milestones" is enabled.
                    </p>
                  </div>
                )}

                {pdfAnalysis.estimates && (
                  <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-2">Project Estimates</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {pdfAnalysis.estimates.pdf_pages && pdfAnalysis.estimates.pdf_pages > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">PDF Pages</p>
                          <p className="font-medium text-slate-200">{pdfAnalysis.estimates.pdf_pages}</p>
                        </div>
                      )}
                      {pdfAnalysis.estimates.ui_pages && (
                        <div>
                          <p className="text-xs text-slate-500">UI Pages</p>
                          <p className="font-medium text-slate-200">
                            {pdfAnalysis.estimates.ui_pages.min}-{pdfAnalysis.estimates.ui_pages.max}
                          </p>
                        </div>
                      )}
                      {pdfAnalysis.estimates.db_tables && (
                        <div>
                          <p className="text-xs text-slate-500">DB Tables</p>
                          <p className="font-medium text-slate-200">
                            {pdfAnalysis.estimates.db_tables.min}-{pdfAnalysis.estimates.db_tables.max}
                          </p>
                        </div>
                      )}
                      {pdfAnalysis.estimates.db_size && (
                        <div>
                          <p className="text-xs text-slate-500">DB Size</p>
                          <p className="font-medium text-slate-200 capitalize">{pdfAnalysis.estimates.db_size}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/30 rounded-md p-2 border border-slate-700/30">
                  <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>
                    These are AI-generated suggestions. You can manually adjust any field before creating the project.
                  </p>
                </div>
              </Card>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
