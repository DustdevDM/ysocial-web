import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "@/lib/api";

type ActivityPage = Awaited<ReturnType<typeof api.postActivity>>;

function ActivityList({
  postId,
  type,
  onNavigate,
}: {
  postId: string;
  type: "likes" | "reposts";
  onNavigate: () => void;
}) {
  const [page, setPage] = useState<ActivityPage>({
    users: [],
    nextCursor: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api.postActivity(postId, type, cursor, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setPage((previous) => ({
          users: cursor
            ? [
                ...previous.users,
                ...result.users.filter(
                  (user) =>
                    !previous.users.some((existing) => existing.id === user.id),
                ),
              ]
            : result.users,
          nextCursor: result.nextCursor,
        }));
        setLoading(false);
      },
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(reason));
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [postId, type, cursor, attempt]);

  return (
    <div
      className="relative h-[min(55dvh,24rem)] overflow-y-auto overscroll-contain"
      aria-busy={loading}
    >
      <div
        aria-hidden={!loading || page.users.length > 0}
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${loading && page.users.length === 0 ? "opacity-100" : "opacity-0"}`}
      >
        <LoadingSkeleton label={`Loading ${type}…`}>
          <div className="divide-y">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="size-9 shrink-0 rounded-[30%] [corner-shape:squircle]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </LoadingSkeleton>
      </div>
      <ul className="divide-y">
        {page.users.map((user) => (
          <li
            key={user.id}
            className="transition-opacity duration-300 ease-in-out starting:opacity-0 motion-reduce:transition-none"
          >
            <Link
              to={`/@${user.handle}`}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-2 py-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="size-9 shrink-0">
                {user.avatarUrl && (
                  <AvatarImage
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                )}
                <AvatarFallback className="text-xs">
                  {(user.displayName || user.handle).slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {user.displayName || user.handle}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{user.handle}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!loading && !error && page.users.length === 0 && (
        <p
          role="status"
          className="py-6 text-center text-sm text-muted-foreground transition-opacity duration-300 ease-in-out starting:opacity-0 motion-reduce:transition-none"
        >
          {type === "likes" ? "No likes yet." : "No reposts yet."}
        </p>
      )}
      {error && (
        <div className="space-y-2 py-4 text-center transition-opacity duration-300 ease-in-out starting:opacity-0 motion-reduce:transition-none">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError("");
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {!error && page.nextCursor && (
        <Button
          variant="ghost"
          className="mt-2 w-full transition-opacity duration-300 ease-in-out starting:opacity-0 motion-reduce:transition-none"
          disabled={loading}
          aria-label={loading ? `Loading more ${type}` : undefined}
          onClick={() => {
            setLoading(true);
            setCursor(page.nextCursor ?? undefined);
          }}
        >
          Load more
        </Button>
      )}
    </div>
  );
}

export function PostActivity({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="ml-auto" />}
      >
        <Activity aria-hidden="true" />
        Activity
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post activity</DialogTitle>
          <DialogDescription>
            See who liked or reposted this post.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="likes" className="min-w-0 gap-3">
          <TabsList className="w-full rounded-full" aria-label="Post activity">
            <TabsTrigger value="likes" className="rounded-full">
              Likes
            </TabsTrigger>
            <TabsTrigger value="reposts" className="rounded-full">
              Reposts
            </TabsTrigger>
          </TabsList>
          {/* Outgoing panels stay mounted during fades; share one grid cell. */}
          <div className="grid h-[min(55dvh,24rem)] min-h-0 overflow-hidden">
            <TabsContent
              value="likes"
              keepMounted
              className="col-start-1 row-start-1 min-h-0 transition-opacity duration-300 ease-in-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none"
            >
              <ActivityList postId={postId} type="likes" onNavigate={close} />
            </TabsContent>
            <TabsContent
              value="reposts"
              keepMounted
              className="col-start-1 row-start-1 min-h-0 transition-opacity duration-300 ease-in-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none"
            >
              <ActivityList postId={postId} type="reposts" onNavigate={close} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
