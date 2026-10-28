import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  LockKeyhole,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { Profile } from "@pixelvault/contracts";
import { apiRequest } from "../../app/api";
import { ErrorNotice, Loading } from "../../components";

export function RecommendationSummary({
  summary,
}: {
  summary: Profile["recommendation_summary"];
}) {
  if (!summary) return null;
  return (
    <div
      className="profile-recommendations"
      aria-label="Published transaction review recommendations"
    >
      <span>
        <ThumbsUp size={16} aria-hidden="true" />
        <strong>{summary.up}</strong> recommend
      </span>
      <span>
        <ThumbsDown size={16} aria-hidden="true" />
        <strong>{summary.down}</strong> do not recommend
      </span>
      <small>
        From published, moderated transaction reviews. No repayment guarantee.
      </small>
    </div>
  );
}

export function ProfileXpProgress({ profile }: { profile: Profile }) {
  const progress = profile.xp_progress;
  const visible =
    profile.reputation?.show_points &&
    progress &&
    progress.progress_percent !== null;
  return (
    <section
      className="profile-progress-block"
      aria-labelledby="public-xp-heading"
    >
      <h2 id="public-xp-heading">
        <Sparkles size={18} />
        Community XP
      </h2>
      <strong>{profile.reputation?.level || profile.community_level}</strong>
      {visible ? (
        <>
          <p>
            {profile.reputation!.points.toLocaleString("en-PH")} XP from
            learning and approved contributions.
          </p>
          <progress
            max={100}
            value={progress.progress_percent!}
            aria-label={
              progress.next_level
                ? `Progress toward ${progress.next_level}`
                : "Highest current community level"
            }
          />
          <span>
            {progress.next_level
              ? `${progress.points_to_next?.toLocaleString("en-PH")} XP to ${progress.next_level}`
              : "Highest current community level"}
          </span>
        </>
      ) : (
        <p className="private-progress">
          <LockKeyhole size={14} />
          XP progress is private.
        </p>
      )}
      <Link to="/help#privacy">
        How community recognition works <ArrowRight size={14} />
      </Link>
    </section>
  );
}

export function PrivateProfileSetup() {
  const query = useQuery({
    queryKey: ["private-profile-setup"],
    queryFn: () => apiRequest<Profile>("/community/profile"),
  });
  if (query.isPending)
    return <Loading text="Loading your private profile setup…" />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const setup = query.data.setup_completeness;
  if (!setup) return null;
  return (
    <section
      className="profile-progress-block private-setup"
      aria-labelledby="setup-heading"
    >
      <h2 id="setup-heading">Your profile setup</h2>
      <strong>
        {setup.completed} of {setup.total} complete
      </strong>
      <progress
        max={100}
        value={setup.percent}
        aria-label="Profile setup completion"
      />
      <p>
        Only you see this checklist. Setup progress is separate from community
        XP.
      </p>
      <ul>
        {setup.steps.map((step) => (
          <li key={step.key}>
            {step.complete ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : (
              <Circle size={16} aria-hidden="true" />
            )}
            <Link
              to={
                step.href.startsWith("/") && !step.href.startsWith("//")
                  ? step.href
                  : "/profile/edit"
              }
            >
              {step.label}
            </Link>
            <span className="sr-only">
              {step.complete ? "Complete" : "To do"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
