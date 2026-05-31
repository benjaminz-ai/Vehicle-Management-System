"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isLoginPage        = pathname === "/login";
    const isAdminPage        = pathname.startsWith("/admin");
    const isSetupPage        = pathname === "/setup";
    const isForgotPassword   = pathname === "/forgot-password";
    const isResetPassword    = pathname === "/reset-password";

    if (!profile) {
      // Not logged in → send to login (but allow /setup, /login, /forgot-password, /reset-password)
      if (!isLoginPage && !isSetupPage && !isForgotPassword && !isResetPassword) router.replace("/login");
      return;
    }

    if (profile.role === "super_admin") {
      // Super admin belongs on /admin
      if (!isAdminPage) router.replace("/admin");
      return;
    }

    // Tenant user on login page → send to dashboard
    if (isLoginPage || isAdminPage) {
      router.replace("/");
    }
  }, [profile, loading, pathname, router]);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#032147]/20 border-t-[#032147] animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
    </StoreProvider>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppShell>
          {children}
        </AppShell>
      </AuthGuard>
    </AuthProvider>
  );
}
