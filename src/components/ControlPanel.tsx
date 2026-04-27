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
  onClearSketch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  hasGeometries: boolean;
  selectedProps: {
    height: number;
    color: string;
    name: string;
  } | null;
  onUpdateHeight: (height: number) => void;
  onUpdateColor: (color: string) => void;
}

const Icons = {
  Pencil: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
  ),
  Extrude: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  Move: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
  ),
  Vertex: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
  ),
  Reset: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
  ),
  ZoomIn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
  ),
  ZoomOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
  ),
  Grid: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
  )
};

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
  onClearSketch,
  onZoomIn,
  onZoomOut,
  hasGeometries,
  selectedProps,
  onUpdateHeight,
  onUpdateColor,
}) => {
  return (
    <>
      {/* Left Panel: Tools */}
      <div className="control-panel panel">
        <div className="button-group">
          <div className="button-group-title">Create</div>
          <button 
            className={isSketchMode ? 'active' : ''} 
            onClick={onToggleSketch}
          >
            <Icons.Pencil /> {isSketchMode ? 'Stop Drawing' : 'Sketch'}
          </button>
          
          {isSketchMode && (
             <button 
                onClick={onClearSketch}
                style={{ padding: '8px 16px', minWidth: '0', color: '#f87171' }}
                title="Clear Sketch"
              >
                Clear Workspace
              </button>
          )}

          <button
            className="primary"
            onClick={onExtrude}
            disabled={!canExtrude}
          >
            <Icons.Extrude /> Extrude
          </button>
        </div>

        <div className="button-group">
          <div className="button-group-title">Modify</div>
          <button
            className={isMoveMode ? 'active' : ''}
            onClick={onToggleMove}
            disabled={!hasGeometries || isSketchMode}
          >
            <Icons.Move /> {isMoveMode ? 'Stop Transform' : 'Start Transform'}
          </button>
          <button
            className={isVertexEditMode ? 'active' : ''}
            onClick={onToggleVertexEdit}
            disabled={!hasGeometries || isSketchMode}
          >
            <Icons.Vertex /> {isVertexEditMode ? 'Stop Edit Nodes' : 'Start Edit Nodes'}
          </button>
        </div>

        <div className="button-group">
          <div className="button-group-title">Workspace</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onZoomIn} style={{ width: '50%' }}>
              <Icons.ZoomIn /> In
            </button>
            <button onClick={onZoomOut} style={{ width: '50%' }}>
              <Icons.ZoomOut /> Out
            </button>
          </div>
          <button onClick={onResetView}>
            <Icons.Reset /> Reset View
          </button>
          <button
            onClick={onToggleGrid}
            className={isGridVisible ? 'active' : ''}
          >
            <Icons.Grid /> {isGridVisible ? 'Hide Grid' : 'Show Grid'}
          </button>
        </div>

        <div className="help-text">
          <div className="help-item">
            <span>Sketch</span>
            <span className="help-key">D</span>
          </div>
          <div className="help-item">
            <span>Move</span>
            <span className="help-key">M</span>
          </div>
          <div className="help-item">
            <span>Edit</span>
            <span className="help-key">V</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Properties */}
      {selectedProps && (
        <div className="properties-panel panel">
          <div className="button-group-title">Object Properties</div>
          
          <div className="property-row">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="property-label">Height</span>
              <span className="property-label" style={{ color: 'var(--text-main)' }}>
                {selectedProps.height.toFixed(1)}m
              </span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="10" 
              step="0.1"
              value={selectedProps.height}
              onChange={(e) => onUpdateHeight(parseFloat(e.target.value))}
            />
          </div>

          <div className="property-row">
            <span className="property-label">Color Swatches</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f9f9f9', '#334155'].map(color => (
                <div 
                  key={color}
                  onClick={() => onUpdateColor(color)}
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '4px', 
                    background: color, 
                    cursor: 'pointer',
                    border: selectedProps.color.toLowerCase() === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: selectedProps.color.toLowerCase() === color ? '0 0 8px ' + color : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="property-row" style={{ marginTop: '8px' }}>
            <span className="property-label">HEX Code</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '32px', 
                borderRadius: '6px', 
                background: selectedProps.color,
                border: '1px solid var(--glass-border)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <input 
                  type="color" 
                  value={selectedProps.color}
                  onChange={(e) => onUpdateColor(e.target.value)}
                  style={{ 
                    position: 'absolute',
                    top: '-5px',
                    left: '-5px',
                    width: '60px',
                    height: '60px',
                    cursor: 'pointer',
                    opacity: 0
                  }}
                />
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem'
                }}>#</span>
                <input 
                  className="property-input" 
                  style={{ width: '100%', paddingLeft: '22px' }}
                  type="text" 
                  value={selectedProps.color.replace('#', '').toUpperCase()} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
                      onUpdateColor('#' + val);
                    }
                  }}
                  placeholder="FFFFFF"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ControlPanel;
 