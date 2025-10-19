"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "dark:data-[state=unchecked]:bg-input/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform",
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground",
          "data-[state=unchecked]:translate-x-0",
          // ✔️ LTR: ימינה 14px  |  RTL: שמאלה 14px
          "ltr:data-[state=checked]:translate-x-[calc(100%-2px)]",
          "rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
