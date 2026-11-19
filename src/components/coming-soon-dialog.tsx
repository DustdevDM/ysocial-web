import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ComingSoonDialog({
  open,
  onOpenChange,
  feature = "This feature",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Construction
            className="size-9 text-muted-foreground"
            aria-hidden="true"
          />
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl font-semibold">
              Coming soon
            </DialogTitle>
            <DialogDescription className="text-balance">
              {feature} is on its way. Very very soon, azy gotchu.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="secondary"
            className="mt-1"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
