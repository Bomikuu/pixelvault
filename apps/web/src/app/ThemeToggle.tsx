import { useEffect, useState } from "react";
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
          onClick={() => {
            const next = theme === "dark" ? "light" : "dark";
            applyTheme(next);
            setTheme(next);
            try {
              localStorage.setItem(storageKey, next);
            } catch {
              /* A session-only choice still works. */
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
