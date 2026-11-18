import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SmashSense Uncaught Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4 shadow-xl">
            <AlertOctagon size={36} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            SmashSense encountered an unexpected error. Your match data in local storage is safe.
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-w-lg mb-6 font-mono text-[11px] text-rose-300 overflow-x-auto text-left w-full">
            {this.state.error?.message || 'Unknown application error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all"
          >
            <RotateCcw size={15} />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
