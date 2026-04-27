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
  const startingVertexPositionRef = useRef<BABYLON.Vector3 | null>(null);

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
  
  //adjust camera
  const adjustViewOnSketchModeToggle = () => {
    if(isSketchMode) {
      setCamera(prevCamera => {
        if(!prevCamera) return null;
        prevCamera.alpha = -Math.PI /2 ; //other adjustments
        prevCamera.beta = -Math.PI/2;
        prevCamera.radius = 10; // Adjust size of your scene
        return prevCamera;
      });
      camera?.detachControl();
    }
    else  {
      setCamera(prevCamera => {
        if(!prevCamera) return null;
        prevCamera.alpha = -Math.PI / 2; //other adjustments
        prevCamera.beta = Math.PI / 3;
        prevCamera.radius = 15; // Adjust based on the size of your scene
        return prevCamera;
      });
      camera?.attachControl(canvasRef.current, false);
    }
  }
  
  //adjust camera toggle view
  const adjustViewOnMoveModeToggle = () => {
    if(isMoveMode) {

      camera?.detachControl();
    }
    else  {
      camera?.attachControl(canvasRef.current, false);
    }
  }
  
  const toggleSketchMode = () => {
    if (isSketchMode) {
      // Cleaning up when exiting
      if (previewLineRef.current) {
        previewLineRef.current.dispose();
        previewLineRef.current = null;
      }
    }
    setIsSketchMode(prevValue => !prevValue);
  };
  useEffect(() => {
    adjustViewOnSketchModeToggle();
  }, [isSketchMode])

  const toggleMoveMode = () => setIsMoveMode(prevValue => !prevValue);
  useEffect(() => {
    if(isMoveMode==false) {
      geometries.forEach(geom => {
        if(!sceneRef.current) return;
          geom.material=defaultGeometryMaterial(sceneRef.current);
      });
    }
    adjustViewOnMoveModeToggle();
  }, [isMoveMode]);

  const toggleVertexEditMode = () => setIsVertexEditMode(prevValue => !prevValue);
  useEffect(() => {
    if(isVertexEditMode) {
      if(targetGeometryIdxRef.current==-1) {
        alert("Please select an object first to edit vertex");
        toggleVertexEditMode();
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

  extrudedMesh.position.y = 1;
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
  
  // Since ExtrudePolygon isn't easily modifiable, we'll scale it for now
  // A better way would be to recreate it, but scaling Y is a good start
  selectedGeometry.scaling.y = newHeight;
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
    for(const geom of geometries) {
        if(!sceneRef.current) return;
        if (!geom.metadata?.hasCustomColor) {
          geom.material = defaultGeometryMaterial(sceneRef.current);
        }
    }
    let selectionIdx=-1;
    if(selection) {
      // Highlight selected object with a slight emissive or glow instead of overwriting color
      // Or just keep the custom color but maybe add a border? 
      // For now, let's keep the custom color and just ensure the panel updates.
      selectionIdx=selection.metadata.geomIndex;
      
      // Update properties for selection
      const mat = selection.material as BABYLON.StandardMaterial;
      setSelectedProps({
        height: selection.scaling.y || 1,
        color: mat.diffuseColor ? mat.diffuseColor.toHexString() : "#f9f9f9",
        name: selection.name
      });
    } else {
      setSelectedProps(null);
    }
    targetGeometryIdxRef.current=selectionIdx;
    setSelectedGeometry(selection);
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
    geometries.forEach(geom => {
        if(!sceneRef.current) return;
        if (!geom.metadata?.hasCustomColor) {
          geom.material=defaultGeometryMaterial(sceneRef.current);
        }
    });
    const selection = geometries.find(geom => geom.name === pickInfo.pickedMesh?.name);
    let selectionIdx=-1;
    if (selection) {
      const currentPos = getGroundPosition();
      if (currentPos) {
          const offset = selection.position.subtract(currentPos);
          initialOffsetRef.current=offset;
      }
      selectionIdx=selection.metadata.geomIndex;
      
      // Update properties for selection
      const mat = selection.material as BABYLON.StandardMaterial;
      setSelectedProps({
        height: selection.scaling.y || 1,
        color: mat.diffuseColor ? mat.diffuseColor.toHexString() : "#f9f9f9",
        name: selection.name
      });
    }
    targetGeometryIdxRef.current=selectionIdx;
};

const pointerMoveMoveMode = () => {
  if (!sceneRef.current || targetGeometryIdxRef.current==-1 || !initialOffsetRef.current) return;

  const currentPos = getGroundPosition();
  
  if (!currentPos) {
    console.error('cannot get ground position');
    return;
  }
  const newPos = currentPos.add(initialOffsetRef.current);
  const selection = geometries.find(geom => geom.metadata.geomIndex==targetGeometryIdxRef.current) ?? null;
  if(!selection) {
    console.error('no geometry selected to move');
    return;
  }
  selection.position=newPos.clone();
  setSelectedGeometry(selection);
  
};

const pointerUpMoveMode = () => {
    geometries.forEach(geom => {
        if(!sceneRef.current) return;
        if(geom.metadata.geomIndex!=targetGeometryIdxRef.current) {
          if (!geom.metadata?.hasCustomColor) {
            geom.material=defaultGeometryMaterial(sceneRef.current);
          }
        }
    });
    targetGeometryIdxRef.current=-1;
    setSelectedGeometry(null);
    initialOffsetRef.current=null;
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
  newPosition: BABYLON.Vector3,
  connectedIndices: number[]
) => {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!positions) return;

  // Convert world position to local position
  const worldMatrix = mesh.getWorldMatrix();
  const localPosition = BABYLON.Vector3.TransformCoordinates(
    newPosition,
    BABYLON.Matrix.Invert(worldMatrix)
  );

  // Get the movement delta
  const oldPosition = new BABYLON.Vector3(
    positions[vertexIndex],
    positions[vertexIndex + 1],
    positions[vertexIndex + 2]
  );
  const movementDelta = localPosition.subtract(oldPosition);

  // Update main vertex position
  positions[vertexIndex] = localPosition.x;
  positions[vertexIndex + 1] = localPosition.y;
  positions[vertexIndex + 2] = localPosition.z;

  // Update connected vertices with scaled movement
  connectedIndices.forEach(connIndex => {
    const connectedVertex = new BABYLON.Vector3(
      positions[connIndex],
      positions[connIndex + 1],
      positions[connIndex + 2]
    );

    // Calculate distance factor (vertices further away move less)
    const distance = BABYLON.Vector3.Distance(oldPosition, connectedVertex);
    const scaleFactor = Math.max(0, 1 - distance / 2); // Adjust the divisor to control the influence range

    // Apply scaled movement
    positions[connIndex] += movementDelta.x * scaleFactor;
    positions[connIndex + 1] += movementDelta.y * scaleFactor;
    positions[connIndex + 2] += movementDelta.z * scaleFactor;
  });

  // Update the mesh
  mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  mesh.refreshBoundingInfo();
  mesh.computeWorldMatrix(true);
};

const pointerDownVertexEditMode = () => {
  if (!sceneRef.current || !isVertexEditMode) return;
  const scene = sceneRef.current; // Get scene reference

  const pickResult = scene.pick(
    scene.pointerX,
    scene.pointerY,
    (mesh) => geometries.includes(mesh as BABYLON.Mesh)
  );

  if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedPoint) {
    const mesh = pickResult.pickedMesh as BABYLON.Mesh;
    
    // Auto-select if not already target
    if (targetGeometryIdxRef.current !== mesh.metadata.geomIndex) {
        targetGeometryIdxRef.current = mesh.metadata.geomIndex;
        setSelectedGeometry(mesh);
        // Sync props
        const mat = mesh.material as BABYLON.StandardMaterial;
        setSelectedProps({
          height: mesh.scaling.y || 1,
          color: mat.diffuseColor ? mat.diffuseColor.toHexString() : "#ef4444",
          name: mesh.name
        });
    }

    const closest = findClosestVertex(mesh, pickResult.pickedPoint);

    if (closest) {
      setIsDragging(true);
      selectedVertexRef.current = closest;
      selectedMeshRef.current = mesh;
      startingVertexPositionRef.current = closest.vertex.clone();

      // Visual feedback for selected vertex and connected vertices
      if (dragBoxRef.current) {
        dragBoxRef.current.dispose();
      }

      // Create main vertex indicator
      const box = BABYLON.MeshBuilder.CreateBox("dragBox", {
        size: 0.25 // Larger indicator
      }, scene);
      box.position = closest.vertex;
      box.material = dragBoxMaterial(scene);
      dragBoxRef.current = box;

      // Highlight connected vertices
      closest.connectedIndices.forEach(idx => {
        const connectedPos = new BABYLON.Vector3(
          mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)![idx],
          mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)![idx + 1],
          mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)![idx + 2]
        );
        const worldPos = BABYLON.Vector3.TransformCoordinates(
          connectedPos,
          mesh.getWorldMatrix()
        );
        const connectedBox = BABYLON.MeshBuilder.CreateBox("connectedVertex", {
          size: 0.15 // Larger indicators
        }, scene);
        connectedBox.position = worldPos;
        const connMat = new BABYLON.StandardMaterial("connMat", scene);
        connMat.diffuseColor = BABYLON.Color3.FromHexString("#6366f1"); // Indigo for connected
        connectedBox.material = connMat;
        connectedBox.metadata = { isConnectedVertex: true };
      });
    }
  }
};

const pointerMoveVertexEditMode = () => {
  if (!sceneRef.current || !isDragging || !selectedVertexRef.current || !selectedMeshRef.current) return;

  const pickResult = sceneRef.current.pick(
    sceneRef.current.pointerX,
    sceneRef.current.pointerY,
    (mesh) => mesh === groundRef.current
  );

  if (pickResult.hit && pickResult.pickedPoint) {
    // Update vertex position with connected vertices
    updateVertexPosition(
      selectedMeshRef.current,
      selectedVertexRef.current.index,
      pickResult.pickedPoint,
      selectedVertexRef.current.connectedIndices
    );

    // Update visual feedback
    if (dragBoxRef.current) {
      dragBoxRef.current.position = pickResult.pickedPoint;
    }
  }
};

const pointerUpVertexEditMode = () => {
  setIsDragging(false);
  selectedVertexRef.current = null;
  selectedMeshRef.current = null;
  startingVertexPositionRef.current = null;

  // Clean up all vertex indicators
  if (sceneRef.current) {
    const meshes = sceneRef.current.meshes.slice(); // Create a copy to avoid modification during iteration
    meshes.forEach(mesh => {
      if (mesh.metadata?.isConnectedVertex || mesh === dragBoxRef.current) {
        mesh.dispose();
      }
    });
  }
  dragBoxRef.current = null;
};


  // Setup event listeners for sketch, move and vertexEdit modes
  
  
  useEffect(() => {

    if(!sceneRef.current) return;
    const obs = sceneRef.current?.onPointerObservable.add((pointerInfo) => {
        // console.log(pointerInfo);

        //if in sketch mode, draw when mouse is clicked & complete sketch when mouse + shft is clicked
        if(isSketchMode && pointerInfo.event.button==0) {
            switch(pointerInfo.event.shiftKey) {

              case false:
                handleSketch();
                break;
                
                case true:
                  toggleCloseShape();
                  break;

                default:
                  break;
            }
        }
        else if (isSketchMode && pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            updatePreviewLine();
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

  // Reset view function
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
  const handlePointerDown = (_event: PointerEvent) => {
    if (!sceneRef.current) return;
    const pickInfo = sceneRef.current.pick(
      sceneRef.current.pointerX,
      sceneRef.current.pointerY
    );

    if (isSketchMode) {
      handleSketch();
    } else if (isMoveMode) {
      pointerDownMoveMode(pickInfo);
    } else if (isVertexEditMode) {
      pointerDownVertexEditMode();
    }
  };

  const handlePointerMove = (_event: PointerEvent) => {
    if (!sceneRef.current) return;
    if (isMoveMode) {
      pointerMoveMoveMode();
    } else if (isVertexEditMode) {
      pointerMoveVertexEditMode();
    }
  };

  const handlePointerUp = (_event: PointerEvent) => {
    if (!sceneRef.current) return;
    if (isMoveMode) {
      pointerUpMoveMode();
    } else if (isVertexEditMode) {
      pointerUpVertexEditMode();
    }
  };

  const handleWheel = (_event: WheelEvent) => {
    // Wheel handling is done by BabylonJS camera controls
  };

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
    camera,
    resetView,
    toggleGrid,
    isGridVisible,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isDragging,
    selectedProps,
    updateSelectedMeshHeight,
    updateSelectedMeshColor,
    zoomIn,
    zoomOut,
    clearSketch,
  };
};

