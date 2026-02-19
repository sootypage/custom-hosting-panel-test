"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_URL || "/api";

  async function login() {
    setMsg("Logging in...");
    const res = await fetch(`${api}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error || "Login failed");

    localStorage.setItem("panel_token", data.token);
    if (data.role) localStorage.setItem("panel_role", data.role);
    router.push("/servers");
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h1 className="text-lg font-semibold">Login</h1>
      <p className="mt-2 text-sm text-zinc-400">Use your panel account to sign in.</p>

      <label className="mt-5 block text-sm text-zinc-400">Username</label>
      <input className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={username} onChange={(e)=>setUsername(e.target.value)} />

      <label className="mt-4 block text-sm text-zinc-400">Password</label>
      <input className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />

      <button onClick={login} className="mt-5 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 font-medium hover:bg-zinc-950">
        Login
      </button>

      {msg && <div className="mt-3 text-sm text-zinc-300">{msg}</div>}
      <div className="mt-5 text-xs text-zinc-500">Default admin: <span className="font-mono">admin/admin</span></div>
    </div>
  );
}
