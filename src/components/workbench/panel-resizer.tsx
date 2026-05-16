import React, { useCallback, useRef } from 'react';

interface PanelResizerProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  minSize?: number;
  maxSize?: number;
}

export const PanelResizer: React.FC<PanelResizerProps> = ({
  direction,
  onResize,
}) => {
  const startPos = useRef(0);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos.current;
        startPos.current = currentPos;
        onResize(delta);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction, onResize],
  );

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`${
        isHorizontal
          ? 'w-[2px] cursor-col-resize hover:w-[3px]'
          : 'h-[2px] cursor-row-resize hover:h-[3px]'
      } bg-forged-steel/20 hover:bg-ember-orange/60 transition-colors duration-fast flex-shrink-0`}
      onMouseDown={handleMouseDown}
    />
  );
};
