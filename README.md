# ShapeXtrusion: Your 3D Playground

## What's ShapeXtrusion?

ShapeXtrusion is a fun web app that lets you turn 2D sketches into 3D objects right in your browser. It's built with React and Babylon.js, turning your mouse into a magic wand for 3D creation.

## Demo Video

[Watch the demo video](https://www.loom.com/share/6b57f5d0169b4bd5b98ab6eff1f19246?sid=194fb99f-7950-4729-9391-7dbe8341d500)

## Cool Things You Can Do

- 🖌️ **Draw Mode (D)**: Draw any 2D shape on a virtual ground
- 🏗️ **Extrude**: Turn your 2D sketch into a 3D object with one click
- 🚀 **Move Mode (M)**: Drag your 3D creations around the scene
- 🔧 **Edit Vertex Mode (V)**: Reshape your 3D objects by moving individual points
- 📏 **Grid Toggle (G)**: Show or hide the grid for precise drawing
- 🔄 **Reset View (R)**: Reset the camera to the default position

## Getting Started

### What You'll Need

- Node.js (version 18 is ideal)
- A sense of adventure!

### Steps to Run

1. Navigate to the project directory:
   ```
   cd shapextrusion
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```
   
4. Wait for the magic to happen, and you're in at Local: http://localhost:5173/ !

## How to Use

### Camera Controls
- **Mouse Wheel**: Zoom in/out
- **Right Click + Drag**: Orbit camera
- **Middle Click + Drag**: Pan camera

### Draw Mode (Press D)
1. Click the "Draw" button or press D to enter draw mode
2. Click on the grid to place points
3. Keep clicking to create your shape
4. Need at least 3 points to create a valid shape
5. Press D again or click "Exit Draw" to finish

### Extrude (3D Magic)
1. After drawing a shape, click "Extrude Shape" to create your 3D object
2. The shape will be extruded upward automatically

### Move Mode (Press M)
1. Click the "Move" button or press M to enter move mode
2. Click and drag any 3D object to reposition it
3. Only available when you have 3D objects in the scene
4. Can't move objects while in Draw or Edit Vertex mode

### Edit Vertex Mode (Press V)
1. Click the "Edit Vertex" button or press V to enter vertex edit mode
2. Click any vertex (corner point) of your 3D object
3. Drag to adjust its position
4. Connected vertices will move smoothly with your edits
5. Only available when you have 3D objects in the scene
6. Can't edit vertices while in Draw or Move mode

### Additional Controls
- **G**: Toggle grid visibility
- **R**: Reset camera view to default position
- **Esc**: Exit current mode (Draw/Move/Edit)

Jump into ShapeXtrusion and let your imagination run wild in 3D! Happy creating! 🎨🚀
