import {
  useEffect,
  useState,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

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

type RoadmapBlock = {
  id: number;
  title: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced" | string;
  domain?: "frontend" | "backend" | "fullstack" | string;
  order_index?: number | null;
  is_optional?: boolean;
  tasks_count?: number;
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page?: number;
  };
};

export function AdminLearningBlocksPage() {
  const [blocks, setBlocks] = useState<RoadmapBlock[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<
    "title" | "level" | "domain" | "order_index"
  >("order_index");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // reload after create/edit
  const [reloadFlag, setReloadFlag] = useState(0);

  // dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLevel, setFormLevel] = useState<string>("");
  const [formDomain, setFormDomain] = useState<string>("");
  const [formIsOptional, setFormIsOptional] = useState(false);
  const [formOrder, setFormOrder] = useState<number | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Local sort helper — used because backend ignores arbitrary sort queries
  const applyLocalSort = useCallback(
    (list: RoadmapBlock[]) => {
      const copy = [...list];
      copy.sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;
        switch (sortField) {
          case "order_index": {
            const av = a.order_index ?? 0;
            const bv = b.order_index ?? 0;
            return (av - bv) * dir;
          }
          case "title": {
            const av = a.title?.toLowerCase() ?? "";
            const bv = b.title?.toLowerCase() ?? "";
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          }
          case "level": {
            const av = a.level ?? "";
            const bv = b.level ?? "";
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          }
          case "domain": {
            const av = a.domain ?? "";
            const bv = b.domain ?? "";
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          }
          default:
            return 0;
        }
      });
      return copy;
    },
    [sortField, sortDirection]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBlocks() {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<PaginatedResponse<RoadmapBlock>>(
          "/admin/learning/blocks",
          {
            params: {
              page,
              search: search || undefined,
              sort: sortField,
              direction: sortDirection,
            },
            signal: controller.signal,
          }
        );

        const payload = response.data;

        // support API returning either a paginated object or plain array
        if (Array.isArray(payload)) {
          const list = payload as RoadmapBlock[];
          // sort client-side — backend doesn't support arbitrary sort params yet
          const sorted = applyLocalSort(list);
          setBlocks(sorted);
          setLastPage(1);
          setTotal(list.length || 0);
        } else {
          const list = payload.data || [];
          const sorted = applyLocalSort(list);
          setBlocks(sorted);
          if (payload.meta) {
            setPage(payload.meta.current_page);
            setLastPage(payload.meta.last_page);
            setTotal(payload.meta.total);
          } else {
            setLastPage(1);
            setTotal(payload.data?.length || 0);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error(err);
        setError("Failed to load blocks.");
      } finally {
        setLoading(false);
      }
    }

    void fetchBlocks();

    return () => {
      controller.abort();
    };
  }, [page, search, sortField, sortDirection, reloadFlag, applyLocalSort]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const toggleSort = (field: "title" | "level" | "domain" | "order_index") => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // =========================
  //    DIALOG HELPERS
  // =========================

  const openCreateDialog = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormTitle("");
    setFormDescription("");
    setFormLevel("");
    setFormDomain("");
    setFormIsOptional(false);
    setFormOrder("");
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (block: RoadmapBlock) => {
    setIsEditMode(true);
    setCurrentId(block.id);
    setFormTitle(block.title || "");
    setFormDescription(block.description || "");
    setFormLevel(block.level || "");
    setFormDomain(block.domain || "");
    setFormIsOptional(block.is_optional ?? false);
    setFormOrder(block.order_index ?? "");
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    // prevent closing while saving
    if (!open && formSaving) return;
    setIsDialogOpen(open);
  };

  // =========================
  //     SAVE (CREATE/EDIT)
  // =========================

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError("Title is required.");
      return;
    }

    // Validate order index (backend requires an order_index)
    if (formOrder === "" || formOrder === null) {
      setFormError("Order index is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      level: formLevel || null,
      domain: formDomain || null,
      is_optional: formIsOptional,
      order_index: typeof formOrder === "number" ? formOrder : null,
    };

    try {
      setFormSaving(true);

      const newIndex =
        typeof formOrder === "number" ? formOrder : Number(formOrder);

      // If creating, shift existing blocks with order_index >= newIndex up by 1
      if (!isEditMode) {
        // only attempt to shift what's available in our current local list
        const toShift = blocks
          .filter((b) => (b.order_index ?? 0) >= newIndex)
          // descending so we don't collide while incrementing
          .sort((a, b) => (b.order_index ?? 0) - (a.order_index ?? 0));

        for (const b of toShift) {
          try {
            await apiClient.put(`/admin/learning/blocks/${b.id}`, {
              order_index: (b.order_index ?? 0) + 1,
            });
          } catch (err) {
            // Non-fatal, continue — we'll still attempt to create the block
            console.warn("failed to shift block", b.id, err);
          }
        }

        await apiClient.post(`/admin/learning/blocks`, payload);
      } else if (isEditMode && currentId != null) {
        // editing: we must adjust other blocks if order changed
        const current = blocks.find((b) => b.id === currentId);
        const oldIndex = current?.order_index ?? null;

        if (oldIndex != null && newIndex !== oldIndex) {
          if (newIndex < oldIndex) {
            // moving up: increment any block with idx >= newIndex and < oldIndex
            const toInc = blocks
              .filter(
                (b) =>
                  b.id !== currentId &&
                  (b.order_index ?? 0) >= newIndex &&
                  (b.order_index ?? 0) < oldIndex
              )
              .sort((a, b) => (b.order_index ?? 0) - (a.order_index ?? 0));

            for (const b of toInc) {
              try {
                await apiClient.put(`/admin/learning/blocks/${b.id}`, {
                  order_index: (b.order_index ?? 0) + 1,
                });
              } catch (err) {
                console.warn("failed to shift up block", b.id, err);
              }
            }
          } else {
            // moving down: decrement any block with idx <= newIndex and > oldIndex
            const toDec = blocks
              .filter(
                (b) =>
                  b.id !== currentId &&
                  (b.order_index ?? 0) <= newIndex &&
                  (b.order_index ?? 0) > oldIndex
              )
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

            for (const b of toDec) {
              try {
                await apiClient.put(`/admin/learning/blocks/${b.id}`, {
                  order_index: (b.order_index ?? 0) - 1,
                });
              } catch (err) {
                console.warn("failed to shift down block", b.id, err);
              }
            }
          }
        }

        // finally update current block
        await apiClient.put(`/admin/learning/blocks/${currentId}`, payload);
      }

      // reload list
      setReloadFlag((x) => x + 1);
      setIsDialogOpen(false);
    } catch (err: unknown) {
      console.error(err);
      // Prefer server-provided message if available (validation, auth, etc.)
      let message = "Failed to save block.";
      if (axios.isAxiosError(err)) {
        const resp = err.response?.data as unknown;
        if (resp && typeof resp === "object") {
          const r = resp as Record<string, unknown>;
          if (typeof r.message === "string") message = r.message;
          else if (typeof r.errors === "object" && r.errors !== null) {
            try {
              // collect values from errors object
              const values = Object.values(r.errors as Record<string, unknown>);
              const flattened: string[] = [];
              values.forEach((v) => {
                if (Array.isArray(v)) flattened.push(...v.map(String));
                else if (typeof v === "string") flattened.push(v);
                else flattened.push(String(v));
              });
              message = flattened.join(" ");
            } catch {
              message = JSON.stringify(r);
            }
          } else {
            message = JSON.stringify(r);
          }
        } else {
          message = err.message;
        }
      }
      setFormError(message);
    } finally {
      setFormSaving(false);
    }
  };

  const sortArrow = (field: "title" | "level" | "domain" | "order_index") =>
    sortField === field ? (sortDirection === "asc" ? "↑" : "↓") : "";

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 animate-page-enter">
      <Card className="p-4 space-y-4 animate-card-enter">
        {/* Filters / Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search blocks by title..."
              value={search}
              onChange={handleSearchChange}
              className="max-w-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadFlag((x) => x + 1)}
            >
              Refresh
            </Button>
            <Button size="sm" onClick={() => openCreateDialog()}>
              Create Block
            </Button>
          </div>
        </div>

        {/* Show the error text only when there's no data so users aren't confused by transient errors */}
        {error && blocks.length === 0 && (
          <div className="text-sm text-red-500">{error}</div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="w-[60px] cursor-pointer select-none"
                  onClick={() => toggleSort("order_index")}
                >
                  Order {sortArrow("order_index")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("title")}
                >
                  Title {sortArrow("title")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("level")}
                >
                  Level {sortArrow("level")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("domain")}
                >
                  Domain {sortArrow("domain")}
                </TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Type</TableHead>
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
                    Loading blocks...
                  </TableCell>
                </TableRow>
              ) : blocks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No blocks found.
                  </TableCell>
                </TableRow>
              ) : (
                blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>{block.order_index ?? "-"}</TableCell>
                    <TableCell className="font-medium">{block.title}</TableCell>
                    <TableCell className="capitalize">
                      {block.level || "-"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {block.domain || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {block.tasks_count ?? 0} tasks
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {block.is_optional ? (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-500"
                        >
                          Optional
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                          Required
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(block)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/admin/learning/blocks/${block.id}/tasks`)
                        }
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {lastPage} ({total} blocks)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Block" : "Create Block"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. HTML Basics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Short description of this block..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select
                  value={formLevel}
                  onValueChange={(v) => setFormLevel(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Domain</Label>
                <Select
                  value={formDomain}
                  onValueChange={(v) => setFormDomain(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="fullstack">Fullstack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-slate-200">
                  Order (required)
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={formOrder}
                  onChange={(e) =>
                    setFormOrder(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between space-y-0">
              <Label htmlFor="is_optional">Optional</Label>
              <Switch
                id="is_optional"
                checked={formIsOptional}
                onCheckedChange={(c) => setFormIsOptional(!!c)}
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
                  : "Create Block"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
