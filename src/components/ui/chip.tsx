import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-3 py-1 text-sm font-medium whitespace-nowrap outline-none transition-[background-color,border-color,color,box-shadow,scale] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none [&>svg]:pointer-events-none [&>svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 enabled:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 enabled:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 enabled:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-input text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground enabled:hover:bg-accent enabled:hover:text-accent-foreground",
        ghost:
          "border-transparent bg-transparent text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground enabled:hover:bg-accent enabled:hover:text-accent-foreground",
        solid:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 enabled:hover:bg-primary/90",
      },
      size: {
        sm: "px-2 py-0.5 text-xs [&>svg]:size-3",
        md: "px-3 py-1 text-sm [&>svg]:size-4",
        lg: "px-4 py-1.5 text-base [&>svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

type ChipProps = VariantProps<typeof chipVariants> &
  (
    | (React.ComponentProps<"span"> & { as?: "span"; asChild?: boolean })
    | (React.ComponentProps<"button"> & { as: "button"; selected?: boolean })
  );

function Chip(props: ChipProps) {
  if (props.as === "button") {
    const {
      as: Comp,
      className,
      variant,
      size,
      selected,
      type = "button",
      ...buttonProps
    } = props;

    return (
      <Comp
        {...buttonProps}
        data-slot="chip"
        type={type}
        aria-pressed={selected ?? buttonProps["aria-pressed"]}
        className={cn(
          chipVariants({
            variant: variant ?? (selected === false ? "outline" : "default"),
            size,
          }),
          "select-none enabled:cursor-pointer enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:enabled:active:scale-100",
          className,
        )}
      />
    );
  }

  const {
    as = "span",
    className,
    variant,
    size,
    asChild = false,
    ...spanProps
  } = props;
  const Comp = asChild ? Slot : as;

  return (
    <Comp
      data-slot="chip"
      className={cn(chipVariants({ variant, size }), className)}
      {...spanProps}
    />
  );
}

export { Chip, chipVariants };
