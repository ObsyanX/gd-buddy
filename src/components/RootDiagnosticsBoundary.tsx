// Top-level ErrorBoundary that catches provider/hook crashes (e.g.
// QueryClientProvider throwing because of a null React dispatcher) and
// renders an actionable diagnostics panel instead of a blank screen.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { attemptViteCacheReset } from "@/lib/react-healthcheck";

interface Props {
  children: ReactNode;
  diagnostics?: string;
}
interface State {
  error: Error | null;
}

const NULL_HOOK_RE = /Cannot read propert(y|ies).*of null.*use(State|Effect|Context|Ref|Memo|Callback|Reducer)/i;

export default class RootDiagnosticsBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[root-diagnostics]", error, info.componentStack);
  }

  handleReset = () => {
    void attemptViteCacheReset();
  };

  handleReload = () => window.location.reload();

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isHookMismatch = NULL_HOOK_RE.test(error.message);
    const title = isHookMismatch ? "Preview stalled — dependency cache is out of sync" : "Something went wrong";
    const explanation = isHookMismatch
      ? "Vite has two copies of React loaded (usually after a recent package install). Clearing the browser + dep cache and reloading fixes it."
      : "An unexpected error occurred while rendering the app.";

    return (
      <div style={rootStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase" }}>
            Diagnostics
          </div>
          <h1 style={{ fontSize: 22, margin: "8px 0 4px", color: "#f1f5f9" }}>{title}</h1>
          <p style={{ color: "#cbd5e1", lineHeight: 1.5, marginBottom: 16 }}>{explanation}</p>

          <pre style={preStyle}>
            {error.name}: {error.message}
            {this.props.diagnostics ? `\n\n${this.props.diagnostics}` : ""}
          </pre>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button style={primaryBtn} onClick={this.handleReset}>
              Clear cache & reload
            </button>
            <button style={secondaryBtn} onClick={this.handleReload}>
              Retry
            </button>
          </div>

          {isHookMismatch && (
            <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
              If this persists after reload, restart the dev server so Vite rebuilds{" "}
              <code style={codeStyle}>node_modules/.vite</code>.
            </p>
          )}
        </div>
      </div>
    );
  }
}

const rootStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#0f172a",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const cardStyle: React.CSSProperties = {
  maxWidth: 560,
  width: "100%",
  padding: 28,
  borderRadius: 12,
  background: "#1e293b",
  border: "1px solid #334155",
  boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
};
const preStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#fca5a5",
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  overflow: "auto",
  maxHeight: 160,
  whiteSpace: "pre-wrap",
};
const primaryBtn: React.CSSProperties = {
  background: "#6366f1",
  color: "white",
  border: 0,
  padding: "10px 16px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "#e2e8f0",
  border: "1px solid #475569",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};
const codeStyle: React.CSSProperties = {
  background: "#0f172a",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 11,
};
