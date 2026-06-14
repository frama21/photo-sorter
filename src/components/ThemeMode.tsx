import { useMemo } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export const ModeToggle = () => {
  const { setTheme, theme } = useTheme();

  const isDarkTheme = useMemo(() => {
    return theme === "dark";
  }, [theme]);

  const toggleTheme = () => {
    if (isDarkTheme) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      {isDarkTheme ? (
        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default ModeToggle;
