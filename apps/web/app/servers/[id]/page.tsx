"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Server = {
  id: string;
  name: string;
  game: string;
  port: number;
  nodeId?: string;
  memoryMb?: number;
  cpu?: number;
};

export default function ServerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [server, setServer] = useState<Server | null>(null);
  const [msg, setMsg] = useState<string>("");

  const api = process.env.NEXT_PUBLIC_API_URL || "/api";

  async function load() {
    try {
      const token = localStorage.getItem("panel_token");
      if (!token) {
        setMsg("Not logged in. Go to /login");
        return;
      }

      const res = await fetch(`${api}/servers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Failed to load server");
        return;
      }

      setServer(data.server as Server);
      setMsg("");
    } catch (e: any) {
      setMsg(e?.message || "Error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!server) {
    return <div className="p-6 text-sm text-zinc-400">{msg || "Loading..."}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{server.name}</h1>
      <div className="mt-3 text-sm">Game: {server.game}</div>
      <div className="mt-1 text-sm">Port: {server.port}</div>
    </div>
  );
}
