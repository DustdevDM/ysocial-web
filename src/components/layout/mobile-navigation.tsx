import type { MouseEventHandler } from "react";
import { House, Search, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";
import { AccountMenu } from "@/features/auth/account-menu";
import type { AuthState } from "@/features/auth/use-auth";
import { NotificationsBell } from "@/features/notifications/notifications";
import { FloatingNavigation } from "@/components/ui/floating-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MobileHeader({
  auth,
  onLogoClick,
}: {
  auth: AuthState;
  onLogoClick: MouseEventHandler<HTMLAnchorElement>;
}) {
  const signedIn = auth.session?.authenticated && !auth.session.needsOnboarding;

  return (
    <header className="shrink-0 border-b bg-background pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex min-h-16 items-center justify-between gap-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <Link
          to="/"
          aria-label="ysocial home"
          onClick={onLogoClick}
          className="flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src="/logo.png"
            alt="ysocial"
            width={1708}
            height={644}
            className="h-auto w-28"
          />
        </Link>
        <div className="flex items-center gap-2">
          {signedIn && <NotificationsBell className="size-11" />}
          <AccountMenu auth={auth} />
        </div>
      </div>
    </header>
  );
}

export function MobileNavigation({ auth }: { auth: AuthState }) {
  const { pathname } = useLocation();
  const session = auth.session;
  const user =
    session?.authenticated && !session.needsOnboarding ? session.user : null;
  const profilePath = user ? `/@${user.handle}` : "/profile";
  const profileIcon = user ? (
    <Avatar className="size-7">
      {session?.authenticated && session.avatarUrl && (
        <AvatarImage
          src={session.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback className="bg-white/15 text-xs text-white">
        {(user.displayName.trim() || user.handle).slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  ) : (
    <UserRound aria-hidden="true" />
  );
  const items = [
    {
      to: "/",
      label: "Feed",
      icon: <House aria-hidden="true" />,
    },
    { to: "/search", label: "Search", icon: <Search aria-hidden="true" /> },
    { to: profilePath, label: "Profile", icon: profileIcon },
  ];
  const activeTo = pathname.startsWith("/posts/")
    ? "/"
    : (items.find(({ to }) => to === pathname)?.to ?? null);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <FloatingNavigation
        items={items}
        activeTo={activeTo}
        label="Mobile navigation"
        className="pointer-events-auto mx-auto w-full max-w-64"
      />
    </div>
  );
}
