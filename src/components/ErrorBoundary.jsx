import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'var(--red)', background: 'var(--bg-surface)', borderRadius: '12px', margin: '2rem', border: '1px solid var(--border)' }}>
          <h2>Algo se rompió en esta sección.</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '11px', overflowX: 'auto', background: 'var(--bg-base)', padding: '1rem', border: '1px solid var(--border-soft)' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--green)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
