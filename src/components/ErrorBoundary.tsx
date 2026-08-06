import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0c1830] text-slate-200 px-6">
          <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center backdrop-blur-sm">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Falha Crítica
            </h1>
            
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Encontramos um erro inesperado ao carregar esta tela. 
              {this.state.error && (
                <span className="block mt-2 font-mono text-xs text-red-400/80 p-2 bg-black/40 rounded">
                  {this.state.error.message}
                </span>
              )}
            </p>

            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              TENTAR NOVAMENTE
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
