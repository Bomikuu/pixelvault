import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pixelvault/ui";

type Theme = "light" | "dark";
const storageKey = "pixelvault-theme";

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  applyTheme(
    savedTheme() ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
}

export function ThemeToggle() {
  const changing = useRef(false);
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (savedTheme()) return;
      const next = preference?.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };
    preference?.addEventListener?.("change", followSystem);
    return () => preference?.removeEventListener?.("change", followSystem);
  }, []);
  const label =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={async (event) => {
            if (changing.current) return;
            const next = theme === "dark" ? "light" : "dark";
            const update = () => {
              applyTheme(next);
              setTheme(next);
              try {
                localStorage.setItem(storageKey, next);
              } catch {
                /* Session-only choice. */
              }
            };
            if (
              !document.startViewTransition ||
              window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
              update();
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const x = rect.left + rect.width / 2,
              y = rect.top + rect.height / 2;
            const radius = Math.hypot(
              Math.max(x, innerWidth - x),
              Math.max(y, innerHeight - y),
            );
            changing.current = true;
            let applied = false;
            try {
              const transition = document.startViewTransition(() =>
                flushSync(() => {
                  update();
                  applied = true;
                }),
              );
              await transition.ready;
              await document.documentElement.animate(
                {
                  clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${radius}px at ${x}px ${y}px)`,
                  ],
                },
                {
                  duration: 500,
                  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                  pseudoElement: "::view-transition-new(root)",
                },
              ).finished;
              await transition.finished;
            } catch {
              if (!applied) update();
            } finally {
              changing.current = false;
            }
          }}
          className="rounded-full! transition-colors hover:bg-accent! focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === "dark" ? (
            <Sun size={19} aria-hidden="true" />
          ) : (
            <Moon size={19} aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// Compatibility for existing application surfaces while features move to semantic utilities.
// New UI should use bg-card/text-foreground/etc directly rather than adding selectors here.
export const legacyThemeClasses = [
  "dark:[&_.surface]:bg-card! dark:[&_.surface]:border-border! dark:[&_.surface]:text-foreground!",
  "dark:[&_.page-heading_p]:text-muted-foreground! dark:[&_.section-heading_p]:text-muted-foreground!",
  "dark:[&_.record-table_th]:bg-muted! dark:[&_.record-table_th]:text-muted-foreground! dark:[&_.record-table_td]:border-border!",
  "dark:[&_.experience-record]:bg-muted! dark:[&_.experience-record]:text-foreground! dark:[&_.frame-choice]:bg-card! dark:[&_.frame-choice]:text-foreground!",
  "dark:[&_.experience-record_p]:text-primary! dark:[&_.experience-record>span]:text-muted-foreground! dark:[&_.experience-record>svg]:text-primary!",
  "dark:[&_.xp-source-breakdown_dt]:text-muted-foreground! dark:[&_.xp-source-breakdown_dd]:text-primary! dark:[&_.field-help]:text-muted-foreground!",
  "dark:[&_.profile-navigation]:bg-muted! dark:[&_.profile-tab]:text-muted-foreground! dark:[&_.profile-tab:hover]:bg-accent! dark:[&_.profile-tab.is-active]:bg-accent! dark:[&_.profile-tab.is-active]:text-primary!",
  "dark:[&_.form-field_small]:text-muted-foreground! dark:[&_.field_small]:text-muted-foreground!",
  "dark:[&_.frame-choice_span]:text-muted-foreground! dark:[&_.frame-choice]:border-border! dark:[&_.xp-source-breakdown]:bg-muted!",
  "dark:[&_input]:bg-card! dark:[&_textarea]:bg-card! dark:[&_[data-slot=select-trigger]]:bg-card!",
  "dark:[&_.empty-state]:bg-muted! dark:[&_.empty-state]:text-foreground! dark:[&_.notice]:bg-muted! dark:[&_.notice]:text-foreground!",
  "dark:[&_.small-text]:text-muted-foreground! dark:[&_.text-link]:text-primary! dark:[&_.illustrated-info-dialog_p]:text-muted-foreground!",
].join(" ");
