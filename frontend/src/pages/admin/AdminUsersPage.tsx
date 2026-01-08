import { useEffect, useState, useCallback } from "react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EmptyState from "@/components/feedback/EmptyState";
import { useAppToast } from "@/components/feedback/useAppToast";
import { apiClient } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiErrors";
import { ApiStateCard } from "@/components/shared/ApiStateCard";

/**
 * User type matching backend response from AdminUserController
 * Backend returns: id, name, email, role, is_active, created_at
 */
type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: "student" | "business" | "admin";
  is_active: boolean;
  level?: string | null;
  domain?: string | null;
  created_at: string;
};

type ApiMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const toLabel = (value?: string | null) => {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function AdminUsersPage() {
  const { toastSuccess, toastError } = useAppToast();

  // Data state
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<ReturnType<typeof parseApiError> | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "active" | "inactive"

  // UI state
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [userToToggle, setUserToToggle] = useState<ApiUser | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Fetch users with server-side filtering
  const fetchUsers = useCallback(async (pageNum: number, signal?: AbortSignal) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const params: Record<string, string | number | boolean> = { page: pageNum };
      
      // Server-side filters (backend supports these)
      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }
      if (roleFilter !== "all") {
        params.role = roleFilter;
      }
      if (statusFilter !== "all") {
        params.is_active = statusFilter === "active";
      }

      const res = await apiClient.get("/admin/users", { params, signal });

      const payload = res.data?.data ?? res.data ?? [];
      const metaPayload: ApiMeta | null = res.data?.meta ?? null;

      setUsers(Array.isArray(payload) ? payload : []);
      setMeta(metaPayload && metaPayload.current_page ? metaPayload : null);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "ERR_CANCELED") return;
      setApiError(parseApiError(err));
      setUsers([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  // Initial load and filter changes
  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(page, controller.signal);
    return () => controller.abort();
  }, [page, fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const hasUsers = users.length > 0;
  const showPagination = meta?.current_page && meta?.last_page && meta.last_page > 1;

  // View user details
  const handleView = (user: ApiUser) => {
    setSelectedUser(user);
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
        // Keep list data on error
      })
      .finally(() => setIsDetailLoading(false));
  };

  // Open confirmation dialog for status toggle
  const handleToggleStatusClick = (user: ApiUser) => {
    setUserToToggle(user);
  };

  // Confirm and execute status toggle via PATCH /admin/users/{id}
  const handleConfirmToggle = async () => {
    if (!userToToggle) return;

    setIsToggling(true);
    const newStatus = !userToToggle.is_active;

    try {
      await apiClient.patch(`/admin/users/${userToToggle.id}`, {
        is_active: newStatus,
      });

      // Update user in list
      setUsers((prev) =>
        prev.map((u) => (u.id === userToToggle.id ? { ...u, is_active: newStatus } : u))
      );

      // Update selected user if viewing the same user
      if (selectedUser?.id === userToToggle.id) {
        setSelectedUser((prev) => (prev ? { ...prev, is_active: newStatus } : prev));
      }

      toastSuccess(
        newStatus
          ? `${userToToggle.name} has been activated.`
          : `${userToToggle.name} has been deactivated.`
      );
    } catch (err) {
      const parsed = parseApiError(err);
      toastError(parsed.message || "Failed to update user status.");
    } finally {
      setIsToggling(false);
      setUserToToggle(null);
    }
  };

  const handleRefresh = () => {
    fetchUsers(page);
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 animate-page-enter">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          View and manage user accounts. Toggle account status to activate or deactivate users.
        </p>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-6">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Users</CardTitle>
          {meta?.total !== undefined && (
            <span className="text-sm text-muted-foreground">{meta.total} total</span>
          )}
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
                  fetchUsers(1);
                }}
              />
            </div>
          ) : !hasUsers ? (
            <div className="p-6">
              <EmptyState
                title="No users found"
                description={
                  searchTerm || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters."
                    : "New users will appear here."
                }
                primaryActionLabel="Refresh"
                onPrimaryAction={handleRefresh}
              />
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1.5fr_0.6fr_0.6fr_0.8fr_auto]"
                >
                  {/* Name & Email */}
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  {/* Role Badge */}
                  <div>
                    <Badge
                      variant={
                        user.role === "admin"
                          ? "default"
                          : user.role === "business"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {toLabel(user.role)}
                    </Badge>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <Badge variant={user.is_active ? "outline" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Created Date */}
                  <div className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(user)}>
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatusClick(user)}
                      className={user.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {showPagination && (
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
                  onClick={() =>
                    setPage(Math.min((meta?.current_page || 1) + 1, meta?.last_page || 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>{selectedUser?.name}</SheetTitle>
            <SheetDescription>{selectedUser?.email}</SheetDescription>
          </SheetHeader>

          {selectedUser && (
            <div className="mt-4 space-y-6">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    selectedUser.role === "admin"
                      ? "default"
                      : selectedUser.role === "business"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {toLabel(selectedUser.role)}
                </Badge>
                <Badge variant={selectedUser.is_active ? "outline" : "destructive"}>
                  {selectedUser.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Details */}
              {isDetailLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-mono">{selectedUser.id}</span>
                  </div>
                  {selectedUser.role === "student" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Level:</span>
                        <span>{toLabel(selectedUser.level)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Domain:</span>
                        <span>{toLabel(selectedUser.domain)}</span>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Joined:</span>
                    <span>{formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Actions</p>
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Account Status: {selectedUser.is_active ? "Active" : "Inactive"}
                  </p>
                  <Button
                    size="sm"
                    variant={selectedUser.is_active ? "destructive" : "default"}
                    onClick={() => handleToggleStatusClick(selectedUser)}
                    disabled={isToggling}
                  >
                    {selectedUser.is_active ? "Deactivate Account" : "Activate Account"}
                  </Button>
                </div>
              </div>

              {/* Note about unsupported features */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Note</p>
                <p>
                  Role changes, password resets, and account deletion are not available via this
                  dashboard.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog for Status Toggle */}
      <Dialog open={!!userToToggle} onOpenChange={(open: boolean) => !open && setUserToToggle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userToToggle?.is_active ? "Deactivate User" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {userToToggle?.is_active ? (
                <>
                  Are you sure you want to deactivate <strong>{userToToggle?.name}</strong>?
                  They will not be able to access the platform until reactivated.
                </>
              ) : (
                <>
                  Are you sure you want to activate <strong>{userToToggle?.name}</strong>?
                  They will regain access to the platform.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToToggle(null)} disabled={isToggling}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmToggle}
              disabled={isToggling}
              variant={userToToggle?.is_active ? "destructive" : "default"}
            >
              {isToggling
                ? "Processing..."
                : userToToggle?.is_active
                ? "Deactivate"
                : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
