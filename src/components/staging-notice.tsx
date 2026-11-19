import { useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const stagingHost = "ysocial.cns-preview.de";
const productionHost = "ysocial.cc";
const storageKey = "ysocial:dismiss-staging-notice";
let dismissedWithoutStorage = false;

function onStaging() {
  return window.location.hostname === stagingHost;
}

function isDismissed() {
  try {
    return dismissedWithoutStorage || localStorage.getItem(storageKey) === "true";
  } catch {
    return dismissedWithoutStorage;
  }
}

function dismissForever() {
  try {
    localStorage.setItem(storageKey, "true");
  } catch {
    dismissedWithoutStorage = true;
  }
}

function productionUrl() {
  const { pathname, search, hash } = window.location;
  return `https://${productionHost}${pathname}${search}${hash}`;
}

export function StagingNotice() {
  const [open, setOpen] = useState(() => onStaging() && !isDismissed());
  const [remember, setRemember] = useState(false);
  const checkboxId = useId();
  const stayRef = useRef<HTMLButtonElement>(null);
  function close(nextOpen: boolean) {
    if (!nextOpen && remember) dismissForever();
    setOpen(nextOpen);
  }
  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent initialFocus={stayRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>ysocial has moved</AlertDialogTitle>
          <AlertDialogDescription>
            This is only the staging instance. Your data is now at{" "}
            <strong className="font-medium text-foreground">
              {productionHost}
            </strong>
            , so please continue there.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            id={checkboxId}
            checked={remember}
            onCheckedChange={setRemember}
          />
          <label htmlFor={checkboxId}>Don’t show this again</label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel ref={stayRef}>Stay here</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (remember) dismissForever();
              window.location.assign(productionUrl());
            }}
          >
            Go to {productionHost}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
