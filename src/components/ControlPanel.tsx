import React from 'react';

interface ControlPanelProps {
  isSketchMode: boolean;
  isMoveMode: boolean;
  isVertexEditMode: boolean;
  canExtrude: boolean;
  isGridVisible: boolean;
  onToggleSketch: () => void;
  onToggleMove: () => void;
  onToggleVertexEdit: () => void;
  onExtrude: () => void;
  onResetView: () => void;
  onToggleGrid: () => void;
  hasGeometries: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isSketchMode,
  isMoveMode,
  isVertexEditMode,
  canExtrude,
  isGridVisible,
  onToggleSketch,
  onToggleMove,
  onToggleVertexEdit,
  onExtrude,
  onResetView,
  onToggleGrid,
  hasGeometries,
}) => {
  return (
    <div className="control-panel">
      <div className="button-group">
        <div className="button-group-title">Drawing</div>
        <button 
          className={isSketchMode ? 'active' : ''} 
          onClick={onToggleSketch}
          title="Press D to toggle draw mode"
        >
          {isSketchMode ? '✏️ Exit Draw' : '✏️ Draw'}
        </button>
        <button
          onClick={onExtrude}
          disabled={!canExtrude}
          title="Create 3D shape from sketch"
        >
          🔼 Extrude Shape
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">Edit</div>
        <button
          className={isMoveMode ? 'active' : 'edit-button'}
          onClick={onToggleMove}
          disabled={!hasGeometries || isSketchMode}
          title="Press M for move mode"
        >
          ✋ Move
        </button>
        <button
          className={isVertexEditMode ? 'active' : 'edit-button'}
          onClick={onToggleVertexEdit}
          disabled={!hasGeometries || isSketchMode}
          title="Press V for vertex edit mode"
        >
          🔹 Edit Vertex
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">View</div>
        <button
          onClick={onResetView}
          title="Reset camera view (Press R)"
        >
          🔄 Reset View
        </button>
        <button
          onClick={onToggleGrid}
          className={isGridVisible ? 'active' : ''}
          title="Toggle grid visibility (Press G)"
        >
          {isGridVisible ? '📏 Hide Ruler' : '📏 Show Ruler'}
        </button>
      </div>

      <div className="help-text">
        <p>Left Click: Place points / Select</p>
        <p>Mouse Wheel: Zoom in/out</p>
        <p>Right Click + Drag: Orbit camera</p>
        <p>Middle Click + Drag: Pan camera</p>
      </div>
    </div>
  );
};

export default ControlPanel; 