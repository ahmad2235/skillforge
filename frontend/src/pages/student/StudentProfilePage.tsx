import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Shield, LogOut } from "lucide-react";

export default function StudentProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl p-6 animate-page-enter">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your student account</p>
      </header>

      <Card className="p-6 space-y-6 animate-card-enter">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name ?? "—"}</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role ?? "Student"}</p>
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-medium">{user?.email ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="font-medium capitalize">{user?.role ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <Button 
            variant="outline" 
            onClick={() => { logout(); window.location.assign('/'); }}
            className="inline-flex items-center gap-2"
          >
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
