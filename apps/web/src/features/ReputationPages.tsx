import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, LockKeyhole, Sparkles } from "lucide-react";
import { Button, Checkbox, Label } from "@pixelvault/ui";
import type {
  AwardCollection,
  ReputationWorkspace,
} from "@pixelvault/contracts";
import { apiRequest } from "../app/api";
import { useSession } from "../app/session";
import { ReputationExplanation } from "./leaderboard/CommunityXpInfo";
import { ProfileNavigation } from "./profile/ProfileNavigation";
import {
  ApiForm,
  ErrorNotice,
  Loading,
  MemberAvatar,
  Notice,
  PageHeading,
  SelectField,
} from "../components";

export function ReputationPage() {
  return (
    <>
      <PageHeading
        title="Your community XP & avatar extras."
        description="Choose unlocked frames, wear an earned achievement and control your public participation."
      />
      <ProfileNavigation />
      <section className="surface appearance-workspace">
        <ReputationSettings />
      </section>
    </>
  );
}

export function ReputationSettings() {
  const { session, refresh } = useSession();
  const query = useQuery({
    queryKey: ["community-reputation"],
    queryFn: () => apiRequest<ReputationWorkspace>("/community/reputation"),
  });
  const awards = useQuery({
    queryKey: ["awards"],
    queryFn: () => apiRequest<AwardCollection>("/community/awards"),
  });
  const [frameChoice, setFrameChoice] = useState<string>();
  const [flairChoice, setFlairChoice] = useState<string>();
  const [showChoice, setShowChoice] = useState<boolean>();
  const [boardChoice, setBoardChoice] = useState<boolean>();
  if (query.isPending)
    return <Loading text="Loading your community experience…" />;
  if (query.error) return <ErrorNotice error={query.error} />;
  if (!query.data.reputation || !query.data.settings || !query.data.frames)
    return (
      <Notice>
        Community experience settings are unavailable. Your profile details can
        still be saved above.
      </Notice>
    );
  const data = query.data;
  const frame = frameChoice ?? data.settings.avatar_frame;
  const flair = flairChoice ?? data.settings.avatar_flair_id ?? "none";
  const show = showChoice ?? data.settings.show_reputation;
  const board = boardChoice ?? data.settings.leaderboard_opt_in;
  const eligible = (awards.data?.awards || []).filter(
    (award) => award.eligible && !award.private,
  );
  const member = session?.member;
  return (
    <section
      className="reputation-settings"
      aria-labelledby="reputation-settings-title"
    >
      <div className="section-heading">
        <h2 id="reputation-settings-title">Community XP & avatar extras.</h2>
        <ReputationExplanation />
      </div>
      <div className="experience-record">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <strong>{data.reputation.level}</strong>
          <p>{data.reputation.points.toLocaleString("en-PH")} community XP</p>
        </div>
        <span>
          {data.progress.next_level
            ? `${data.progress.points_to_next.toLocaleString("en-PH")} XP to ${data.progress.next_level}`
            : "Highest current community level"}
        </span>
      </div>
      <p className="small-text">
        {data.rules.literacy_points} XP for the learning check.{" "}
        {data.rules.contribution_points} XP per distinct approved educational
        contribution, up to {data.rules.contribution_cap}. Financial activity
        never earns community XP.
      </p>
      <dl className="xp-source-breakdown">
        <div>
          <dt>Learning check</dt>
          <dd>{data.breakdown.literacy_points} XP</dd>
        </div>
        <div>
          <dt>
            {data.breakdown.approved_contributions} approved contributions
          </dt>
          <dd>{data.breakdown.contribution_points} XP</dd>
        </div>
      </dl>
      <ApiForm
        submitLabel="Save avatar extras & privacy"
        successMessage="Your avatar extras and community preferences were saved."
        onSubmit={async () => {
          await apiRequest("/community/profile", {
            method: "PATCH",
            body: JSON.stringify({
              avatar_frame: frame,
              avatar_flair_id: flair === "none" ? null : flair,
              show_reputation: show,
              leaderboard_opt_in: board,
            }),
          });
          await refresh();
        }}
      >
        <fieldset className="frame-picker">
          <legend>Choose an avatar frame</legend>
          <div className="frame-options">
            {data.frames.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant="outline"
                className={
                  frame === option.key
                    ? "frame-choice is-selected"
                    : "frame-choice"
                }
                disabled={!option.unlocked}
                aria-pressed={frame === option.key}
                aria-label={`Choose ${option.name} frame${option.unlocked ? "" : `, requires ${option.required_points} XP`}`}
                onClick={() => setFrameChoice(option.key)}
              >
                <MemberAvatar
                  name={member?.display_name || "Your avatar"}
                  avatarKey={member?.avatar_key}
                  photoUrl={member?.photo_url}
                  reputation={{
                    ...data.reputation,
                    frame: option.key,
                    show_points: false,
                    flair: null,
                  }}
                  size={48}
                />
                <strong>{option.name}</strong>
                <span>
                  {option.unlocked ? (
                    <>
                      <Check size={13} /> Unlocked
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={13} /> {option.required_points} XP
                    </>
                  )}
                </span>
              </Button>
            ))}
          </div>
        </fieldset>
        {awards.error ? (
          <ErrorNotice
            error={awards.error}
            retry={() => {
              void awards.refetch();
            }}
          />
        ) : (
          <SelectField
            name="avatar_flair"
            label="Wear an earned achievement"
            defaultValue={flair}
            options={[
              { value: "none", label: "No achievement flair" },
              ...eligible.map((award) => ({
                value: award.id,
                label: award.name,
              })),
            ]}
            onValueChange={setFlairChoice}
            help="Only your currently eligible, public-capable achievements can be worn. Private milestones stay private."
          />
        )}
        <div className="reputation-preferences">
          <div className="check-field">
            <Checkbox
              id="show-community-xp"
              checked={show}
              onCheckedChange={(checked) => setShowChoice(checked === true)}
            />
            <Label htmlFor="show-community-xp">
              Show my community XP on public profiles
            </Label>
          </div>
          <div className="check-field">
            <Checkbox
              id="join-community-board"
              checked={board}
              onCheckedChange={(checked) => setBoardChoice(checked === true)}
            />
            <Label htmlFor="join-community-board">
              Include me in the optional community board
            </Label>
          </div>
          <p className="small-text">
            The board only lists members who opt in and show their XP. Hide XP
            or opt out to leave the public rankings.
          </p>
        </div>
      </ApiForm>
    </section>
  );
}

export { Leaderboard } from "./leaderboard/Leaderboard";
