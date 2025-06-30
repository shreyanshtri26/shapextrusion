import * as BABYLON from 'babylonjs';

export const createPointVisual = (point: BABYLON.Vector3, scene: BABYLON.Scene | null, ground: BABYLON.GroundMesh | null) => {
    if(!scene) return;
    if(!ground) return;
    const decalMaterial = new BABYLON.StandardMaterial("decalMat", scene);
    decalMaterial.diffuseTexture = new BABYLON.Texture("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Location_dot_black.svg/1024px-Location_dot_black.svg.png", scene);
    const normal = new BABYLON.Vector3(0,1,0);
    const pointDecal = BABYLON.MeshBuilder.CreateDecal("pointDecal", 
    ground, 
    {
        position: point,
        size: new BABYLON.Vector3(0.5, 0.5, 0.5),
        angle: 0,
        normal
    });
    pointDecal.material=decalMaterial;
    return pointDecal;
};

export const createGrid = (scene: BABYLON.Scene, size: number = 10, divisions: number = 10): BABYLON.LinesMesh => {
    const lines = [];
    const step = size / divisions;
    const halfSize = size / 2;

    // Create grid lines
    for (let i = -halfSize; i <= halfSize; i += step) {
        // Vertical lines
        lines.push([
            new BABYLON.Vector3(i, 0, -halfSize),
            new BABYLON.Vector3(i, 0, halfSize)
        ]);
        // Horizontal lines
        lines.push([
            new BABYLON.Vector3(-halfSize, 0, i),
            new BABYLON.Vector3(halfSize, 0, i)
        ]);
    }

    // Create the grid mesh
    const gridMesh = BABYLON.MeshBuilder.CreateLineSystem(
        "grid",
        {
            lines: lines,
            updatable: false
        },
        scene
    );

    // Set grid material
    const gridMaterial = new BABYLON.StandardMaterial("gridMaterial", scene);
    gridMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    gridMaterial.alpha = 0.5;
    gridMesh.material = gridMaterial;

    return gridMesh;
};

export const createDimensionLabel = (
    scene: BABYLON.Scene,
    start: BABYLON.Vector3,
    end: BABYLON.Vector3,
    text: string
): void => {
    // Create line for dimension
    const lines = [start, end];
    const dimensionLine = BABYLON.MeshBuilder.CreateLines("dimensionLine", {
        points: lines,
        updatable: true
    }, scene);
    dimensionLine.color = new BABYLON.Color3(0.7, 0.7, 0.7);

    // Create text plane for dimension
    const midPoint = BABYLON.Vector3.Center(start, end);
    const plane = BABYLON.MeshBuilder.CreatePlane("dimensionLabel", {
        width: 1,
        height: 0.3
    }, scene);
    plane.position = midPoint;

    // Create dynamic texture for text
    const texture = new BABYLON.DynamicTexture("dynamicTexture", {
        width: 256,
        height: 76
    }, scene, true);
    const material = new BABYLON.StandardMaterial("textMaterial", scene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    material.backFaceCulling = false;
    plane.material = material;

    // Draw text
    const font = "bold 76px Arial";
    texture.drawText(text, null, null, font, "#ffffff", "#00000000", true);

    // Make the label always face the camera
    scene.registerBeforeRender(() => {
        if (scene.activeCamera) {
            const camera = scene.activeCamera;
            plane.lookAt(camera.position);
        }
    });
};
