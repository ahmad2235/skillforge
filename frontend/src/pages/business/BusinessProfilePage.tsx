import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function BusinessProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <p className="text-sm text-slate-600">Business profile.</p>

      <div className="mt-6 space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Name</div>
          <div className="font-medium">{user?.name ?? "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Email</div>
          <div className="font-medium">{user?.email ?? "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Role</div>
          <div className="font-medium capitalize">{user?.role ?? "—"}</div>
        </div>

        <div className="pt-4">
          <Button variant="ghost" onClick={() => { logout(); window.location.assign('/'); }}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
