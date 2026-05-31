"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type UserRole = "super_admin" | "tenant_admin" | "tenant_user";

export type UserProfile = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Support mode: super_admin enters as a tenant
  supportTenant: { tenantId: string; tenantName: string } | null;
  enterSupportMode: (tenantId: string, tenantName: string) => void;
  exitSupportMode: () => void;
  // The effective tenantId to use (support override or own tenantId)
  effectiveTenantId: string | undefined;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportTenant, setSupportTenant] = useState<{ tenantId: string; tenantName: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem("supportTenant");
    return stored ? JSON.parse(stored) : null;
  });

  // Periodic check every hour — kicks out users whose session exceeded 24h
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const idTokenResult = await currentUser.getIdTokenResult(true); // force refresh
        const authTime = new Date(idTokenResult.authTime).getTime();
        const hoursSinceAuth = (Date.now() - authTime) / (1000 * 60 * 60);
        if (hoursSinceAuth > 24) {
          await signOut(auth);
          if (typeof window !== "undefined") {
            window.location.href = "/login?expired=1";
          }
        }
      } catch { /* ignore */ }
    }, 60 * 60 * 1000); // every 1 hour
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // ── Check auth_time: enforce max 24h session ──────────────────────
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const authTime = new Date(idTokenResult.authTime).getTime();
          const hoursSinceAuth = (Date.now() - authTime) / (1000 * 60 * 60);

          if (hoursSinceAuth > 24) {
            // Session older than 24h → force re-login with expired message
            await signOut(auth);
            setUser(null);
            setProfile(null);
            setLoading(false);
            if (typeof window !== "undefined") {
              window.location.href = "/login?expired=1";
            }
            return;
          }

          setUser(firebaseUser);

          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();

            // Block disabled users
            if (data.isActive === false) {
              await signOut(auth);
              setUser(null);
              setProfile(null);
              setLoading(false);
              if (typeof window !== "undefined") {
                window.location.href = "/login?disabled=1";
              }
              return;
            }

            const tenantName: string | undefined = data.tenantName || undefined;
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              role: data.role,
              tenantId: data.tenantId,
              tenantName,
            });
          }
        } catch {
          // profile fetch failed, still mark as loaded
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const enterSupportMode = (tenantId: string, tenantName: string) => {
    const data = { tenantId, tenantName };
    setSupportTenant(data);
    sessionStorage.setItem("supportTenant", JSON.stringify(data));
  };

  const exitSupportMode = () => {
    setSupportTenant(null);
    sessionStorage.removeItem("supportTenant");
  };

  const effectiveTenantId = supportTenant?.tenantId ?? profile?.tenantId;

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    exitSupportMode();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, login, logout,
      supportTenant, enterSupportMode, exitSupportMode, effectiveTenantId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
