import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AlertTriangleIcon } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors so a single failure doesn't blank the whole app.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon" className="w-16 h-16 border-2">
                <AlertTriangleIcon className="size-10 text-red-500" />
              </EmptyMedia>
              <EmptyTitle>Terjadi kesalahan</EmptyTitle>
              <EmptyDescription>
                {this.state.error.message ||
                  "Aplikasi mengalami error tak terduga."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center gap-2">
              <Button onClick={this.handleReset}>Coba lagi</Button>
              <Button variant="outline" onClick={() => location.reload()}>
                Muat ulang
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
