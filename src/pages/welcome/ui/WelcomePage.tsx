import { useTranslation } from "react-i18next"
import { FolderOpen, ImageOff, Image as ImageIcon } from "lucide-react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { Button } from "@/shared/ui/button"

interface WelcomePageProps {
  isLoading: boolean
  onLoadDirectory: () => void
}

/**
 * The start screen shown when no folder is open yet: a single call-to-action to
 * pick a local folder. All the heavy lifting happens after a folder is chosen —
 * this page only triggers `loadDirectory`.
 */
const WelcomePage = ({ isLoading, onLoadDirectory }: WelcomePageProps) => {
  const { t } = useTranslation()

  return (
    <Empty className="h-[88dvh] animate-fade-up">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-20 rounded-3xl border-0 bg-gradient-to-br from-primary/15 to-chart-2/10 text-primary ring-1 ring-primary/20"
        >
          {isLoading ? <ImageIcon className="size-10 animate-pulse" /> : <ImageOff className="size-10" />}
        </EmptyMedia>
        <EmptyTitle className="font-display text-2xl md:text-3xl font-extrabold">{t("welcome.title")}</EmptyTitle>
        <EmptyDescription className="max-w-md">
          {t("welcome.descriptionPre")}
          <code className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-muted">nata-photo-db.json</code>
          {t("welcome.descriptionPost")}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button
          size="lg"
          onClick={onLoadDirectory}
          disabled={isLoading}
          className="gap-2 shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <FolderOpen className="size-4" />
          {isLoading ? t("welcome.ctaLoading") : t("welcome.cta")}
        </Button>
      </EmptyContent>
      <p className="text-muted-foreground mt-5 text-xs md:text-sm inline-flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-chart-4 animate-pulse" />
        {t("welcome.requirement")}
      </p>
    </Empty>
  )
}

export default WelcomePage
