export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("panel_token");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem("panel_role");
  if (r) return r;

  const t = localStorage.getItem("panel_token");
  if (!t) return null;
  const parts = t.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return json.role || null;
  } catch {
    return null;
  }
}

export function requireAdmin(push: (path: string) => void) {
  const t = getToken();
  if (!t) return push("/login");
  const role = getRole();
  if (role !== "admin") push("/servers");
}
