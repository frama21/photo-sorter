import { version } from "../../../package.json";

import ModeToggle from "@/components/ThemeMode";
import StatusIndicator from "@/components/StatusIndicator";

const Navbar = () => {
  const appVersion = `v${version}`;

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center">
              <img src="/icon.png" alt="logo" />
              {/* <FolderOpen className="w-4 h-4 md:w-5 md:h-5" /> */}
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-lg leading-tight">
                Photo Sorter
              </h1>
              <p className="text-[10px] md:text-xs">
                {appVersion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* status indicator */}
            <StatusIndicator />

            {/* Theme Toggle */}
            <ModeToggle />
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
