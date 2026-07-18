import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangleIcon } from "lucide-react"

import { Alert, AlertTitle } from "@/shared/ui/alert"

import Navbar from "@/features/navbar"
import useFileSystem from "@/features/file-system"

import WelcomePage from "@/pages/welcome"
import EditorPage from "@/pages/editor"

/**
 * App shell: renders the persistent chrome (navbar + error banner) and routes
 * between the two pages based on whether a folder is open. This app has no URL
 * router — the single piece of "navigation" is welcome ↔ editor, driven by
 * session state, so the choice lives here.
 */
const App = () => {
  const fs = useFileSystem()
  const { i18n } = useTranslation()
  const hasPhotos = fs.photos.length > 0

  // Keep the document language in sync for assistive tech and hyphenation.
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en"
  }, [i18n.resolvedLanguage])

  return (
    <div className="min-h-screen text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="container mx-auto py-6">
        {fs.error && (
          <Alert className="max-w-md border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-50">
            <AlertTriangleIcon />
            <AlertTitle> {fs.error}</AlertTitle>
          </Alert>
        )}

        {hasPhotos ? (
          <EditorPage fs={fs} />
        ) : (
          <WelcomePage isLoading={fs.isLoading} onLoadDirectory={fs.loadDirectory} />
        )}
      </main>
    </div>
  )
}

export default App
