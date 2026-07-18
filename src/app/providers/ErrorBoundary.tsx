import { Component, type ErrorInfo, type ReactNode } from "react"

import { Button } from "@/shared/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { AlertTriangleIcon } from "lucide-react"
import { t } from "@/shared/i18n"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors so a single failure doesn't blank the whole app.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  handleReset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon" className="w-16 h-16 border-2">
                <AlertTriangleIcon className="size-10 text-red-500" />
              </EmptyMedia>
              <EmptyTitle>{t("error.title")}</EmptyTitle>
              <EmptyDescription>{this.state.error.message || t("error.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center gap-2">
              <Button onClick={this.handleReset}>{t("error.retry")}</Button>
              <Button variant="outline" onClick={() => location.reload()}>
                {t("error.reload")}
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
