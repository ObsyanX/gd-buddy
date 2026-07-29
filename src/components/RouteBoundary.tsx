import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { errorMonitor } from "@/lib/error-monitor";

interface Props {
  children: ReactNode;
  /** Optional title shown in the fallback UI. */
  title?: string;
}

interface State {
  error: Error | null;
  retryKey: number;
}

/** Chunk load failures happen after a deploy invalidates old JS bundles. */
const CHUNK_ERROR_RE =
  /(Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed)/i;

const NETWORK_ERROR_RE = /(Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED|offline)/i;

/**
 * Per-route error boundary. Catches render/lazy-load failures for a single
 * page so the rest of the shell (nav, toasts) stays usable, reports the error
 * to the global monitor, and offers retry / reload / go-home recovery.
 */
export default class RouteBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteBoundary]", error, info.componentStack);
    try {
      errorMonitor.capture({
        error_message: error.message || "Unknown route error",
        error_stack: error.stack,
        error_source: "client",
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
        metadata: { boundary: "route", component_stack: info.componentStack?.slice(0, 2000) },
      });
    } catch {
      /* never let reporting break the fallback */
    }
  }

  handleRetry = () => this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 }));

  handleReload = () => window.location.reload();

  render() {
    const { error } = this.state;
    if (!error) return <div key={this.state.retryKey}>{this.props.children}</div>;

    const msg = error.message || "";
    const isChunk = CHUNK_ERROR_RE.test(msg);
    const isNetwork = !isChunk && NETWORK_ERROR_RE.test(msg);

    const title = isChunk
      ? "A new version is available"
      : isNetwork
        ? "Connection problem"
        : this.props.title || "This page couldn't load";

    const description = isChunk
      ? "The app was updated while this tab was open. Reload to get the latest version."
      : isNetwork
        ? "We couldn't reach the server. Check your connection and try again."
        : "Something went wrong while rendering this page. You can retry, or head back home.";

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10" role="alert">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          <details className="text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none">
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap text-muted-foreground">
              {error.name}: {msg}
            </pre>
          </details>
          <div className="flex flex-wrap gap-2 justify-center pt-1">
            {isChunk ? (
              <Button onClick={this.handleReload}>
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Reload app
              </Button>
            ) : (
              <Button onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Try again
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
