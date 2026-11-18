import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast-manager";
import type { Post } from "@/lib/api";
import { PostComposer } from "./post-composer";
import type { FeedState } from "./use-feed";

/** Write a quote: your own post with the original embedded below it. */
export function QuoteDialog({
  post,
  feed,
  open,
  onOpenChange,
}: {
  post: Post;
  feed: FeedState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quote post</DialogTitle>
          <DialogDescription className="sr-only">
            Add your own words, a GIF or a poll. The original post is shown below yours.
          </DialogDescription>
        </DialogHeader>
        <PostComposer
          feed={feed}
          quote={post}
          autoFocus
          placeholder="Add a comment…"
          onSubmitted={() => onOpenChange(false)}
          onConfirmed={(quote) =>
            toast.add({
              title: "Quote posted",
              timeout: 5000,
              actionProps: {
                children: "View",
                onClick: () => void navigate(`/posts/${quote.id}`),
              },
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
}
