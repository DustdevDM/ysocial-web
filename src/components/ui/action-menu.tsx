import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionMenuItem = {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  destructive?: boolean;
} & (
  | { kind: "link"; to: string; reloadDocument?: boolean }
  | { kind: "action"; onClick: () => void }
);

export function ActionMenu({
  trigger,
  title,
  items,
}: {
  trigger: ReactElement;
  title: ReactNode;
  items: ActionMenuItem[];
}) {
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <Drawer showSwipeHandle>
        <DrawerTrigger render={trigger} />
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {items.map(({ icon: Icon, ...item }) => (
              <DrawerClose
                key={item.label}
                nativeButton={item.kind !== "link"}
                role={item.kind === "link" ? "link" : undefined}
                disabled={item.disabled}
                onClick={item.kind === "action" ? item.onClick : undefined}
                render={
                  <Button
                    variant="ghost"
                    className={`min-h-12 w-full justify-start gap-3 text-base ${item.destructive ? "mt-2 border-t text-destructive hover:text-destructive" : ""}`}
                    nativeButton={item.kind !== "link"}
                    render={
                      item.kind === "link" ? (
                        <Link
                          to={item.to}
                          reloadDocument={item.reloadDocument}
                        />
                      ) : undefined
                    }
                  />
                }
              >
                <Icon aria-hidden="true" />
                {item.label}
              </DrawerClose>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" sideOffset={8} className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{title}</DropdownMenuLabel>
          {items.map(({ icon: Icon, ...item }) => (
            <div key={item.label}>
              {item.destructive && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={item.disabled}
                variant={item.destructive ? "destructive" : "default"}
                render={
                  item.kind === "link" ? (
                    <Link to={item.to} reloadDocument={item.reloadDocument} />
                  ) : undefined
                }
                onClick={item.kind === "action" ? item.onClick : undefined}
              >
                <Icon />
                {item.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
