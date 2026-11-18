import { useEffect } from 'react';
import { LiveCameraView } from './ui/LiveCameraView';
import { initDefaultVenueAndCalibration } from './storage/db';

export function App() {
  useEffect(() => {
    initDefaultVenueAndCalibration().catch(console.error);
  }, []);

  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <LiveCameraView />
    </main>
  );
}

export default App;
