import { useEffect, useState, useRef } from 'react';
import * as BABYLON from 'babylonjs';
import { defaultGeometryMaterial, dragBoxMaterial } from './material.js';
import { createGrid } from './visual.js';
import earcut from "earcut";

export const useShapeLib = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  
  //scene 
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const groundRef = useRef<BABYLON.GroundMesh | null>(null);
  const [camera, setCamera] = useState<BABYLON.ArcRotateCamera | null>(null);

  //shapes
  const [isSketchMode, setIsSketchMode] = useState<boolean>(false);
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  const [points, setPoints] = useState<BABYLON.Vector3[]>([]);
  const [isCloseShape, setIsCloseShape] = useState<boolean>(false);
  const [linesMesh, setLinesMesh] = useState<BABYLON.LinesMesh[]>([]);
  const [geometries, setGeometries] = useState<BABYLON.Mesh[]>([]);
  const targetGeometryIdxRef = useRef<number>(-1);
  const [selectedGeometry, setSelectedGeometry]=useState<BABYLON.Mesh | null>(null);
  const initialOffsetRef = useRef<BABYLON.Vector3 | null>(null);
  const [isVertexEditMode, setIsVertexEditMode] = useState(false);
  const dragBoxRef = useRef<BABYLON.Mesh | null>(null);
  const faceIdRef = useRef<number>(-1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false); // Core logic flag
  const vertexIndicatorsRef = useRef<BABYLON.AbstractMesh[]>([]);
  
  // Property Inspector states
  const [selectedProps, setSelectedProps] = useState<{
    height: number;
    color: string;
    name: string;
  } | null>(null);

  // Add grid state
  const [isGridVisible, setIsGridVisible] = useState(true);
  const gridRef = useRef<BABYLON.LinesMesh | null>(null);
  const previewLineRef = useRef<BABYLON.LinesMesh | null>(null);

  // Enhanced vertex editing state
  const selectedVertexRef = useRef<{
    vertex: BABYLON.Vector3;
    index: number;
    connectedIndices: number[];
  } | null>(null);
  const selectedMeshRef = useRef<BABYLON.Mesh | null>(null);

  //setup scene
  useEffect(() => {
    if (canvasRef.current) {
      const engine = new BABYLON.Engine(canvasRef.current, true);
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      sceneRef.current = scene;

      const lighting=new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1,1,1), scene);
      lighting.intensity=0.7;
      
      const pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 10, 0), scene);
      pointLight.intensity = 0.5;
      
      const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);
      camera.attachControl(canvasRef.current, true);
      camera.wheelPrecision = 50; // Adjust zoom sensitivity
      camera.pinchPrecision = 50;
      camera.lowerRadiusLimit = 5; // Minimum zoom distance
      camera.upperRadiusLimit = 50; // Maximum zoom distance
      setCamera(camera);

      const ground = BABYLON.MeshBuilder.CreateGround('groundPlane', { width: 20, height: 20})
      groundRef.current=ground; 
      
      // Give ground a light material so black lines are visible
      const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
      ground.material = groundMat;

      // Create and store grid
      const grid = createGrid(scene, 20, 20);
      gridRef.current = grid;

      engine.runRenderLoop(() => {
        scene.render();
      });

      window.addEventListener('resize', () => {
        engine.resize();
      });

      return () => {
        window.removeEventListener('resize', () => engine.resize());
        engine.dispose();
      };
    }
  }, [canvasRef?.current?.id]);
  
  // Manage camera controls and views based on active tools
  useEffect(() => {
    if (!camera || !canvasRef.current) return;
    
    if (isSketchMode) {
      // Switch to Top-Down view for precision sketching
      setCamera(prev => {
        if (!prev) return null;
        prev.alpha = -Math.PI / 2;
        prev.beta = 0.01; // Almost top-down
        prev.radius = 12;
        return prev;
      });
      // Detach control so sketch stays still
      camera.detachControl();
    } else {
        // Return to Front Perspective view when stopping sketch
        setCamera(prev => {
            if (!prev) return null;
            // Transition back to a front-perspective view
            prev.beta = Math.PI / 2.2; // Front-ish perspective
            prev.alpha = -Math.PI / 2; // Face forward
            prev.radius = 15;
            return prev;
        });

      // Allow 360 rotation again
      if (!isDragging) {
        camera.attachControl(canvasRef.current, true);
      }
    }
  }, [camera, isSketchMode, isDragging]);
  
  const toggleSketchMode = () => {
    // If we are starting a NEW sketch session, clear the previous one automatically
    // to provide a better user experience and avoid messy connections.
    if (!isSketchMode) {
      clearSketch();
    } else {
      // Cleaning up when exiting
      if (previewLineRef.current) {
        previewLineRef.current.dispose();
        previewLineRef.current = null;
      }
    }
    setIsSketchMode(prevValue => !prevValue);
  };
  useEffect(() => {
    if (camera && canvasRef.current && !isSketchMode && !isMoveMode && !isVertexEditMode && !isDragging) {
      camera.attachControl(canvasRef.current, true);
    }
  }, [camera, isSketchMode, isMoveMode, isVertexEditMode, isDragging]);

  const toggleMoveMode = () => setIsMoveMode(prevValue => !prevValue);

  const toggleVertexEditMode = () => setIsVertexEditMode(prevValue => !prevValue);
  useEffect(() => {
    if(isVertexEditMode) {
      if(targetGeometryIdxRef.current==-1) {
        alert("Please select an object first to edit vertex");
        setIsVertexEditMode(false);
        return;
      }
    }
  }, [isVertexEditMode]);

const addPoint = (point: BABYLON.Vector3) => {
  if(!sceneRef.current) return;
  if(!isSketchMode) return;
    setPoints(prevPoints => [...prevPoints, point]);
};
  
const handleSketch = () => {
    if (!sceneRef.current || !isSketchMode) return;
    
    const groundPlaneName= groundRef.current?.name ?? '';
    const pickResult = sceneRef.current.pick(sceneRef.current.pointerX, sceneRef.current.pointerY, mesh => mesh.name==groundPlaneName);
    if (!pickResult?.hit || !pickResult.pickedPoint) return;
    
    if (previewLineRef.current) {
        previewLineRef.current.dispose();
        previewLineRef.current = null;
    }
    
    addPoint(pickResult.pickedPoint);
};

const updatePreviewLine = () => {
    if (!isSketchMode || points.length === 0 || !sceneRef.current) return;
    
    const currentPos = getGroundPosition();
    if (!currentPos) return;

    const startPoint = points[points.length - 1];
    const previewPoints = [startPoint, currentPos];

    if (previewLineRef.current) {
        // Update existing line
        const positions = previewLineRef.current.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (positions) {
            positions[3] = currentPos.x;
            positions[4] = currentPos.y;
            positions[5] = currentPos.z;
            previewLineRef.current.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        }
    } else {
        // Create new preview line
        const line = BABYLON.MeshBuilder.CreateLines("previewLine", {
            points: previewPoints,
            updatable: true
        }, sceneRef.current);
        line.color = new BABYLON.Color3(0.5, 0.5, 0.5); // Gray for preview
        previewLineRef.current = line;
    }
};
  
const connectRecentTwoPointsWithLine= () => {
  const line = BABYLON.MeshBuilder.CreateLines(
    `line${points.length}`, {
      points: [points[points.length - 2], points[points.length - 1]],
      updatable: true
    }, sceneRef.current
  );
  line.color = BABYLON.Color3.Black();
  linesMesh.push(line);
  setLinesMesh(prevLines => [...prevLines, line]);
}
useEffect(() => {
  if(!sceneRef.current) return;
  if(points.length<=1) return;
  if(!isSketchMode) return;
  connectRecentTwoPointsWithLine();
}, [points.length]);


const toggleCloseShape = () => setIsCloseShape(prevVal => !prevVal);

const completeSketch=() => {
  const line = BABYLON.MeshBuilder.CreateLines(
    `line${points.length+1}`, // Unique each line
    {
        points: [
            points[points.length - 1], // last point
            points[0], // first point
        ],
    },
    sceneRef.current
  );
  line.color = BABYLON.Color3.Black();
  setLinesMesh(prevLines => [...prevLines, line]);
  toggleCloseShape();
  toggleSketchMode();
}
useEffect(() => {
  if(!sceneRef.current) return;
  if(points.length<3) return;
  if(!isCloseShape) return;
    completeSketch();
}, [isCloseShape, points.length]);
  
  
const clearSketch = () => {  
  linesMesh.forEach(line => {
    line.dispose();
  });
  if (previewLineRef.current) {
    previewLineRef.current.dispose();
    previewLineRef.current = null;
  }
  setPoints([]);
  setLinesMesh([]);
}

const extrudeShape = () => {
  if (!sceneRef.current) return;
  if(points.length < 3) {
    alert('Atleast 3 points needed');
    clearSketch();
    return;
  }
  
  if (isSketchMode) {
    setIsSketchMode(false);
  }

  const shape = points.map(p => new BABYLON.Vector3(p.x, 0, p.z));
  const extrudedMesh = BABYLON.MeshBuilder.ExtrudePolygon(
      `geometry${geometries.length}`,
      {
        shape,
        depth: 1,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        updatable: true,
        wrap: true,
      },
      sceneRef.current,
      earcut
  );

  extrudedMesh.position.y = 0.5; // Start with half of depth (1.0)
  extrudedMesh.convertToFlatShadedMesh();
  
  // Set default color to Red
  const defaultRed = "#ef4444";
  const mat = new BABYLON.StandardMaterial("defaultRedMat", sceneRef.current);
  mat.diffuseColor = BABYLON.Color3.FromHexString(defaultRed);
  extrudedMesh.material = mat;
  if(!extrudedMesh.metadata) extrudedMesh.metadata={};
  extrudedMesh.metadata={ geomIndex: geometries.length, hasCustomColor: true };
  
  setGeometries(prevItems => {
    const newItems = [...prevItems, extrudedMesh];
    prevItems.forEach(geom => {
      
      if(sceneRef.current && geom !== extrudedMesh) {
         // Only reset to gray if it doesn't have a custom color in metadata
         if (!geom.metadata?.hasCustomColor) {
           geom.material = defaultGeometryMaterial(sceneRef.current);
         }
      }
      
    });
    return newItems;
  });
  targetGeometryIdxRef.current=extrudedMesh.metadata.geomIndex;
  setSelectedGeometry(extrudedMesh);
  setSelectedProps({
    height: 1,
    color: defaultRed,
    name: extrudedMesh.name
  });
  clearSketch();
}

const updateSelectedMeshHeight = (newHeight: number) => {
  if (!selectedGeometry || !sceneRef.current) return;
  
  // Scale it and adjust position so base stays at y=0
  selectedGeometry.scaling.y = newHeight;
  selectedGeometry.position.y = newHeight / 2;
  
  setSelectedProps(prev => prev ? { ...prev, height: newHeight } : null);
};

const updateSelectedMeshColor = (newColor: string) => {
  if (!selectedGeometry || !sceneRef.current) return;
  
  const material = new BABYLON.StandardMaterial("customMat", sceneRef.current);
  material.diffuseColor = BABYLON.Color3.FromHexString(newColor);
  selectedGeometry.material = material;
  if (!selectedGeometry.metadata) selectedGeometry.metadata = {};
  selectedGeometry.metadata.hasCustomColor = true;
  setSelectedProps(prev => prev ? { ...prev, color: newColor } : null);
};
  

const handleSelectGeometry = (pickInfo: BABYLON.PickingInfo) => {
    if (!sceneRef.current) return;
    const { hit, pickedMesh } = pickInfo;
    if (!hit || !pickedMesh) return;
  
    const selection = geometries.find(geom => geom === pickedMesh) ?? null;
    
    let selectionIdx = -1;
    if (selection) {
        selectionIdx = selection.metadata.geomIndex;
        const mat = selection.material as BABYLON.StandardMaterial;
        const color = mat.diffuseColor ? mat.diffuseColor.toHexString() : "#ffffff";
        
        setSelectedProps({
          height: selection.scaling.y || 1,
          color: color,
          name: selection.name
        });
        
        if (isVertexEditMode) {
            refreshVertexIndicators(selection);
        }
    } else {
        setSelectedProps(null);
    }
    
    targetGeometryIdxRef.current = selectionIdx;
    setSelectedGeometry(selection);
};

const refreshVertexIndicators = (mesh: BABYLON.Mesh) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    // Clear old indicators
    vertexIndicatorsRef.current.forEach(m => m.dispose());
    vertexIndicatorsRef.current = [];
    
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return;

    // Use a Set to avoid overlapping indicators at same position
    const seenPoints = new Set<string>();

    for (let i = 0; i < positions.length; i += 3) {
        const localPos = new BABYLON.Vector3(positions[i], positions[i+1], positions[i+2]);
        const worldPos = BABYLON.Vector3.TransformCoordinates(localPos, mesh.getWorldMatrix());
        const key = `${worldPos.x.toFixed(2)},${worldPos.y.toFixed(2)},${worldPos.z.toFixed(2)}`;
        
        if (!seenPoints.has(key)) {
            seenPoints.add(key);
            const sphere = BABYLON.MeshBuilder.CreateSphere("vInd", { diameter: 0.35 }, scene); // Slightly larger
            sphere.position = worldPos;
            sphere.material = dragBoxMaterial(scene);
            sphere.isPickable = true; 
            sphere.metadata = { isVertexMarker: true, vertexIndex: i, parentMesh: mesh };
            sphere.renderingGroupId = 2; 
            vertexIndicatorsRef.current.push(sphere);
        }
    }
};
  
const getGroundPosition = () => {
    if(!sceneRef.current) return null;
    const groundPlaneName=groundRef?.current?.name ?? "";
    if(!groundPlaneName) return null;
    const pickinfo = sceneRef.current.pick(sceneRef.current.pointerX, sceneRef.current.pointerY, function (mesh) { return mesh.name == groundPlaneName });
    if (!pickinfo.hit) return null;
    return pickinfo.pickedPoint;
};

const pointerDownMoveMode = (pickInfo: BABYLON.PickingInfo) => {
    if (!isMoveMode || !sceneRef.current || !pickInfo.hit || pickInfo.pickedMesh === groundRef.current) return;
    
    const selection = geometries.find(geom => geom === pickInfo.pickedMesh);
    let selectionIdx=-1;
    if (selection) {
      const currentPos = getGroundPosition();
      if (currentPos) {
          const offset = selection.position.subtract(currentPos);
          initialOffsetRef.current=offset;
      }
      selectionIdx=selection.metadata.geomIndex;
      
      // Lock camera during move
      if (camera && canvasRef.current) {
        camera.detachControl();
      }

      // Update properties for selection
      const mat = selection.material as BABYLON.StandardMaterial;
      setSelectedProps({
        height: selection.scaling.y || 1,
        color: mat.diffuseColor ? mat.diffuseColor.toHexString() : "#f9f9f9",
        name: selection.name
      });
    }
    targetGeometryIdxRef.current=selectionIdx;
    isDraggingRef.current = selection ? true : false;
    setSelectedGeometry(selection || null);
};

const pointerMoveMoveMode = () => {
  if (!sceneRef.current || targetGeometryIdxRef.current==-1 || !initialOffsetRef.current || !isDraggingRef.current) return;

  const currentPos = getGroundPosition();
  
  if (!currentPos) {
    console.error('cannot get ground position');
    return;
  }
  const newPos = currentPos.add(initialOffsetRef.current);
  const selection = geometries.find(geom => geom.metadata?.geomIndex === targetGeometryIdxRef.current) ?? null;
  if(!selection) {
    console.error('no geometry selected to move');
    return;
  }
  selection.position=newPos.clone();
  setSelectedGeometry(selection);
  
};

const pointerUpMoveMode = () => {
    targetGeometryIdxRef.current = -1;
    initialOffsetRef.current = null;
    isDraggingRef.current = false;
    
    // Unlock camera
    if (camera && canvasRef.current) {
      camera.attachControl(canvasRef.current, true);
    }
};


// Function to find connected vertices
const findConnectedVertices = (mesh: BABYLON.Mesh, vertexIndex: number): number[] => {
  const indices = mesh.getIndices();
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!indices || !positions) return [];

  const connectedIndices = new Set<number>();
  
  // Look through triangles to find connected vertices
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
    
    if (tri.includes(vertexIndex)) {
      // Add all vertices from this triangle except the selected one
      tri.forEach(idx => {
        if (idx !== vertexIndex) {
          connectedIndices.add(idx);
        }
      });
    }
  }

  return Array.from(connectedIndices);
};

// Function to find the closest vertex to a point
const findClosestVertex = (mesh: BABYLON.Mesh, pickingPoint: BABYLON.Vector3): { 
  vertex: BABYLON.Vector3; 
  index: number;
  connectedIndices: number[];
} | null => {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!positions) return null;

  let closestVertex = null;
  let closestDistance = Infinity;
  let closestIndex = -1;

  // Check each vertex
  for (let i = 0; i < positions.length; i += 3) {
    const vertex = new BABYLON.Vector3(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    // Transform vertex to world space
    const worldVertex = BABYLON.Vector3.TransformCoordinates(
      vertex,
      mesh.getWorldMatrix()
    );
    const distance = BABYLON.Vector3.Distance(worldVertex, pickingPoint);

    if (distance < closestDistance && distance < 0.8) { // Increased selection threshold to 0.8
      closestDistance = distance;
      closestVertex = worldVertex;
      closestIndex = i;
    }
  }

  if (!closestVertex) return null;

  // Find connected vertices
  const connectedIndices = findConnectedVertices(mesh, closestIndex);

  return {
    vertex: closestVertex,
    index: closestIndex,
    connectedIndices
  };
};

// Function to update vertex position with connected vertices adjustment
const updateVertexPosition = (
  mesh: BABYLON.Mesh, 
  vertexIndex: number, 
  newWorldPos: BABYLON.Vector3
) => {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!positions || vertexIndex < 0 || vertexIndex >= positions.length) return;

  const worldMatrix = mesh.getWorldMatrix();
  const invMatrix = BABYLON.Matrix.Invert(worldMatrix);
  const localPos = BABYLON.Vector3.TransformCoordinates(newWorldPos, invMatrix);

  const oldLocalX = positions[vertexIndex];
  const oldLocalY = positions[vertexIndex + 1];
  const oldLocalZ = positions[vertexIndex + 2];

  if (oldLocalX === undefined || oldLocalY === undefined || oldLocalZ === undefined) return;

  // Update all vertices at the same local position (topology integrity)
  // Use a safer loop count to stay within bounds
  const len = positions.length;
  for (let i = 0; i <= len - 3; i += 3) {
      const px = positions[i];
      const py = positions[i + 1];
      const pz = positions[i + 2];
      
      if (Math.abs(px - oldLocalX) < 0.01 && 
          Math.abs(py - oldLocalY) < 0.01 && 
          Math.abs(pz - oldLocalZ) < 0.01) {
          positions[i] = localPos.x;
          positions[i + 1] = localPos.y;
          positions[i + 2] = localPos.z;
      }
  }

  mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  mesh.refreshBoundingInfo();
  mesh.computeWorldMatrix(true);
  
  // Update indicator positions
  refreshVertexIndicators(mesh);
};

const pointerDownVertexEditMode = () => {
    if (!sceneRef.current || !isVertexEditMode) return;
    const scene = sceneRef.current;

    const pickResult = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (mesh) => geometries.includes(mesh as BABYLON.Mesh) || mesh.metadata?.isVertexMarker
    );

    if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedPoint) {
        let mesh: BABYLON.Mesh;
        let vertexIndex: number = -1;

        if (pickResult.pickedMesh.metadata?.isVertexMarker) {
            mesh = pickResult.pickedMesh.metadata.parentMesh;
            vertexIndex = pickResult.pickedMesh.metadata.vertexIndex;
        } else {
            mesh = pickResult.pickedMesh as BABYLON.Mesh;
            const closest = findClosestVertex(mesh, pickResult.pickedPoint);
            if (closest) {
                vertexIndex = closest.index;
            }
        }

        if (vertexIndex !== -1 && mesh) {
            // Auto-select if not already target
            if (targetGeometryIdxRef.current !== mesh.metadata.geomIndex) {
                handleSelectGeometry(pickResult);
            }

            setIsDragging(true);
            isDraggingRef.current = true;
            
            // Lock camera during node edit
            if (camera && canvasRef.current) {
                camera.detachControl();
            }

            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!;
            const vertexPos = new BABYLON.Vector3(positions[vertexIndex], positions[vertexIndex+1], positions[vertexIndex+2]);
            const worldPos = BABYLON.Vector3.TransformCoordinates(vertexPos, mesh.getWorldMatrix());

            selectedVertexRef.current = {
                vertex: worldPos,
                index: vertexIndex,
                connectedIndices: [vertexIndex]
            };
            selectedMeshRef.current = mesh;

            if (dragBoxRef.current) dragBoxRef.current.dispose();
            const box = BABYLON.MeshBuilder.CreateBox("dragBox", { size: 0.3 }, scene);
            box.position = worldPos;
            box.material = dragBoxMaterial(scene);
            box.renderingGroupId = 2; 
            dragBoxRef.current = box;
        }
    }
};

const pointerMoveVertexEditMode = () => {
    if (!sceneRef.current || !isDraggingRef.current || !selectedMeshRef.current || !selectedVertexRef.current) return;
    
    const currentPos = getGroundPosition();
    if (currentPos) {
      updateVertexPosition(selectedMeshRef.current, selectedVertexRef.current.index, currentPos);
      if (dragBoxRef.current) dragBoxRef.current.position = currentPos;
    }
};

const pointerUpVertexEditMode = () => {
  setIsDragging(false);
  isDraggingRef.current = false;
  selectedVertexRef.current = null;
  selectedMeshRef.current = null;
  
  // Unlock camera
  if (camera && canvasRef.current) {
    camera.attachControl(canvasRef.current, true);
  }

  if (dragBoxRef.current) {
      dragBoxRef.current.dispose();
      dragBoxRef.current = null;
  }
};


  // Setup event listeners for sketch, move and vertexEdit modes
  
  
  useEffect(() => {

    if(!sceneRef.current) return;
    const obs = sceneRef.current?.onPointerObservable.add((pointerInfo) => {
        // console.log(pointerInfo);

        //if in sketch mode, draw when mouse is clicked & complete sketch when mouse + shft is clicked
        if(isSketchMode) {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOUBLETAP) {
                if (points.length >= 3) {
                    toggleCloseShape();
                    toggleSketchMode();
                }
                return;
            }

            if (pointerInfo.event.button == 0) {
                switch(pointerInfo.event.shiftKey) {
                    case false:
                        handleSketch();
                        break;
                    case true:
                        toggleCloseShape();
                        break;
                }
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                updatePreviewLine();
            }
        }
        //if in moveMode, select when mouse is clicked, move object on mouse movement and release at position of next mouse click
        else if(isMoveMode) {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                  if(!pointerInfo.pickInfo) break;
                  pointerDownMoveMode(pointerInfo.pickInfo)
                  break;
                case BABYLON.PointerEventTypes.POINTERMOVE:          
                  pointerMoveMoveMode();
                  break;
                case BABYLON.PointerEventTypes.POINTERUP:
                  pointerUpMoveMode();
                  break;
            }
        }
        //if in vertexEditMode, select vertex to drag when mouse is clicked, drag vertex on mouse movement and update object shape and release at position of next mouse click
        else if(isVertexEditMode) {
            switch(pointerInfo.type) {
              case BABYLON.PointerEventTypes.POINTERDOWN:
                pointerDownVertexEditMode();
                break;
              case BABYLON.PointerEventTypes.POINTERMOVE:          
                pointerMoveVertexEditMode();
                break;
              case BABYLON.PointerEventTypes.POINTERUP:
                pointerUpVertexEditMode();
                break;
            }
        }
        else if(pointerInfo.type==BABYLON.PointerEventTypes.POINTERDOWN && !isVertexEditMode) {
          if(!pointerInfo.pickInfo) return;
            handleSelectGeometry(pointerInfo.pickInfo);

        }
    });

    return () => {
      if (obs) 
        sceneRef.current?.onPointerObservable.remove(obs);
    };
  }, [
      sceneRef.current?.isReady(), 
      isSketchMode, 
      isMoveMode, 
      isVertexEditMode,
      geometries,
      points,
      groundRef.current,
      targetGeometryIdxRef.current, 
      faceIdRef.current,
      selectedGeometry,
      initialOffsetRef.current,
      dragBoxRef.current
    ]
  );

  // Grid visibility toggle
  const toggleGrid = () => {
    setIsGridVisible(prev => !prev);
    if (gridRef.current) {
      gridRef.current.isVisible = !gridRef.current.isVisible;
    }
  };

  // Handle cleanup of vertex indicators when mode changes
  useEffect(() => {
    if (!isVertexEditMode || !selectedGeometry) {
      vertexIndicatorsRef.current.forEach(m => m.dispose());
      vertexIndicatorsRef.current = [];
    } else if (isVertexEditMode && selectedGeometry) {
      refreshVertexIndicators(selectedGeometry as BABYLON.Mesh);
    }
  }, [isVertexEditMode, selectedGeometry]);

  const resetView = () => {
    if (camera) {
      camera.alpha = -Math.PI / 2;
      camera.beta = Math.PI / 3;
      camera.radius = 15;
      camera.target = BABYLON.Vector3.Zero();
    }
  };

  const zoomIn = () => {
    if (camera) {
      camera.radius = Math.max(camera.lowerRadiusLimit || 2, camera.radius - 2);
    }
  };

  const zoomOut = () => {
    if (camera) {
      camera.radius = Math.min(camera.upperRadiusLimit || 50, camera.radius + 2);
    }
  };

  // Mouse event handlers
  return {
    points,
    linesMesh,
    isSketchMode,
    toggleSketchMode,
    isMoveMode,
    toggleMoveMode,
    extrudeShape,
    geometries,
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
  };
};

