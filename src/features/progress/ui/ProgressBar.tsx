import { useTranslation } from "react-i18next"

import { Field, FieldLabel } from "@/shared/ui/field"
import { Progress } from "@/shared/ui/progress"

interface ProgressBarProps {
  current: number
  total: number
  sorted: number
}

const ProgressBar = ({ current, total, sorted }: ProgressBarProps) => {
  const { t } = useTranslation()
  const safeTotal = Math.max(total, 1)
  const progress = ((current + 1) / safeTotal) * 100
  const sortedProgress = (sorted / safeTotal) * 100

  return (
    <div className="flex flex-row w-full gap-5">
      <Field className="w-full">
        <FieldLabel htmlFor="progress-photo">
          <span>{t("progress.photo", { current: Math.min(current + 1, total), total })}</span>
        </FieldLabel>
        <Progress value={Math.min(progress, 100)} id="progress-photo" aria-label={t("progress.photoAria")} />
      </Field>

      <Field className="w-full">
        <FieldLabel htmlFor="progress-sort">
          <span className="ml-auto">{t("progress.sorted", { count: sorted })}</span>
        </FieldLabel>
        <Progress value={Math.min(sortedProgress, 100)} id="progress-sort" aria-label={t("progress.sortAria")} />
      </Field>
    </div>
  )
}

export default ProgressBar
