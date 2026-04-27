import React, { useEffect, useRef } from 'react';
import { useShapeLib } from '../utils/useShapeLib.js';
import ControlPanel from './ControlPanel.js';

const Scene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { 
    points, 
    geometries, 
    isSketchMode, 
    toggleSketchMode, 
    extrudeShape, 
    isMoveMode, 
    toggleMoveMode, 
    isVertexEditMode, 
    toggleVertexEditMode,
    resetView,
    toggleGrid,
    isGridVisible,
    isDragging,
    selectedProps,
    updateSelectedMeshHeight,
    updateSelectedMeshColor,
    zoomIn,
    zoomOut,
    clearSketch,
  } = useShapeLib(canvasRef);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch(e.key.toLowerCase()) {
        case 'd':
          toggleSketchMode();
          break;
        case 'm':
          if (geometries.length > 0 && !isSketchMode && !isVertexEditMode) {
            toggleMoveMode();
          }
          break;
        case 'v':
          if (geometries.length > 0 && !isSketchMode && !isMoveMode) {
            toggleVertexEditMode();
          }
          break;
        case 'escape':
          if (isSketchMode) toggleSketchMode();
          if (isMoveMode) toggleMoveMode();
          if (isVertexEditMode) toggleVertexEditMode();
          break;
        case 'g':
          toggleGrid();
          break;
        case 'r':
          resetView();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSketchMode, isMoveMode, isVertexEditMode, geometries.length]);

  // Handle mouse events


  return (
    <div className="canvas-container">
      <ControlPanel
        isSketchMode={isSketchMode}
        isMoveMode={isMoveMode}
        isVertexEditMode={isVertexEditMode}
        canExtrude={points.length >= 3}
        onToggleSketch={toggleSketchMode}
        onToggleMove={toggleMoveMode}
        onToggleVertexEdit={toggleVertexEditMode}
        onExtrude={extrudeShape}
        onResetView={resetView}
        onToggleGrid={toggleGrid}
        onClearSketch={clearSketch}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        isGridVisible={isGridVisible}
        hasGeometries={geometries.length > 0}
        selectedProps={selectedProps}
        onUpdateHeight={updateSelectedMeshHeight}
        onUpdateColor={updateSelectedMeshColor}
      />
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight} 
      />
      <div className="status-bar">
        <div className="status-dot"></div>
        {isSketchMode && `Points: ${points.length}`}
        {isMoveMode && 'Move Mode: Click and drag objects'}
        {isVertexEditMode && (isDragging 
          ? 'Dragging vertex... Release to set position' 
          : 'Click any vertex to edit its position')}
        {!isSketchMode && !isMoveMode && !isVertexEditMode && 'Ready'}
      </div>
    </div>
  );
};

export default Scene;

