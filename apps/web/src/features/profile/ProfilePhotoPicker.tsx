import { useState } from "react";
import { Camera, Image, Trash2, UserRound } from "lucide-react";
import { Button } from "@pixelvault/ui";
import type { Member } from "@pixelvault/contracts";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  ApiForm,
  ErrorNotice,
  Field,
  MemberAvatar,
  Notice,
} from "../../components";

export function ProfilePhotoPicker({
  mode,
  onModeChange,
}: {
  mode: "avatar" | "photo";
  onModeChange: (mode: "avatar" | "photo") => void;
}) {
  const { session, refresh } = useSession();
  const member = session!.member!;
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<unknown>(null);
  const [removed, setRemoved] = useState(false);
  return (
    <section
      className="profile-photo-picker"
      aria-labelledby="profile-picture-heading"
    >
      <div className="profile-picture-preview">
        <MemberAvatar
          name={member.display_name}
          avatarKey={member.avatar_key}
          photoUrl={
            mode === "photo"
              ? member.photo_url || member.stored_photo_url
              : null
          }
          size={104}
          reputation={member.community_reputation}
        />
        <div>
          <h2 id="profile-picture-heading">Your profile picture</h2>
          <p>Choose an illustrated character or your own photo.</p>
        </div>
      </div>
      <div
        className="photo-mode-options"
        role="group"
        aria-label="Profile picture style"
      >
        <Button
          type="button"
          variant={mode === "avatar" ? "secondary" : "outline"}
          aria-pressed={mode === "avatar"}
          onClick={() => onModeChange("avatar")}
        >
          <UserRound size={17} />
          Illustrated avatar
        </Button>
        <Button
          type="button"
          variant={mode === "photo" ? "secondary" : "outline"}
          aria-pressed={mode === "photo"}
          disabled={!member.has_photo}
          onClick={() => onModeChange("photo")}
        >
          <Image size={17} />
          Uploaded photo
        </Button>
      </div>
      <ApiForm
        submitLabel={
          member.has_photo ? "Replace profile photo" : "Upload profile photo"
        }
        successMessage="Your profile photo was saved."
        onSubmit={async (data) => {
          const file = data.get("photo");
          if (!(file instanceof File) || !file.size)
            throw new Error("Choose a JPEG, PNG or WebP photo first.");
          if (file.size > 3 * 1024 * 1024)
            throw new Error("Choose a photo smaller than 3 MiB.");
          if (
            file.type &&
            !["image/jpeg", "image/png", "image/webp"].includes(file.type)
          )
            throw new Error(
              "Use a JPEG, PNG or WebP photo. SVG and animated images are not supported.",
            );
          const body = new FormData();
          body.set("photo", file);
          await apiRequest<Member>("/auth/profile/photo", {
            method: "POST",
            body,
          });
          setRemoved(false);
          onModeChange("photo");
          await refresh();
        }}
      >
        <Field
          name="photo"
          label="Upload a photo"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          help="JPEG, PNG or WebP · up to 3 MiB · at least 128 × 128 px. The server validates and removes image metadata."
        />
      </ApiForm>
      <p className="small-text photo-public-note">
        <Camera size={16} aria-hidden="true" />
        Selected profile photos are public. Use a personal picture, never an ID
        document or financial evidence.
      </p>
      {member.has_photo && (
        <Button
          type="button"
          variant="outline"
          disabled={removing}
          onClick={async () => {
            setRemoveError(null);
            setRemoving(true);
            try {
              await apiRequest("/auth/profile/photo", { method: "DELETE" });
              onModeChange("avatar");
              await refresh();
              setRemoved(true);
            } catch (error) {
              setRemoveError(error);
            } finally {
              setRemoving(false);
            }
          }}
        >
          <Trash2 size={16} />
          {removing ? "Removing photo…" : "Remove uploaded photo"}
        </Button>
      )}
      {removeError !== null && <ErrorNotice error={removeError} />}
      {removed && (
        <Notice tone="success">
          Your uploaded photo was removed. Your illustrated avatar is selected.
        </Notice>
      )}
      <p className="small-text">
        Uploading or removing a photo saves immediately. Save your profile below
        to apply a different picture style or character.
      </p>
    </section>
  );
}
