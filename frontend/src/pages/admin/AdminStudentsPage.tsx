import { useEffect, useState, ChangeEvent } from "react";
import { apiClient } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiErrors";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiStateCard } from "@/components/shared/ApiStateCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Student = {
  id: number;
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced" | string;
  domain: "frontend" | "backend" | "fullstack" | string;
  is_active: boolean;
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
};

const PAGE_SIZE = 10; // لو backend عندك يستخدم غيرها عدّلها هنا

export function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<
    "name" | "email" | "level" | "domain"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ReturnType<typeof parseApiError> | null>(null);

  // استدعاء الـ API
  useEffect(() => {
    const controller = new AbortController();

    async function fetchStudents() {
      try {
        setLoading(true);
        setApiError(null);

        const response = await apiClient.get<PaginatedResponse<Student>>(
          "/admin/students",
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
        setStudents(payload.data || []);

        if (payload.meta) {
          setPage(payload.meta.current_page);
          setLastPage(payload.meta.last_page);
          setTotal(payload.meta.total);
        } else {
          // لو ما عندك meta (مش paginated)، نتعامل معها كـ list عادية
          setLastPage(1);
          setTotal(payload.data?.length || 0);
        }
      } catch (err: unknown) {
        // Ignore aborted / canceled requests
        if ((err as any)?.code === "ERR_CANCELED") return;
        if (err instanceof Error && err.name === "AbortError") return;
        console.error(err);
        setApiError(parseApiError(err));
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();

    return () => controller.abort();
  }, [page, search, sortField, sortDirection]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handleSort = (field: "name" | "email" | "level" | "domain") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="p-4 space-y-4">
        {/* Filters / Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={handleSearchChange}
              className="max-w-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">Invite Student</Button>
          </div>
        </div>

        {/* Error State */}
        {apiError && (
          <ApiStateCard
            kind={apiError.kind}
            description={apiError.message}
            primaryActionLabel="Retry"
            onPrimaryAction={() => window.location.reload()}
          />
        )}

        {/* Loading State */}
        {loading && <div className="text-center py-4">Loading students...</div>}

        {/* Table */}
        {!loading && !apiError && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("name")}
                      className="h-auto p-0 font-semibold"
                    >
                      Name{" "}
                      {sortField === "name" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("email")}
                      className="h-auto p-0 font-semibold"
                    >
                      Email{" "}
                      {sortField === "email" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("level")}
                      className="h-auto p-0 font-semibold"
                    >
                      Level{" "}
                      {sortField === "level" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("domain")}
                      className="h-auto p-0 font-semibold"
                    >
                      Domain{" "}
                      {sortField === "domain" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {student.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {student.domain}
                      </TableCell>
                      <TableCell>
                        {student.is_active ? (
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
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !apiError && students.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(page * PAGE_SIZE, total)} of {total} students
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
