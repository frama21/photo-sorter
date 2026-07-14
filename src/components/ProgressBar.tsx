import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"

interface ProgressBarProps {
  current: number
  total: number
  sorted: number
}

const ProgressBar = ({ current, total, sorted }: ProgressBarProps) => {
  const safeTotal = Math.max(total, 1)
  const progress = ((current + 1) / safeTotal) * 100
  const sortedProgress = (sorted / safeTotal) * 100

  return (
    <div className="flex flex-row w-full gap-5">
      <Field className="w-full">
        <FieldLabel htmlFor="progress-photo">
          <span>
            Foto {Math.min(current + 1, total)}/{total}
          </span>
        </FieldLabel>
        <Progress value={Math.min(progress, 100)} id="progress-photo" aria-label="Progres foto" />
      </Field>

      <Field className="w-full">
        <FieldLabel htmlFor="progress-sort">
          <span className="ml-auto">{sorted} disortir</span>
        </FieldLabel>
        <Progress value={Math.min(sortedProgress, 100)} id="progress-sort" aria-label="Progres sortir" />
      </Field>
    </div>
  )
}

export default ProgressBar
