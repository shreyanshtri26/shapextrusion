import { useEffect, useState, useRef } from 'react';
import * as BABYLON from 'babylonjs';
import { defaultGeometryMaterial, dragBoxMaterial, selectedGeometryMaterial } from './material.js';
import { createGrid } from './visual.js';
import earcut from "earcut";

export const useShapeLib = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  
  //scene 
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const groundRef = useRef<BABYLON.GroundMesh | null>(null);
  const [camera, setCamera] = useState<BABYLON.ArcRotateCamera | null>(null);

  //shapes
  const [isSketchMode, setIsSketchMode] = useState<Boolean>(false);
  const [isMoveMode, setIsMoveMode] = useState<Boolean>(false);
  const [points, setPoints] = useState<BABYLON.Vector3[]>([]);
  const [isCloseShape, setIsCloseShape] = useState<Boolean>(false);
  const [linesMesh, setLinesMesh] = useState<BABYLON.LinesMesh[]>([]);
  const [geometries, setGeometries] = useState<BABYLON.Mesh[]>([]);
  const targetGeometryIdxRef = useRef<number>(-1);
  const [selectedGeometry, setSelectedGeometry]=useState<BABYLON.Mesh | null>(null);
  const initialOffsetRef = useRef<BABYLON.Vector3 | null>(null);
  const [isVertexEditMode, setIsVertexEditMode] = useState(false);
  const dragBoxRef = useRef<BABYLON.Mesh | null>(null);
  const faceIdRef = useRef<number>(-1);
  const [isDragging, setIsDragging] = useState<Boolean>(false);

  // Add grid state
  const [isGridVisible, setIsGridVisible] = useState(true);
  const gridRef = useRef<BABYLON.LinesMesh | null>(null);

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
      lighting.intensity=0.8;
      
      const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);
      camera.attachControl(canvasRef.current, true);
      camera.wheelPrecision = 50; // Adjust zoom sensitivity
      camera.pinchPrecision = 50;
      camera.lowerRadiusLimit = 5; // Minimum zoom distance
      camera.upperRadiusLimit = 50; // Maximum zoom distance
      setCamera(camera);

      const ground = BABYLON.MeshBuilder.CreateGround('groundPlane', { width: 20, height: 20})
      groundRef.current=ground; 

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
  
  const adjustViewOnVertexDrag = () => {
    if(isDragging) {
      camera?.detachControl();
    }
    else {
      camera?.attachControl(canvasRef.current, false);
    }
  }
  
  const toggleSketchMode = () => setIsSketchMode(prevValue => !prevValue);
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
    if (!sceneRef.current) return;
    if(!isSketchMode) return;
    const groundPlaneName= groundRef.current?.name ?? '';
    const pickResult = sceneRef.current.pick(sceneRef.current.pointerX, sceneRef.current.pointerY, mesh => mesh.name==groundPlaneName);
    if (!pickResult?.hit) return;
    if(!pickResult.pickedPoint) return;
    addPoint(pickResult.pickedPoint);
};
  
const connectRecentTwoPointsWithLine= () => {
  const line = BABYLON.MeshBuilder.CreateLines(
    `line${points.length}`, {
      points: [points[points.length - 2], points[points.length - 1]],
      updatable: true
    }, sceneRef.current
  );
  line.color = BABYLON.Color3.FromHexString("#000000");
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
  line.color = BABYLON.Color3.FromHexString("#000000");
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
    line.parent=null;
    line.getChildren().forEach(mesh => mesh.dispose());
    line.dispose();

  });
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
  extrudedMesh.material = selectedGeometryMaterial(sceneRef.current);
  if(!extrudedMesh.metadata) extrudedMesh.metadata={};
    extrudedMesh.metadata={ geomIndex: geometries.length };
  setGeometries(prevItems => {
    const newItems = [...prevItems, extrudedMesh];
    prevItems.forEach(geom => {
      
      if(sceneRef.current) 
        geom.material=defaultGeometryMaterial(sceneRef.current);
      
    });
    return newItems;
  });
  targetGeometryIdxRef.current=extrudedMesh.metadata.geomIndex;
  setSelectedGeometry(extrudedMesh);
  clearSketch();
}
  

const handleSelectGeometry = (pickInfo: BABYLON.PickingInfo) => {
    if (!sceneRef.current) return;
    const { hit, pickedMesh } = pickInfo;
    if (!hit || !pickedMesh) return;
  
    const selection = geometries.find(geom => geom === pickedMesh) ?? null;
    for(const geom of geometries) {
        if(!sceneRef.current) return;
        geom.material=defaultGeometryMaterial(sceneRef.current);
    }
    let selectionIdx=-1;
    if(selection) {
      selection.material=selectedGeometryMaterial(sceneRef.current);
      selectionIdx=selection.metadata.geomIndex;
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
        geom.material=defaultGeometryMaterial(sceneRef.current);
    });
    const selection = geometries.find(geom => geom.name === pickInfo.pickedMesh?.name);
    let selectionIdx=-1;
    if (selection) {
      selection.material=selectedGeometryMaterial(sceneRef.current);
      const currentPos = getGroundPosition();
      if (currentPos) {
          const offset = selection.position.subtract(currentPos);
          initialOffsetRef.current=offset;
      }
      selectionIdx=selection.metadata.geomIndex;
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
        if(geom.metadata.geomIndex!=targetGeometryIdxRef.current)
          geom.material=defaultGeometryMaterial(sceneRef.current);
    });
    targetGeometryIdxRef.current=-1;
    setSelectedGeometry(null);
    initialOffsetRef.current=null;
};


const moveOrCreateDragBox = (position: BABYLON.Vector3) => {
  if (!sceneRef.current) return;
  if (!dragBoxRef.current) {
    // drag box if not exist
    dragBoxRef.current = BABYLON.MeshBuilder.CreateSphere("dragBox", {diameter: 0.2}, sceneRef.current);
    dragBoxRef.current.material = dragBoxMaterial(sceneRef.current);
  }
  // Move the drag box to the position
  dragBoxRef.current.position = position.clone();
};

function findCornerVerticesFromFaceHit(
  pickedMesh: BABYLON.AbstractMesh,
  faceId: number 
): BABYLON.Vector3[] {
  // Retrieve the index data for the mesh. Indices are integers that reference the vertices array, determining which vertices make up each face of the mesh.
  const indices = pickedMesh.getIndices();
  
  // Retrieve the positions of all vertices in the mesh. This is a flat array where every three values represent the x, y, z coordinates of a vertex.
  const positions = pickedMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

  // Check for completeness of the mesh data. If any of these arrays are null or undefined, the mesh is considered incomplete for this operation.
  if (!indices || !positions) {
    console.error('Mesh data is incomplete');
    return []; // Return an empty array as we cannot proceed without complete data.
  }

  // Calculate the indices of the vertices that make up the hit face. Since each face of a mesh is typically formed by three vertices (forming a triangle), and 'faceId' gives us the specific face, we find the corresponding vertex indices by multiplying 'faceId' by 3 and accessing the 'indices' array.
  const faceVertexIndices = [
    indices[faceId * 3],     // Index of the first vertex of the face
    indices[faceId * 3 + 1], // Index of the second vertex
    indices[faceId * 3 + 2], // Index of the third vertex
  ];

  // Convert the vertex indices to their actual Vector3 positions. This involves mapping each index to its corresponding position in the 'positions' array. Since 'positions' is a flat array, each group of three values (x, y, z) represents one vertex. We access these groups using the indices we found earlier.
  const faceVertexPositions = faceVertexIndices.map(index => {
    const posIndex = index * 3; // Calculate the starting index in the 'positions' array for this vertex.
    return new BABYLON.Vector3(
      positions[posIndex],     // x value of the vertex
      positions[posIndex + 1], // y value of the vertex
      positions[posIndex + 2]  // z value of the vertex
    );
  });

  // Return the positions of the vertices that make up the hit face. This array of Vector3 objects represents the corners of the face in 3D space, allowing further operations (such as finding the closest vertex to a point) to be performed on this specific face.
  return faceVertexPositions;
}

const getClosestVertexToPickedPoint: (geometry: BABYLON.Mesh | BABYLON.AbstractMesh, point: BABYLON.Vector3, faceId: number) => BABYLON.Vector3 | null = (
  geometry: BABYLON.Mesh | BABYLON.AbstractMesh, // The geometry/mesh being examined.
  point: BABYLON.Vector3, // The world space point that was picked/clicked.
  hitFaceId: number // The ID of the face that was initially hit, used to limit the search to vertices of this face.
) => {
  const THRESHOLD_DISTANCE=5;
  // First, get the positions of the vertices that make up the hit face.
  const vertices = findCornerVerticesFromFaceHit(geometry, hitFaceId);

  let minDistVx: BABYLON.Vector3 | null = null; // This will hold the closest vertex position in world space.
  let minDist = Infinity; // Initialize with infinity to ensure any real distance is smaller.

  // Compute the inverse of the world matrix to transform the picked point to the local space of the geometry.
  const inverseWorldMatrix = geometry.computeWorldMatrix(true).invert();
  const localPointPos = BABYLON.Vector3.TransformCoordinates(point, inverseWorldMatrix);

  // Loop through each vertex of the hit face.
  vertices.forEach(vertex => {
    // Calculate the distance from the current vertex to the picked point, both in local space.
    const distance = BABYLON.Vector3.Distance(vertex, localPointPos);
    // console.log(distance);
    // If this distance is the smallest so far, update minDist and minDistVx.
    if (distance < minDist && THRESHOLD_DISTANCE<=5) {
      minDist = distance;
      // Transform the closest vertex position back to world space before storing.
      minDistVx = BABYLON.Vector3.TransformCoordinates(vertex, geometry.computeWorldMatrix(true));
    }
  });

  // Return the position of the closest vertex in world space.
  return minDistVx;
}

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

    if (distance < closestDistance && distance < 0.5) { // 0.5 is the selection threshold
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
        size: 0.1
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
          size: 0.05
        }, scene);
        connectedBox.position = worldPos;
        connectedBox.material = defaultGeometryMaterial(scene);
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

  // Mouse event handlers
  const handlePointerDown = (event: PointerEvent) => {
    if (!sceneRef.current) return;

    if (isSketchMode) {
      handleSketch();
    } else if (isMoveMode) {
      const pickInfo = sceneRef.current.pick(
        sceneRef.current.pointerX,
        sceneRef.current.pointerY
      );
      pointerDownMoveMode(pickInfo);
    } else if (isVertexEditMode) {
      const pickInfo = sceneRef.current.pick(
        sceneRef.current.pointerX,
        sceneRef.current.pointerY
      );
      pointerDownVertexEditMode();
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!sceneRef.current) return;

    if (isMoveMode) {
      pointerMoveMoveMode();
    } else if (isVertexEditMode && isDragging) {
      pointerMoveVertexEditMode();
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!sceneRef.current) return;

    if (isMoveMode) {
      pointerUpMoveMode();
    } else if (isVertexEditMode) {
      pointerUpVertexEditMode();
    }
  };

  const handleWheel = (event: WheelEvent) => {
    // Camera zoom is handled automatically by BabylonJS
    // We can add custom behavior here if needed
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
  };
};

