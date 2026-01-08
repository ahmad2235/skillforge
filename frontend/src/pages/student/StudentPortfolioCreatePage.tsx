import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";

export function StudentPortfolioCreatePage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"adhoc" | "from-assignment">("adhoc");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    github_url: "",
    live_demo_url: "",
    score: "",
    feedback: "",
    category: "",
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setIsSaving(true);

    try {
      const response = await apiClient.post("/student/portfolios", {
        title: formData.title,
        description: formData.description,
        github_url: formData.github_url || null,
        live_demo_url: formData.live_demo_url || null,
        score: formData.score ? parseFloat(formData.score) : null,
        feedback: formData.feedback,
        category: formData.category || null,
        tags: formData.tags,
      });

      navigate(`/student/portfolios/${response.data.portfolio.id}`);
    } catch (err: unknown) {
      safeLogError(err, "Portfolio Create");
      alert("Failed to create: " + getSafeErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-page-enter max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Create Portfolio Item</h1>
        <p className="text-sm text-muted-foreground">
          Add a new project to your professional portfolio.
        </p>
      </header>

      {/* Tab selection */}
      <div className="flex gap-3 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("adhoc")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "adhoc"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Create New
        </button>
        <button
          onClick={() => setActiveTab("from-assignment")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "from-assignment"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          From Assignment
        </button>
      </div>

      {activeTab === "adhoc" && (
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
              placeholder="Describe your project, what it does, and what you learned..."
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
              placeholder="e.g., 85.5"
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
              placeholder="Any feedback or evaluation notes..."
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
              placeholder="e.g., Web Development, Mobile App, Data Science"
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
                placeholder="Add a skill or technology and press Enter (e.g., React, Node.js)"
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

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/student/portfolios")}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create Portfolio Item"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "from-assignment" && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
          <p className="text-slate-300 mb-4">
            To add a portfolio item from a completed assignment, navigate to your assignments page
            and use the "Add to Portfolio" button on completed projects.
          </p>
          <button
            onClick={() => navigate("/student/assignments")}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm"
          >
            View My Assignments
          </button>
        </div>
      )}
    </div>
  );
}
