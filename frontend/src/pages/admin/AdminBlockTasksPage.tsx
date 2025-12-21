import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Task = {
  id: number;
  title: string;
  description?: string | null;
  type: string;
  difficulty?: number | null;
  max_score?: number | null;
  is_active?: boolean;
};

type TasksResponse = {
  data: Task[];
};

export function AdminBlockTasksPage() {
  const { blockId } = useParams<{ blockId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reloadFlag, setReloadFlag] = useState(0);

  // dialog / form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<string>("project");
  const [formDifficulty, setFormDifficulty] = useState<string>("1");
  const [formMaxScore, setFormMaxScore] = useState<string>("100");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // ============= FETCH =============
  useEffect(() => {
    if (!blockId) return;

    const controller = new AbortController();

    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.get<TasksResponse | Task[]>(
          `/admin/learning/blocks/${blockId}/tasks`,
          { signal: controller.signal }
        );

        const payload = res.data;

        if (Array.isArray(payload)) {
          setTasks(payload);
        } else {
          setTasks(payload.data || []);
        }
      } catch (err: unknown) {
        // Abort: ignore
        if (err instanceof Error && err.name === "AbortError") return;
        console.error(err);
        setError("Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    }

    void fetchTasks();

    return () => controller.abort();
  }, [blockId, reloadFlag]);

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // ============= DIALOG HELPERS =============

  const openCreateDialog = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormTitle("");
    setFormDescription("");
    setFormType("project");
    setFormDifficulty("1");
    setFormMaxScore("100");
    setFormIsActive(true);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setIsEditMode(true);
    setCurrentId(task.id);
    setFormTitle(task.title || "");
    setFormDescription(task.description || "");
    setFormType(task.type || "project");
    setFormDifficulty(task.difficulty != null ? String(task.difficulty) : "1");
    setFormMaxScore(task.max_score != null ? String(task.max_score) : "100");
    setFormIsActive(task.is_active ?? true);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && !formSaving) {
      setIsDialogOpen(false);
    } else {
      setIsDialogOpen(open);
    }
  };

  // ============= SAVE (CREATE / EDIT) =============

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!blockId) return;

    if (!formTitle.trim()) {
      setFormError("Title is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      type: formType,
      difficulty: Number(formDifficulty) || 1,
      max_score: Number(formMaxScore) || 100,
      is_active: formIsActive ? 1 : 0,
    };

    try {
      setFormSaving(true);
      setFormError(null);

      if (isEditMode && currentId != null) {
        await apiClient.put(`/admin/learning/tasks/${currentId}`, payload);
      } else {
        await apiClient.post(
          `/admin/learning/blocks/${blockId}/tasks`,
          payload
        );
      }

      setReloadFlag((x) => x + 1);
      setIsDialogOpen(false);
    } catch (err: unknown) {
      console.error(err);
      const message = "Failed to save task.";
      setFormError(message);
    } finally {
      setFormSaving(false);
    }
  };

  // ============= DELETE =============

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    try {
      await apiClient.delete(`/admin/learning/tasks/${task.id}`);
      setReloadFlag((x) => x + 1);
    } catch (err) {
      console.error(err);
      alert("Failed to delete task.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <Card className="p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/admin/learning/blocks" className="hover:underline">
                Blocks
              </Link>
              <span>/</span>
              <span>Block {blockId}</span>
            </div>
            <h2 className="text-lg font-semibold mt-1">
              Tasks for Block {blockId}
            </h2>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search tasks by title..."
              value={search}
              onChange={handleSearchChange}
              className="w-48"
            />
            <Button
              variant="outline"
              onClick={() => setReloadFlag((x) => x + 1)}
            >
              Refresh
            </Button>
            <Button onClick={openCreateDialog}>Create Task</Button>
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Max Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.id}</TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="capitalize">{task.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.difficulty ?? "-"}</Badge>
                    </TableCell>
                    <TableCell>{task.max_score ?? "-"}</TableCell>
                    <TableCell>
                      {task.is_active ? (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-red-400 text-red-500"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(task)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(task)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Task" : "Create Task"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Simple HTML Page"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the task..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formType}
                  onValueChange={(value) => setFormType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={formDifficulty}
                  onValueChange={(value) => setFormDifficulty(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_score">Max Score</Label>
                <Input
                  id="max_score"
                  type="number"
                  value={formMaxScore}
                  onChange={(e) => setFormMaxScore(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(!!checked)}
              />
            </div>

            {formError && (
              <div className="text-sm text-red-500">{formError}</div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={formSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formSaving}>
                {formSaving
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                  ? "Save Changes"
                  : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
