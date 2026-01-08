import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import type { PortfolioItem } from "../../types/projects";

export function StudentPortfolioEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    github_url: "",
    live_demo_url: "",
    score: "",
    feedback: "",
    category: "",
    tags: [] as string[],
    is_public: true,
  });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    async function fetchPortfolioItem() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/student/portfolios/${id}`);
        const data = response.data.data ?? response.data;
        setItem(data as PortfolioItem);

        setFormData({
          title: data.title || "",
          description: data.description || "",
          github_url: data.github_url || "",
          live_demo_url: data.live_demo_url || "",
          score: data.score?.toString() || "",
          feedback: data.feedback || "",
          category: data.metadata?.category || "",
          tags: data.metadata?.tags || [],
          is_public: data.is_public ?? true,
        });
      } catch (err: unknown) {
        safeLogError(err, "Portfolio Edit");
        setError(getSafeErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchPortfolioItem();
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;

    setIsSaving(true);
    try {
      const response = await apiClient.put(`/student/portfolios/${id}`, {
        title: formData.title,
        description: formData.description,
        github_url: formData.github_url || null,
        live_demo_url: formData.live_demo_url || null,
        score: formData.score ? parseFloat(formData.score) : null,
        feedback: formData.feedback,
        category: formData.category || null,
        tags: formData.tags,
        is_public: formData.is_public,
      });

      setItem(response.data.portfolio as PortfolioItem);
      navigate(`/student/portfolios/${id}`);
    } catch (err: unknown) {
      safeLogError(err, "Portfolio Update");
      alert("Failed to update: " + getSafeErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
          <p className="text-sm text-slate-300">Loading portfolio item...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error || "Portfolio item not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Edit Portfolio Item</h1>
        <p className="text-sm text-muted-foreground">Update your portfolio details and metadata.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            maxLength={200}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Project title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            maxLength={2000}
            rows={5}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Describe your project..."
          />
        </div>

        {/* GitHub URL */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">GitHub URL</label>
          <input
            type="url"
            name="github_url"
            value={formData.github_url}
            onChange={handleInputChange}
            maxLength={255}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="https://github.com/username/repo"
          />
        </div>

        {/* Live Demo URL */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Live Demo URL</label>
          <input
            type="url"
            name="live_demo_url"
            value={formData.live_demo_url}
            onChange={handleInputChange}
            maxLength={255}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="https://demo.example.com"
          />
        </div>

        {/* Score */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Score (0-100)</label>
          <input
            type="number"
            name="score"
            value={formData.score}
            onChange={handleInputChange}
            min="0"
            max="100"
            step="0.1"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="85.5"
          />
        </div>

        {/* Feedback */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Feedback</label>
          <textarea
            name="feedback"
            value={formData.feedback}
            onChange={handleInputChange}
            maxLength={2000}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Feedback or evaluation..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            maxLength={100}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Web Development, Mobile App"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Tags</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              maxLength={50}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-50 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Public toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleInputChange}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800"
            />
            <span className="text-sm font-medium text-slate-200">Make this portfolio public</span>
          </label>
          <p className="text-xs text-slate-400 mt-1">
            Public portfolios can be viewed by anyone with the link.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
