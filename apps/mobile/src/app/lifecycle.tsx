import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { router } from "./router";
import { safeAppPath } from "../platform/native/links";
export function Lifecycle() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listeners = [
      App.addListener("appStateChange", ({ isActive }) => {
        window.dispatchEvent(
          new Event(isActive ? "pixelvault:resume" : "pixelvault:pause"),
        );
      }),
      App.addListener("appUrlOpen", ({ url }) => {
        const path = safeAppPath(url);
        if (path) void router.navigate(path);
      }),
      App.addListener("backButton", () => {
        if (window.history.state?.idx > 0) void router.navigate(-1);
        else void router.navigate("/explore");
      }),
    ];
    return () => {
      listeners.forEach(
        (listener) => void listener.then((handle) => handle.remove()),
      );
    };
  }, []);
  return null;
}
