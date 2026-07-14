import { version } from "../../../package.json"

import ModeToggle from "@/components/ThemeMode"
import StatusIndicator from "@/components/StatusIndicator"
import ShortcutsDialog from "@/components/ShortcutsDialog"

const Navbar = () => {
  const appVersion = `v${version}`

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center">
            {/* Decorative: the app name is already in the adjacent <h1>. */}
            <img src="/icon.png" alt="" />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-lg leading-tight">Photo Sorter</h1>
            <p className="text-[10px] md:text-xs">{appVersion}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusIndicator />
          <ShortcutsDialog />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

export default Navbar
