import "styles/globals.css";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "./components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught application error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border/80 bg-card/60 p-8 backdrop-blur">
            <div className="grid size-12 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <AlertTriangle className="size-6" />
            </div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              size="sm"
              className="mt-2"
            >
              Return to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Form />} />
          <Route path="/interview/:interviewId" element={<Interview />} />
          <Route path="/result/:interviewId" element={<Result />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-left" />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
