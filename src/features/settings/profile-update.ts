import type { Profile } from "@/lib/api";

type ProfileFields = Pick<Profile["profile"], "handle" | "displayName" | "bio">;

export function profileChanges(
  saved: ProfileFields,
  draft: ProfileFields,
): Partial<ProfileFields> {
  return {
    ...(draft.handle !== saved.handle ? { handle: draft.handle } : {}),
    ...(draft.displayName !== saved.displayName
      ? { displayName: draft.displayName }
      : {}),
    ...(draft.bio !== saved.bio ? { bio: draft.bio } : {}),
  };
}
