"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, requireAdmin } from "../../_lib/auth";

type UserRow = { username: string; role: string };

export default function AdminUsers() {
  const api = process.env.NEXT_PUBLIC_API_URL || "/api";
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");
  const [username, setUsername] = useState("newuser");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState("user");

  async function authed(path: string, init?: RequestInit) {
    const t = getToken();
    const res = await fetch(`${api}${path}`, {
      ...(init || {}),
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${t}`, "content-type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  }

  async function load() {
    setMsg("Loading...");
    try {
      const data = await authed("/admin/users");
      setUsers(data.users || []);
      setMsg("");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function addUser() {
    setMsg("Creating...");
    try {
      await authed("/admin/users", { method: "POST", body: JSON.stringify({ username, password, role }) });
      await load();
      setMsg("✅ Created");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function toggleRole(u: string, current: string) {
    const newRole = current === "admin" ? "user" : "admin";
    setMsg("Updating...");
    try {
      await authed(`/admin/users/${u}`, { method: "PUT", body: JSON.stringify({ role: newRole }) });
      await load();
      setMsg("✅ Updated");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function resetPass(u: string) {
    const p = prompt(`New password for ${u}:`);
    if (!p) return;
    setMsg("Updating...");
    try {
      await authed(`/admin/users/${u}`, { method: "PUT", body: JSON.stringify({ password: p }) });
      setMsg("✅ Password updated");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function del(u: string) {
    if (!confirm(`Delete user ${u}?`)) return;
    setMsg("Deleting...");
    try {
      await authed(`/admin/users/${u}`, { method: "DELETE" });
      await load();
      setMsg("✅ Deleted");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  useEffect(() => { requireAdmin(router.push); load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin • Users</h1>
        <Link href="/admin" className="text-sm underline underline-offset-2">Back</Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 grid gap-3 text-sm">
        <div className="font-medium">Add User</div>
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={password} onChange={e=>setPassword(e.target.value)} />
        <select className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button onClick={addUser} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-950">Create User</button>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400">
            <tr><th className="px-4 py-3 text-left">Username</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-t border-zinc-800">
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3 flex flex-wrap gap-2">
                  <button onClick={()=>toggleRole(u.username, u.role)} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-1 hover:bg-zinc-950">Toggle Role</button>
                  <button onClick={()=>resetPass(u.username)} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-1 hover:bg-zinc-950">Reset Password</button>
                  <button onClick={()=>del(u.username)} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-1 hover:bg-zinc-950">Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (<tr className="border-t border-zinc-800"><td className="px-4 py-8 text-center text-zinc-500" colSpan={3}>No users yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      {msg && <div className="text-sm text-zinc-300">{msg}</div>}
    </div>
  );
}
