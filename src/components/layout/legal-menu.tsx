import { Bug, CodeXml, Equal, FileText, Flag, Shield } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The two-bar button that holds the legal and project links. */
export function LegalMenu({ className }: { className?: string }) {
  return (
    <ActionMenu
      items={[
        { kind: "link", label: "Report", icon: Flag, to: "/report" },
        { kind: "link", label: "Found a bug?", icon: Bug, to: "/bug" },
        { kind: "link", label: "Privacy", icon: Shield, to: "/legal/privacy" },
        { kind: "link", label: "Terms", icon: FileText, to: "/legal/terms" },
        {
          kind: "link",
          label: "Imprint",
          icon: FileText,
          to: "/legal/imprint",
        },
        {
          kind: "link",
          label: "Open Source",
          icon: CodeXml,
          to: "https://git.ysocial.cc/",
          reloadDocument: true,
        },
      ]}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-9", className)}
          aria-label="More"
            >
          <Equal aria-hidden="true" />
        </Button>
      }
    />
  );
}
