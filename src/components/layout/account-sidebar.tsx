import type { AuthState } from "@/features/auth/use-auth";
import { AccountMenu } from "@/features/auth/account-menu";
import { NotificationsBell } from "@/features/notifications/notifications";
import { ProfileCard } from "@/components/account/profile-card";
import { TrendingTopics } from "@/components/account/trending-topics";

export function AccountSidebar({ auth }: { auth: AuthState }) {
  const { session } = auth;
  const signedIn = session?.authenticated && !session.needsOnboarding;
  return (
    <aside
      aria-label={
        session === null
          ? "Loading account"
          : signedIn
            ? "Account and trending topics"
            : "Trending topics"
      }
      aria-busy={session === null}
      className="hidden min-h-0 min-w-0 overflow-hidden p-1 pt-4 md:block md:pt-6 lg:p-3 lg:pt-6"
    >
      {session !== null && (
        <>
          <div className="mb-4 flex items-center justify-end gap-1 lg:gap-2">
            {signedIn && <NotificationsBell className="size-7 lg:size-9" />}
            <AccountMenu auth={auth} />
          </div>
          <div className="hidden space-y-10 lg:block">
            {signedIn && <ProfileCard session={session} />}
            <TrendingTopics />
          </div>
        </>
      )}
    </aside>
  );
}
