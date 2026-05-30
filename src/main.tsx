import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// React Error Boundary para capturar falhas em tempo de renderização
class ReactErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro interno do React capturado:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0A0A0A', color: '#FF453A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyEncoding: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', boxSizing: 'border-box', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%', background: '#161616', border: '1px solid rgba(255, 69, 58, 0.2)', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '20px', marginBottom: '10px', fontWeight: 'bold', color: '#FFF' }}>Erro de Componente (React)</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
              Ocorreu um erro interno de execução durante a renderização do React:
            </p>
            <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'left', fontFamily: 'monospace', fontSize: '11px', color: '#FF8A8A', overflowX: 'auto', whiteSpace: 'pre-wrap', marginBottom: '20px', maxHeight: '250px' }}>
              <b>Mensagem:</b> {this.state.error?.message}\n\n<b>Rastreamento (Stack):</b>\n{this.state.error?.stack}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontEncoding: 'utf-8', fontSize: '11px' }}>
              Tente reiniciar o servidor local ou recarregar a página (F5).
            </p>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ReactErrorBoundary>
  </React.StrictMode>,
)
