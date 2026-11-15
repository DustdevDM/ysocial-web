import { useEffect, useState } from "react";

import { Link } from "react-router";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  api,
  ApiError,
  errorMessage,
  type Profile,
  type Session,
} from "@/lib/api";
import type { AuthState } from "@/features/auth/use-auth";
import { AvatarCropper } from "@/features/profile/avatar-cropper";
import { BannerEditor } from "@/features/profile/banner-editor";

import { updateAuthor } from "@/features/feed/optimistic-actions";

import { usePageTitle } from "@/hooks/use-page-title";
import { profileChanges } from "./profile-update";

type SettingsUser = Extract<Session, { needsOnboarding: false }>["user"];

export function SettingsPage({ auth }: { auth: AuthState }) {
  usePageTitle("Settings");
  const { theme, setTheme } = useTheme();
  const session = auth.session;
  return (
    <div className="max-w-md space-y-3 text-sm">
      <h1>Settings</h1>
      <label className="flex items-center gap-2">
        Theme
        <select
          className="border bg-background p-1"
          value={theme}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "light" || value === "dark" || value === "system")
              setTheme(value);
          }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      {session === null ? (
        <p role="status">Loading account…</p>
      ) : session.authenticated && !session.needsOnboarding ? (
        <ProfileSettings
          key={session.user.id}
          user={session.user}
          auth={auth}
        />
      ) : session.authenticated ? (
        <Link to="/onboarding">Finish profile</Link>
      ) : (
        <a href="/auth/login">Sign in</a>
      )}
      {session?.authenticated && (
        <Button variant="outline" disabled={auth.busy} onClick={auth.logout}>
          Sign out
        </Button>
      )}
      {auth.error && <p role="alert">{auth.error}</p>}
    </div>
  );
}

function ProfileSettings({
  user,
  auth,
}: {
  user: SettingsUser;
  auth: AuthState;
}) {
  const [profile, setProfile] = useState<Profile["profile"] | null>(null);
  const [draft, setDraft] = useState({
    handle: user.handle,
    displayName: user.displayName,
    bio: "",
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .profile(user.handle, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setProfile(result.profile);
        setDraft({
          handle: result.profile.handle,
          displayName: result.profile.displayName,
          bio: result.profile.bio,
        });
        setError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [user.handle, loadAttempt]);

  async function verifyAccount(signal?: AbortSignal) {
    const current = await api.session(signal);
    if (
      !current.authenticated ||
      current.needsOnboarding ||
      current.user.id !== user.id
    )
      throw new ApiError(403, "retry_account_changed");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await verifyAccount();
      const updated = await api.updateProfile(changes);
      updateAuthor(user.id, {
        handle: updated.handle,
        displayName: updated.displayName,
      });
      setProfile((current) => (current ? { ...current, ...updated } : current));
      setDraft(updated);
      setSaved(true);
      await auth.reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  function change(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }
  const changes = profile ? profileChanges(profile, draft) : {};
  const changed = Object.keys(changes).length > 0;
  return (
    <div className="space-y-3">
      <div className="relative h-9 w-36 rounded-xl bg-muted [&_span]:opacity-100">
        <BannerEditor
          bannerUrl={user.bannerUrl}
          verifyAccount={verifyAccount}
          onSaved={(url, crop) => auth.updateBanner(user.id, url, crop)}
        />
      </div>
      <div>
        <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
          <DialogTrigger render={<Button variant="outline" />}>
            Change profile picture
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Profile picture</DialogTitle>
              <DialogDescription>
                Choose a picture, then adjust the crop.
              </DialogDescription>
            </DialogHeader>
            <AvatarCropper
              onSave={async (picture, signal) => {
                await verifyAccount(signal);
                const result = await api.uploadAvatar(picture, signal);
                updateAuthor(user.id, { avatarUrl: result.avatarUrl });
                auth.updateAvatar(user.id, result.avatarUrl);
                setAvatarOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      {error && (
        <div role="alert" className="space-y-1 text-sm text-destructive">
          <p>{error}</p>
          {!profile && (
            <Button
              variant="outline"
              onClick={() => setLoadAttempt((current) => current + 1)}
            >
              Retry profile
            </Button>
          )}
        </div>
      )}
      {!profile ? (
        !error && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading profile settings…
          </p>
        )
      ) : (
        <form onSubmit={(event) => void save(event)} className="space-y-3">
          <fieldset disabled={saving} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="settings-name" className="text-sm font-medium">
                Display name
              </label>
              <Input
                id="settings-name"
                required
                maxLength={80}
                value={draft.displayName}
                onChange={(event) => change("displayName", event.target.value)}
                autoComplete="nickname"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="settings-handle" className="text-sm font-medium">
                Handle
              </label>
              <Input
                id="settings-handle"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9_]{3,32}"
                value={draft.handle}
                onChange={(event) => change("handle", event.target.value)}

                autoComplete="username"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="settings-bio" className="text-sm font-medium">
                Bio
              </label>
              <Textarea
                id="settings-bio"
                maxLength={2000}
                rows={4}
                value={draft.bio}
                onChange={(event) => change("bio", event.target.value)}
                aria-describedby="bio-count"
              />
              <p
                id="bio-count"
                className="text-right text-xs tabular-nums text-muted-foreground"
              >
                {draft.bio.length.toLocaleString()}/2,000
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={!changed || !draft.displayName.trim()}
              >
                {saving ? "Saving…" : "Save profile"}
              </Button>
              <p
                role="status"
                className="flex items-center gap-1 text-sm text-muted-foreground"
              >
                {saved && <>Profile saved</>}
              </p>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
