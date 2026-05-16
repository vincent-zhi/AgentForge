import React, { useEffect } from 'react';
import { WorkbenchLayout } from '@/components/workbench';

const App: React.FC = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-full">
      <WorkbenchLayout />
    </div>
  );
};

export default App;
