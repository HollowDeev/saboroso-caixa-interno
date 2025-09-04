import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: 'red' }}>
          <div>Ocorreu um erro ao renderizar o componente de login.</div>
          {this.state.error && (
            <pre style={{ color: 'black', background: '#fff3cd', padding: 16, marginTop: 16, borderRadius: 8, textAlign: 'left', overflowX: 'auto' }}>
              <b>Erro:</b> {this.state.error?.toString()}
              {this.state.errorInfo && (
                <>
                  <br />
                  <b>Stack trace:</b>
                  <br />
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
