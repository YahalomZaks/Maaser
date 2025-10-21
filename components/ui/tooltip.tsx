"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

type Ctx = {
  open: boolean | undefined;
  setOpen: (v: boolean | ((p: boolean | undefined) => boolean)) => void;
  openOnClick: boolean;
};

const TooltipCtrlContext = React.createContext<Ctx | null>(null);

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

type TooltipRootProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  openOnClick?: boolean;
};

function Tooltip({ openOnClick = true, ...props }: TooltipRootProps) {
  const [open, setOpen] = React.useState<boolean | undefined>(props.open);

  // Allow hover to open, and click to toggle/persist until outside click
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    props.onOpenChange?.(next);
  };

  return (
    <TooltipProvider>
      <TooltipCtrlContext.Provider value={{ open, setOpen, openOnClick }}>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          open={open}
          onOpenChange={handleOpenChange}
          {...props}
        >
          {props.children}
        </TooltipPrimitive.Root>
      </TooltipCtrlContext.Provider>
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const ctx = React.useContext(TooltipCtrlContext);
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      // Hover opens via Provider; click toggles and persists until outside click
      onClick={(e) => {
        props.onClick?.(e);
        if (ctx?.openOnClick) {
          // Toggle open state; default undefined treated as false
          const current = !!ctx.open;
          ctx.setOpen(!current);
        }
      }}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-white text-neutral-900 border border-neutral-200 shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-white fill-white z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] border border-neutral-200" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
