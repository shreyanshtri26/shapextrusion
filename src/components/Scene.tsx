import React, { useEffect, useRef } from 'react';
import { useShapeLib } from '../utils/useShapeLib.js';
import ControlPanel from './ControlPanel.js';
import * as BABYLON from 'babylonjs';

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
    camera,
    resetView,
    toggleGrid,
    isGridVisible,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isDragging
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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSketchMode, isMoveMode, isVertexEditMode, geometries.length]);

  // Handle mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (e.button === 0) { // Left mouse button
        handlePointerDown(e);
      }
    };

    const handleCanvasPointerMove = (e: PointerEvent) => {
      if (isDragging || isVertexEditMode) {
        handlePointerMove(e);
      }
    };

    const handleCanvasPointerUp = (e: PointerEvent) => {
      if (isDragging || isVertexEditMode) {
        handlePointerUp(e);
      }
    };

    const handleCanvasWheel = (e: WheelEvent) => {
      handleWheel(e);
    };

    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    canvas.addEventListener('pointermove', handleCanvasPointerMove);
    canvas.addEventListener('pointerup', handleCanvasPointerUp);
    canvas.addEventListener('wheel', handleCanvasWheel);

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      canvas.removeEventListener('pointermove', handleCanvasPointerMove);
      canvas.removeEventListener('pointerup', handleCanvasPointerUp);
      canvas.removeEventListener('wheel', handleCanvasWheel);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, isDragging, isVertexEditMode]);

  return (
    <div className="canvas-container">
      <ControlPanel
        isSketchMode={isSketchMode}
        isMoveMode={isMoveMode}
        isVertexEditMode={isVertexEditMode}
        canExtrude={points.length >= 3 && !isSketchMode && !isVertexEditMode}
        onToggleSketch={toggleSketchMode}
        onToggleMove={toggleMoveMode}
        onToggleVertexEdit={toggleVertexEditMode}
        onExtrude={extrudeShape}
        onResetView={resetView}
        onToggleGrid={toggleGrid}
        isGridVisible={isGridVisible}
        hasGeometries={geometries.length > 0}
      />
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight} 
      />
      <div className="status-bar">
        {isSketchMode && `Points: ${points.length}`}
        {isMoveMode && 'Move Mode: Click and drag objects'}
        {isVertexEditMode && (isDragging 
          ? 'Dragging vertex... Release to set position' 
          : 'Click any vertex to edit its position')}
      </div>
    </div>
  );
};

export default Scene;
