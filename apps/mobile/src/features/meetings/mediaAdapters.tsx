import { PersonAvatar, ErrorState } from "../../components/ui";
export function MemberAvatar({
  name,
  avatarKey,
  photoUrl,
  size = 44,
}: {
  name: string;
  avatarKey?: string;
  photoUrl?: string | null;
  size?: number;
  reputation?: unknown;
}) {
  return (
    <PersonAvatar
      person={{
        display_name: name,
        avatar_key: avatarKey,
        photo_url: photoUrl,
      }}
      size={size}
    />
  );
}
export const ErrorNotice = ({ error }: { error: unknown }) => (
  <ErrorState error={error} />
);
