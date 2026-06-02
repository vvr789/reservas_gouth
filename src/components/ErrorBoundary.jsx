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
        <div style={{ padding: '2rem', color: '#f85149', background: '#161b22', borderRadius: '12px', margin: '2rem' }}>
          <h2>💥 Algo se rompió en esta sección.</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '11px', overflowX: 'auto', background: '#0d1117', padding: '1rem' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3fb950', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
