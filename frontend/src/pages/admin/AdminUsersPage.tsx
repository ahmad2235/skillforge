import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import EmptyState from "@/components/feedback/EmptyState";
import { useAppToast } from "@/components/feedback/useAppToast";
import { apiClient } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiErrors";
import { ApiStateCard } from "@/components/shared/ApiStateCard";

type ApiUser = {
  id: number | string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  level?: string | null;
  domain?: string | null;
  created_at?: string;
  createdAt?: string;
};

type ApiMeta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

const toLabel = (value?: string | null) => {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const normalize = (value?: string | null) => (value || "").toLowerCase();

export default function AdminUsersPage() {
  const { toastSuccess } = useAppToast();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<ReturnType<typeof parseApiError> | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  // If backend only exposes students, we can render users list from students endpoint
  const [showingStudentsInstead, setShowingStudentsInstead] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        const res = await apiClient.get("/admin/users", {
          params: page ? { page } : undefined,
        });

        const payload = res.data?.data ?? res.data ?? [];
        const metaPayload: ApiMeta | null = res.data?.meta ?? null;

        if (!active) return;
        setUsers(Array.isArray(payload) ? payload : []);
        setMeta(metaPayload && metaPayload.current_page ? metaPayload : null);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED") return;
        // If the backend doesn't have /admin/users, fallback to /admin/students so admin can still view accounts
        if (err?.status === 404) {
          try {
            const r2 = await apiClient.get("/admin/students", { params: page ? { page } : undefined });
            const payload2 = r2.data?.data ?? r2.data ?? [];
            const meta2: ApiMeta | null = r2.data?.meta ?? null;
            if (!active) return;
            setUsers(Array.isArray(payload2) ? payload2 : []);
            setMeta(meta2 && meta2.current_page ? meta2 : null);
            setShowingStudentsInstead(true);
            return;
          } catch (err2: unknown) {
            if (!active) return;
            setApiError(parseApiError(err2));
            setUsers([]);
            setMeta(null);
            return;
          }
        }

        if (!active) return;
        setApiError(parseApiError(err));
        setUsers([]);
        setMeta(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      active = false;
    };
  }, [page]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (user.name || "").toLowerCase().includes(search) ||
        (user.email || "").toLowerCase().includes(search);
      const matchesRole = roleFilter === "all" || normalize(user.role) === roleFilter;
      const matchesStatus = statusFilter === "all" || normalize(user.status) === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const hasUsers = filteredUsers.length > 0;
  const showPagination = meta?.current_page && meta?.last_page && meta.last_page > 1;

  const handleView = (user: ApiUser) => {
    setSelectedUser(user);

    if (!user.id) return;
    setIsDetailLoading(true);
    apiClient
      .get(`/admin/users/${user.id}`)
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        if (payload) {
          setSelectedUser(payload);
        }
      })
      .catch(() => {
        // fallback to list data on error
      })
      .finally(() => setIsDetailLoading(false));
  };

  // Admin actions not implemented yet: disable and show 'coming soon' UX instead of fake toasts
  const handleToggleStatus = (user: ApiUser) => {
    // noop — action coming soon
    // Optionally, could open a modal in future
  };

  const handleRoleChange = (value: string) => {
    // noop — coming soon
    // keep UI state locally to reflect selection but do NOT send to server
    if (!selectedUser) return;
    setSelectedUser({ ...selectedUser, role: value });
  };

  const handleResetPassword = () => {
    // noop — coming soon
  };

  const handleAddUser = () => {
    // noop — coming soon
  };

  const handleExport = () => {
    // noop — coming soon
  };

  const handleRefresh = () => {
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{showingStudentsInstead ? "Students" : "Users"}</h1>
        <p className="text-sm text-muted-foreground">Manage accounts, roles, and activity.</p>
      </header>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-6">
            <div className="flex-1 min-w-[220px]">
              <Input
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button disabled className="opacity-60">Add user (coming soon)</Button>
              <Button variant="outline" disabled className="opacity-60">
                Export (coming soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            ) : apiError ? (
              <div className="p-6">
                <ApiStateCard
                  kind={apiError.kind}
                  description={apiError.message}
                  primaryActionLabel="Retry"
                  onPrimaryAction={() => {
                    setApiError(null);
                    setPage(1);
                  }}
                />
              </div>
            ) : !hasUsers ? (
              <div className="p-6">
                <EmptyState
                  title="No users yet"
                  description="New users will appear here."
                  primaryActionLabel="Refresh"
                  onPrimaryAction={handleRefresh}
                />
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1.5fr_0.7fr_0.8fr_1fr_1fr_auto]"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div>
                      <Badge variant="secondary">{toLabel(user.role)}</Badge>
                    </div>
                    <div>
                      <Badge variant={normalize(user.status) === "active" ? "outline" : "destructive"}>
                        {toLabel(user.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {normalize(user.role) === "student" ? (
                        <span>
                          {user.level || "-"} · {user.domain || "-"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.createdAt || user.created_at || "—"}</div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleView(user)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)}>
                        {normalize(user.status) === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showPagination ? (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Page {meta?.current_page} of {meta?.last_page}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(meta?.current_page || 1) <= 1}
                    onClick={() => setPage(Math.max((meta?.current_page || 1) - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(meta?.current_page || 1) >= (meta?.last_page || 1)}
                    onClick={() => setPage(Math.min((meta?.current_page || 1) + 1, meta?.last_page || 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

      <Sheet open={!!selectedUser} onOpenChange={(open: boolean) => setSelectedUser(open ? selectedUser : null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>{selectedUser?.name}</SheetTitle>
            <SheetDescription>{selectedUser?.email}</SheetDescription>
          </SheetHeader>
          {selectedUser ? (
            <div className="mt-4 space-y-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{toLabel(selectedUser.role)}</Badge>
                <Badge variant={normalize(selectedUser.status) === "active" ? "outline" : "destructive"}>
                  {toLabel(selectedUser.status)}
                </Badge>
              </div>

              {isDetailLoading ? (
                <p className="text-sm text-muted-foreground">Loading user details...</p>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Level: {selectedUser.level || "N/A"}</p>
                  <p>Domain: {selectedUser.domain || "N/A"}</p>
                  <p>Joined: {selectedUser.createdAt || selectedUser.created_at || "—"}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent activity</p>
                  <ul className="space-y-2 rounded-lg border p-3 text-sm text-muted-foreground">
                    <li>• Activity feed not implemented yet</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin actions</p>
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Change role</p>
                      <Select value={selectedUser.role || ""} onValueChange={handleRoleChange} disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" disabled className="opacity-60">
                        {normalize(selectedUser.status) === "active" ? "Suspend user (coming soon)" : "Activate user (coming soon)"}
                      </Button>
                      <Button variant="secondary" size="sm" disabled className="opacity-60">
                        Reset password (coming soon)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
