import { useState, useCallback, useRef } from 'react';

export const usePanning = () => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const startPanning = useCallback((e) => {
    setIsPanning(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const updatePanning = useCallback((e) => {
    if (!isPanning) return;

    const deltaX = e.clientX - lastPosRef.current.x;
    const deltaY = e.clientY - lastPosRef.current.y;

    setPan(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    pan,
    setPan,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    resetPan
  };
};
