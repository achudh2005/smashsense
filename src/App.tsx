import { useEffect } from 'react';
import { LiveCameraView } from './ui/LiveCameraView';
import { initDefaultVenueAndCalibration } from './storage/db';
import { ErrorBoundary } from './ui/ErrorBoundary';

export function App() {
  useEffect(() => {
    initDefaultVenueAndCalibration().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <main className="w-screen h-screen overflow-hidden bg-slate-950 font-sans">
        <LiveCameraView />
      </main>
    </ErrorBoundary>
  );
}

export default App;
