"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { saveLastRoute } from "@/lib/persist";

export default function PersistRoute() {
  const path = usePathname();
  useEffect(() => {
    if (path) saveLastRoute(path);
  }, [path]);
  return null;
}
