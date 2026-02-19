"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "./_lib/auth";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const t = getToken();
    if (!t) router.push("/login");
    else router.push("/servers");
  }, [router]);
  return null;
}
