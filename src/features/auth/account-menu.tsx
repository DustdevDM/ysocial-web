import { useState, type ComponentProps } from "react";
import { LogIn, LogOut, RotateCcw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import type { AuthState } from "./use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountMenu({ auth }: { auth: AuthState }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { session } = auth;
  const user =
    session?.authenticated && !session.needsOnboarding ? session.user : null;
  const avatarUrl = session?.authenticated ? session.avatarUrl : null;
  const initials = user
    ? (user.displayName.trim() || user.handle).slice(0, 2)
    : null;
  const items: ComponentProps<typeof ActionMenu>["items"] = [];
  if (user)
    items.push({
      kind: "link",
      label: "View profile",
      icon: UserRound,
      to: `/@${user.handle}`,
    });
  if (session?.authenticated && session.needsOnboarding)
    items.push({
      kind: "link",
      label: "Finish your profile",
      icon: UserRound,
      to: "/onboarding",
    });
  if (!session?.authenticated)
    items.push({
      kind: "link",
      label: "Login",
      icon: LogIn,
      to: "/auth/login",
      reloadDocument: true,
    });
  if (auth.error)
    items.push({
      kind: "action",
      label: "Retry account",
      icon: RotateCcw,
      onClick: () => void auth.reload(),
    });
  if (session?.authenticated)
    items.push({
      kind: "action",
      label: "Sign out",
      icon: LogOut,
      destructive: true,
      disabled: auth.busy,
      onClick: () => setConfirmLogout(true),
    });
  return (
    <>
      <ActionMenu
        items={items}
        title={
          user ? (
            <div className="py-1">
              <p className="truncate font-medium text-foreground">
                {user.displayName}
              </p>
              <p className="truncate text-xs">@{user.handle}</p>
            </div>
          ) : (
            "Your account"
          )
        }
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-[30%] [corner-shape:squircle] md:size-7 lg:size-9"
            aria-label="Account menu"
            title="Account menu"
            disabled={auth.busy || (!session && !auth.error)}
          >
            {!session && !auth.error ? (
              <Skeleton
                className="size-full rounded-[30%] [corner-shape:squircle]"
                aria-hidden="true"
              />
            ) : (
              <Avatar className="size-full">
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                )}
                <AvatarFallback className="text-xs">
                  {initials || <UserRound className="size-4" />}
                </AvatarFallback>
              </Avatar>
            )}
          </Button>
        }
      />
      <ConfirmationDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Sign out of ysocial?"
        description="You can keep browsing public posts and sign in again whenever you're ready."
        confirmLabel="Sign out"
        onConfirm={auth.logout}
        error={auth.error}
      />
    </>
  );
}
