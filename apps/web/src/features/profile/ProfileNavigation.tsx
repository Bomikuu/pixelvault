import type { KeyboardEvent } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Contact,
  Image,
  Palette,
  Settings2,
  Users,
} from "lucide-react";
import "./profile.css";

const destinations = [
  ["/profile", "Overview", BookOpen],
  ["/profile/edit", "Edit profile", Image],
  ["/profile/appearance", "Avatar frames & flair", Palette],
  ["/profile/badges", "Achievements", Settings2],
  ["/profile/contacts", "Private contacts", Contact],
  ["/profile/co-borrowers", "Co-borrowers", Users],
] as const;

export function ProfileNavigation() {
  function moveFocus(event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const links = [
      ...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a"),
    ];
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? links.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + links.length) %
            links.length;
    links[next].focus();
  }
  return (
    <nav
      className="profile-navigation"
      aria-label="Profile settings"
      onKeyDown={moveFocus}
    >
      {destinations.map(([path, name, Icon]) => (
        <NavLink
          key={path}
          to={path}
          end={path === "/profile"}
          className={({ isActive }) =>
            `profile-tab ${isActive ? "is-active" : ""}`
          }
        >
          <Icon size={17} aria-hidden="true" />
          <span>{name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
