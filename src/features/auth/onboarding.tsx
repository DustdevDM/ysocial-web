import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { PronounsField } from "@/features/profile/pronouns-field";
import { useHandleAvailability } from "@/features/profile/use-handle-availability";
import type { AuthState } from "./use-auth";

const steps = ["Handle", "Pronouns"] as const;

export function Onboarding({
  auth,
  suggestedHandle,
}: {
  auth: Pick<AuthState, "busy" | "error" | "onboard" | "logout">;
  suggestedHandle: string;
}) {
  const [step, setStep] = useState<(typeof steps)[number]>("Handle");
  const [handle, setHandle] = useState(suggestedHandle);
  const [pronouns, setPronouns] = useState("");
  const [hidePronouns, setHidePronouns] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const choosingHandle = step === "Handle";
  const availability = useHandleAvailability(handle);
  const canContinue = availability === "available" || availability === "error";
  const canCreate = hidePronouns || pronouns.trim() !== "";
  const handleTaken = availability === "taken";

  useEffect(() => {
    title.current?.focus();
  }, [step]);

  return (
    <Dialog open onOpenChange={(_open, details) => details.cancel()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto px-5 pt-5 sm:max-w-md sm:px-6 sm:pt-6"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (auth.busy || !canContinue) return;
            if (choosingHandle) setStep("Pronouns");
            else if (canCreate)
              void auth.onboard(handle, hidePronouns ? "" : pronouns.trim());
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Set up your profile</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={auth.busy}
              onClick={auth.logout}
            >
              Log out
            </Button>
          </div>
          <ol
            aria-label="Onboarding progress"
            className="grid grid-cols-2 gap-3"
          >
            {steps.map((item) => (
              <li key={item} aria-current={step === item ? "step" : undefined}>
                <span
                  aria-hidden="true"
                  className={`mb-2.5 block h-1 rounded-full ${step === item || item === "Handle" ? "bg-primary" : "bg-muted"}`}
                />
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium ${step === item ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {item === "Handle" && !choosingHandle && (
                    <Check className="size-3.5" aria-label="Complete" />
                  )}
                  {item}
                </span>
              </li>
            ))}
          </ol>
          <DialogHeader className="gap-2.5 pb-2">
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-none"
            >
              {choosingHandle
                ? "Choose your handle"
                : "What are your pronouns?"}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {choosingHandle ? (
                "People can use your handle to find you and tag you in posts."
              ) : (
                <>
                  Choose how people refer to you on{" "}
                  <strong className="wrap-anywhere font-medium text-foreground">
                    @{handle}
                  </strong>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {choosingHandle ? (
            <div className="space-y-3">
              <label
                htmlFor="onboarding-handle"
                className="block text-sm font-medium"
              >
                Handle
              </label>
              <InputGroup>
                <InputGroupAddon aria-hidden="true">@</InputGroupAddon>
                <InputGroupInput
                  id="onboarding-handle"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  pattern="[a-z0-9_]{3,32}"
                  minLength={3}
                  maxLength={32}
                  required
                  disabled={auth.busy}
                  aria-describedby="onboarding-handle-hint"
                  aria-invalid={handleTaken || undefined}
                />
                {availability === "available" && (
                  <InputGroupAddon align="inline-end" aria-hidden="true">
                    <Check className="text-primary" />
                  </InputGroupAddon>
                )}
              </InputGroup>
              <p
                id="onboarding-handle-hint"
                role="status"
                className={`text-xs ${handleTaken ? "text-destructive" : "text-muted-foreground"}`}
              >
                {handleTaken
                  ? "That handle is already taken."
                  : availability === "checking"
                    ? "Checking availability…"
                    : availability === "available"
                      ? "Handle available."
                      : "Use 3–32 lowercase letters, numbers, or underscores."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <PronounsField
                value={pronouns}
                onChange={setPronouns}
                disabled={auth.busy || hidePronouns}
                required={!hidePronouns}
              />
              <label className="flex cursor-pointer items-center gap-3.5 rounded-lg border px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-primary"
                  checked={hidePronouns}
                  disabled={auth.busy}
                  onChange={(event) => setHidePronouns(event.target.checked)}
                />
                Leave pronouns off my profile
              </label>
            </div>
          )}
          {auth.error && (
            <p role="alert" className="text-sm text-destructive">
              {auth.error}
            </p>
          )}
          <DialogFooter className="-mx-5 flex-row items-center justify-between gap-3 px-5 py-5 sm:-mx-6 sm:px-6">
            {!choosingHandle && (
              <Button
                type="button"
                variant="ghost"
                disabled={auth.busy}
                onClick={() => setStep("Handle")}
              >
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
            )}
            <Button
              type="submit"
              className="ml-auto"
              disabled={
                auth.busy || !canContinue || (!choosingHandle && !canCreate)
              }
            >
              {auth.busy && (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              )}
              {choosingHandle ? "Continue" : "Create profile"}
              {choosingHandle && <ArrowRight aria-hidden="true" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
