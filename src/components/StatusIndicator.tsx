import { CheckCircle2, XCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

import { useStatusStore } from "@/stores/statusStore"

const StatusIndicator = () => {
  const { statuses } = useStatusStore()
  const currentStatus = statuses[0]

  const isStatusLoading = currentStatus?.type === "loading"
  const isStatusSuccess = currentStatus?.type === "success"
  const isStatusError = currentStatus?.type === "error"

  return (
    <div className="flex items-center justify-center" role="status" aria-live="polite" aria-atomic="true">
      {currentStatus && (
        <Badge>
          {isStatusLoading && <Spinner />}
          {isStatusSuccess && <CheckCircle2 className="w-3 h-3" />}
          {isStatusError && <XCircle className="w-3 h-3" />}
          <span>{currentStatus.message}</span>
        </Badge>
      )}
    </div>
  )
}

export default StatusIndicator
