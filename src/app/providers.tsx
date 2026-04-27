"use client";

import React from "react";
import { APIKeyProvider } from "@/contexts/APIKeyContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <APIKeyProvider>{children}</APIKeyProvider>;
}
