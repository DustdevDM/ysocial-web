import { Check, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
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

const themes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <div className="flex items-center gap-2">
        <span>Theme</span>
        <Drawer showSwipeHandle>
          <DrawerTrigger
            render={<Button variant="outline" className="min-h-11" />}
            aria-label="Choose theme"
          >
            {themes.find((option) => option.value === theme)?.label}
            <ChevronDown aria-hidden="true" />
          </DrawerTrigger>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader>
              <DrawerTitle>Theme</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {themes.map(({ value, label }) => (
                <DrawerClose
                  key={value}
                  onClick={() => setTheme(value)}
                  render={
                    <Button
                      variant="ghost"
                      className="min-h-12 w-full justify-between text-base"
                    />
                  }
                  aria-pressed={theme === value}
                >
                  {label}
                  {theme === value && <Check aria-hidden="true" />}
                </DrawerClose>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }
  return (
    <label className="flex items-center gap-2">
      Theme
      <select
        className="border bg-background p-1"
        value={theme}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "light" || value === "dark" || value === "system")
            setTheme(value);
        }}
      >
        {themes.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
