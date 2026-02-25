# Polygon Coordinate Tool

A browser tool to load an image and create polygon shapes by clicking points. The focus is reliable editing, stable pan and zoom, a clearly defined coordinate system with a movable origin, and exports that are easy to consume downstream.

## Features

### Image and canvas
- Load image via drag and drop or file picker
- High DPI rendering for a sharp canvas
- Pan with Space plus drag or middle mouse drag
- Wheel zoom around the mouse cursor
- Zoom bar slider with percent display and plus minus controls
- Fit to screen and reset view

### Shapes and points
- Multiple shapes in a layers list
- Create, duplicate, delete shapes, clear all points
- Activate a shape by clicking it in the list
- Rename a shape by double clicking its name
- Add points by click
- Select, drag, and delete points
- Multi select and box select
- Insert on edge to add a point on a segment
- Nudge with arrow keys, faster with Shift
- Reorder points

### Coordinate system
- Visible X and Y axes with tick marks and labels
- Free origin placement, axis snapping supported
- Axis labels stay readable using halo and optional backplate for contrast
- Y mode switch
  - Math mode, Y positive up
  - GPU mode, Y positive down, up becomes negative
- Origin center snap to points with stable hysteresis

### Snapping
- Enable snapping toggle
- Magnetic behavior with snap in and snap out thresholds
- Hold Alt to temporarily disable snapping
- Point snapping on placement and on drag
  - to axes X0 and Y0
  - to other polygon vertices
  - to other polygon edges using segment projection
- Pre placement preview
  - marker at the snap target, optional pulsing hollow circle
- Snap scope option
  - active shape only
  - active plus hovered
  - all visible unlocked

### Polygon move and centering
- Ctrl or Cmd drag moves the full active polygon
- Button to center the active polygon to world 0,0 without changing the shape

### Export and import
- JSON and CSV copy and download
- Decimal places control for export, default 2
- Export mode selection
  - absolute, points in the current world coordinate system
  - centered, polygon center at 0,0
  - 0 centered, first point at 0,0
- Only one points list per shape in exports, based on mode and decimals
- Optional project JSON import and autosave, depending on project configuration

## Project structure

Not a single file monolith. Clean separation across UI, rendering, input, state, geometry, snapping, and IO.

Suggested layout
- index.html
- styles
- src
  - state
  - view
  - canvas
  - input
  - geometry
  - snap
  - io
  - ui

## Running locally

No build tool required. Use a local static server because some browsers restrict clipboard behavior on the file scheme.

Python example
```bash
python3 -m http.server 8000
```

Open in the browser
- http://localhost:8000

## Controls

### Mouse
- Left click on empty space adds a point
- Drag a point to move it
- Shift plus click extends the selection
- Shift plus drag creates a box selection
- Alt temporarily disables snapping
- Space plus drag pans the view
- Mouse wheel zooms around the cursor

### Keyboard
- Delete or Backspace deletes selected points
- Ctrl Z undo
- Ctrl Y redo
- Ctrl A selects all points in the active shape
- Ctrl Shift A selects all points in all visible unlocked shapes
- Tab switches shape, Shift Tab goes backwards

## Export formats

### JSON
- coord includes originPxX, originPxY, pixelsPerUnit, yMode
- export includes mode and decimals
- shapes includes id, name, closed, points

### CSV
- Default is the active shape
- Row format is x,y

## Development rules

- No regressions, existing interactions must not disappear
- Add features without changing existing workflows
- Keep view transforms separate from coordinate transforms
- Make snap decisions in screen pixels for consistent feel across zoom levels

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
