import { Link, NavLink } from "react-router";
import { CodeXml, FileText, Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navigation } from "./navigation";

export function NavigationSidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="hidden min-h-0 min-w-0 flex-col overflow-y-auto p-2 md:flex lg:p-3"
    >
      <div className="flex flex-col items-start gap-4">
        <Link
          to="/"
          className="w-fit max-w-full rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-3"
          aria-label="ysocial home"
        >
          <img
            src="/favicon.png"
            alt="ysocial"
            width={48}
            height={48}
            className="lg:hidden"
          />
          <img
            src="/logo.png"
            alt="ysocial"
            width={1708}
            height={644}
            className="hidden h-auto w-32 object-contain object-left lg:block"
          />
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex w-full flex-col gap-1"
        >
          {navigation.map(({ label, icon: Icon, to, disabled }) => (
            <Tooltip key={to}>
              <TooltipTrigger
                render={
                  disabled ? (
                    <span
                      tabIndex={0}
                      aria-label={`${label}: This feature is planned`}
                      className="block w-full cursor-not-allowed rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <button
                        type="button"
                        disabled
                        aria-label={label}
                        className="pointer-events-none flex h-10 w-full items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground opacity-50"
                      >
                        <Icon className="size-5 shrink-0" />
                        <span className="hidden lg:inline">{label}</span>
                      </button>
                    </span>
                  ) : (
                    <NavLink
                      to={to}
                      end={to === "/"}
                      aria-label={label}
                      className={({ isActive }) =>
                        `flex h-10 w-full items-center gap-3 rounded-lg px-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-muted font-bold text-foreground" : "font-medium text-muted-foreground"}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className="size-5 shrink-0"
                            strokeWidth={isActive ? 2.75 : 2}
                          />
                          <span className="hidden lg:inline">{label}</span>
                        </>
                      )}
                    </NavLink>
                  )
                }
              />
              <TooltipContent
                side="right"
                className={disabled ? "rounded-full" : undefined}
              >
                {disabled ? "This feature is planned" : label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </div>
      <nav
        aria-label="Legal and project links"
        className="mt-auto flex shrink-0 flex-col items-start gap-2 px-3 pt-6 pb-1 text-xs text-muted-foreground lg:flex-row lg:flex-wrap lg:gap-x-3"
      >
        {[
          { label: "Privacy", to: "/legal/privacy", icon: Shield },
          { label: "Terms", to: "/legal/terms", icon: FileText },
          { label: "Imprint", to: "/legal/imprint", icon: FileText },
          {
            label: "Open Source",
            to: "https://git.ysocial.cc/",
            icon: CodeXml,
          },
        ].map(({ label, to, icon: Icon }) => (
          <Tooltip key={to}>
            <TooltipTrigger
              render={
                <Link
                  to={to}
                  className="rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon aria-hidden="true" className="size-4 lg:hidden" />
                  <span className="sr-only lg:not-sr-only">{label}</span>
                </Link>
              }
            />
            <TooltipContent side="right" className="lg:hidden">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
  );
}
