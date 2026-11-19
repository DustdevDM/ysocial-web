import { useState } from "react";
import { Link, useLocation } from "react-router";
import { BadgeCheck, Check, Clock, LoaderCircle, LogOut, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AuthState } from "./use-auth";

export function ApprovalBanner() {
  return (
    <Alert className="flex shrink-0 items-center justify-center gap-2 rounded-none border-x-0 border-t-0 py-1.5">
      <AlertTitle className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
        <Clock className="size-4" aria-hidden="true" />
        Awaiting approval
      </AlertTitle>
      <AlertDescription className="hidden whitespace-nowrap sm:block">
        You can browse while your account is reviewed.
      </AlertDescription>
    </Alert>
  );
}

export function Account({ auth }: { auth: AuthState }) {
  const [handle, setHandle] = useState<string | null>(null);
  const { session } = auth;
  const location = useLocation();
  const signInError = location.pathname === "/login"
    ? new URLSearchParams(location.search).get("error")
    : null;
  if (session?.authenticated && session.needsOnboarding) {
    return (
      <Dialog
        open
        onOpenChange={(_open, eventDetails) => eventDetails.cancel()}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void auth.onboard(handle ?? session.suggestedHandle);
            }}
          >
            <DialogHeader>
              <DialogTitle>Make yourself at home</DialogTitle>
              <DialogDescription>
                Choose a handle for your ysocial profile.
              </DialogDescription>
            </DialogHeader>
            <label htmlFor="handle" className="text-sm">
              Your handle
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="handle"
                value={handle ?? session.suggestedHandle}
                onChange={(event) => setHandle(event.target.value)}
                pattern="[a-z0-9_]{3,32}"
                minLength={3}
                maxLength={32}
                required
                disabled={auth.busy}
                autoComplete="username"
              />
              <IconButton
                label="Create profile"
                type="submit"
                variant="default"
                disabled={auth.busy}
              >
                {auth.busy ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Check />
                )}
              </IconButton>
            </div>
            <p className="text-xs text-muted-foreground">
              3–32 lowercase letters, numbers, or underscores.
            </p>
            {auth.error && (
              <p role="alert" className="text-sm text-destructive">
                {auth.error}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={auth.busy}
              onClick={() => auth.logout()}
            >
              <LogOut />
              Log out
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
  const ban = session?.authenticated && !session.needsOnboarding ? session.ban : null;
  if (!auth.error && signInError === null && !ban && !auth.showApprovalWelcome) return null;
  return (
    <section
      className="mx-auto mb-6 max-w-xl space-y-3"
      aria-label="Account access"
    >
      {ban && <BanNotice key={ban.at} ban={ban} />}
      {auth.showApprovalWelcome && (
        <Dialog open onOpenChange={(open) => { if (!open) auth.dismissApprovalWelcome(); }}>
          <DialogContent className="gap-6 sm:max-w-md">
            <DialogHeader className="items-center gap-3 px-3 pt-4 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted">
                <BadgeCheck aria-hidden="true" className="size-7" />
              </span>
              <DialogTitle className="text-2xl font-semibold">Welcome to ysocial</DialogTitle>
              <DialogDescription className="max-w-xs text-balance leading-relaxed">
                <span className="mb-1 block font-medium text-foreground">You just got verified!</span>
                You’re off the waitlist. Share your first post, reply to someone in the feed, or make your profile your own.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={auth.dismissApprovalWelcome}>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {auth.error && (
        <div className="flex items-center justify-between gap-2">
          <p role="alert" className="text-sm text-destructive">
            {auth.error}
          </p>
          <IconButton label="Retry account" onClick={() => void auth.reload()}>
            <RotateCcw />
          </IconButton>
        </div>
      )}
      {signInError !== null && (
          <p role="alert" className="text-sm text-destructive">
            {signInError === "account_banned" ? "This account is banned."
              : signInError === "account_deleted" ? "This account was removed."
                : "Sign-in failed. Try signing in again."}
          </p>
        )}
    </section>
  );
}

function BanNotice({ ban }: { ban: { at: string; reason: string | null; by: string | null; byProfileHandle: string | null } }) {
  const [open, setOpen] = useState(true);
  const date = new Date(ban.at);
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted p-4 text-sm">
        <span className="font-semibold">Your account is banned</span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>View details</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You've been banned</DialogTitle>
            <DialogDescription>You can still browse ysocial.</DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold">Reason</dt>
              <dd className="wrap-anywhere whitespace-pre-wrap">{ban.reason || "No reason provided."}</dd>
            </div>
            <div>
              <dt className="font-semibold">When</dt>
              <dd><time dateTime={ban.at}>{formattedDate}</time></dd>
            </div>
            <div>
              <dt className="font-semibold">Banned by</dt>
              <dd>
                {ban.byProfileHandle ? (
                  <Link className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                    to={`/@${ban.byProfileHandle}`} onClick={() => setOpen(false)}>
                    {ban.by}
                  </Link>
                ) : ban.by ?? "Moderation team"}
              </dd>
            </div>
          </dl>
          <Button variant="outline" onClick={() => setOpen(false)}>Continue browsing</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
