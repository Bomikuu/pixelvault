import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { TooltipProvider, Toaster } from "@pixelvault/ui";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./app/mobile-entry.css";
import { queryClient } from "./app/queryClient";
import { SessionProvider } from "./app/session";
import { router } from "./app/router";
import { Lifecycle } from "./app/lifecycle";
import { UpdateNotice } from "./app/UpdateNotice";
const theme = localStorage.getItem("pixelvault-mobile-theme");
document.documentElement.classList.toggle(
  "dark",
  theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches,
);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <Lifecycle />
          <RouterProvider router={router} />
          <UpdateNotice />
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
