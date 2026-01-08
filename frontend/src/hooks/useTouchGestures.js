import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook para manejar gestos táctiles en el canvas de mapas mentales
 * - Pinch-to-zoom: Zoom con dos dedos
 * - Pan táctil: Mover el canvas con un dedo
 * - Tap: Seleccionar nodos
 */
export const useTouchGestures = ({
  zoom,
  setZoom,
  pan,
  setPan,
  minZoom = 0.3,
  maxZoom = 2,
  onTap,
  enabled = true
}) => {
  const [isTouching, setIsTouching] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  
  // Referencias para tracking
  const touchStartRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef(0);
  const initialZoomRef = useRef(1);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef(0);
  const touchMoveCountRef = useRef(0);
  
  // Calcular distancia entre dos puntos
  const getDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);
  
  // Calcular centro entre dos puntos
  const getCenter = useCallback((touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);
  
  // Handler para inicio de toque
  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    
    const touches = e.touches;
    touchMoveCountRef.current = 0;
    
    if (touches.length === 1) {
      // Un dedo: preparar para pan o tap
      const touch = touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      setIsTouching(true);
      setIsPinching(false);
    } else if (touches.length === 2) {
      // Dos dedos: preparar para pinch-to-zoom
      e.preventDefault();
      const distance = getDistance(touches[0], touches[1]);
      const center = getCenter(touches[0], touches[1]);
      
      initialPinchDistanceRef.current = distance;
      initialZoomRef.current = zoom;
      pinchCenterRef.current = center;
      setIsPinching(true);
      setIsTouching(false);
    }
  }, [enabled, zoom, getDistance, getCenter]);
  
  // Handler para movimiento de toque
  const handleTouchMove = useCallback((e) => {
    if (!enabled) return;
    
    const touches = e.touches;
    touchMoveCountRef.current++;
    
    if (touches.length === 1 && isTouching && !isPinching) {
      // Pan con un dedo
      const touch = touches[0];
      const deltaX = touch.clientX - lastPanRef.current.x;
      const deltaY = touch.clientY - lastPanRef.current.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (touches.length === 2 && isPinching) {
      // Pinch-to-zoom
      e.preventDefault();
      
      const distance = getDistance(touches[0], touches[1]);
      const scale = distance / initialPinchDistanceRef.current;
      let newZoom = initialZoomRef.current * scale;
      
      // Limitar zoom
      newZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));
      
      // Calcular nuevo centro para zoom hacia el punto de pinch
      const center = getCenter(touches[0], touches[1]);
      const zoomDelta = newZoom - zoom;
      
      if (Math.abs(zoomDelta) > 0.001) {
        // Ajustar pan para mantener el punto de pinch estable
        const rect = e.currentTarget?.getBoundingClientRect();
        if (rect) {
          const canvasX = center.x - rect.left;
          const canvasY = center.y - rect.top;
          
          // Calcular nuevo pan para mantener el punto de zoom centrado
          const panAdjustX = (canvasX - pan.x) * (zoomDelta / zoom);
          const panAdjustY = (canvasY - pan.y) * (zoomDelta / zoom);
          
          setPan(prev => ({
            x: prev.x - panAdjustX,
            y: prev.y - panAdjustY
          }));
        }
        
        setZoom(newZoom);
      }
    }
  }, [enabled, isTouching, isPinching, zoom, pan, setPan, setZoom, minZoom, maxZoom, getDistance, getCenter]);
  
  // Handler para fin de toque
  const handleTouchEnd = useCallback((e) => {
    if (!enabled) return;
    
    const touches = e.touches;
    
    // Detectar tap (toque sin mucho movimiento)
    if (isTouching && touchMoveCountRef.current < 5) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTouchTimeRef.current;
      lastTouchTimeRef.current = now;
      
      // Si fue un tap simple (no doble tap)
      if (timeSinceLastTap > 300 && onTap) {
        const touch = e.changedTouches[0];
        onTap({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
      }
    }
    
    // Si quedan dedos, ajustar estado
    if (touches.length === 0) {
      setIsTouching(false);
      setIsPinching(false);
    } else if (touches.length === 1) {
      // Un dedo restante: volver a modo pan
      const touch = touches[0];
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      setIsTouching(true);
      setIsPinching(false);
    }
  }, [enabled, isTouching, onTap]);
  
  // Prevenir comportamientos por defecto del navegador en touch
  const preventDefaultTouchBehavior = useCallback((e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, []);
  
  return {
    isTouching,
    isPinching,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd
    },
    preventDefaultTouchBehavior
  };
};

export default useTouchGestures;
