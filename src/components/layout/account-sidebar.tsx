import type { AuthState } from "@/features/auth/use-auth";
import { LegalMenu } from "@/components/layout/legal-menu";
import { AccountMenu } from "@/features/auth/account-menu";
import { NotificationsBell } from "@/features/notifications/notifications";
import { ProfileCardSkeleton } from "@/components/loading-skeletons";
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
      {session === null && (
        <div className="hidden lg:block">
          <ProfileCardSkeleton />
        </div>
      )}
      {session !== null && (
        <>
          {/* Small desktop: avatar on top, bell and menu below it. Large: one row. */}
          <div className="mb-4 flex flex-col items-center gap-1 lg:flex-row lg:justify-end lg:gap-2">
            <div className="lg:order-3">
              <AccountMenu auth={auth} />
            </div>
            {signedIn && (
              <div className="lg:order-2">
                <NotificationsBell className="size-9" />
              </div>
            )}
            <div className="lg:order-1">
              <LegalMenu />
            </div>
          </div>
          <div className="hidden space-y-10 lg:block">
            {signedIn && <ProfileCard session={session} auth={auth} />}
            <TrendingTopics />
          </div>
        </>
      )}
    </aside>
  );
}
