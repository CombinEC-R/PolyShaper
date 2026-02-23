import { dom, updateUI } from './dom.js';
import { getState, recordHistory, saveState, getActiveShape, addNewPolygon } from './state.js';
import { getMouseImagePos, findPointAt, computeAxisSnap, computePointSnap, screenToImagePx, imagePxToScreen, getMousePos, imageToWorld, getImageCorners } from './utils.js';
import { draw } from './canvas.js';

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const state = getState();
            state.image = img;
            state.worldTransform.originPxX = img.width / 2;
            state.worldTransform.originPxY = img.height / 2;
            handleFit();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFit() {
    const state = getState();
    if (!state.image) return;
    const rect = dom.canvas.getBoundingClientRect();
    const scaleX = rect.width / state.image.width;
    const scaleY = rect.height / state.image.height;
    const scale = Math.min(scaleX, scaleY) * 0.95;
    state.viewTransform = {
        scale,
        panX: (rect.width - state.image.width * scale) / 2,
        panY: (rect.height - state.image.height * scale) / 2,
    };
    updateUI();
    draw();
}

function handleReset() {
    const state = getState();
    state.viewTransform = { scale: 1, panX: 0, panY: 0 };
    handleFit();
}

export function initEventListeners() {
    const state = getState();

    dom.loadImageBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => e.target.files.length && handleImageLoad(e.target.files[0]));

    dom.fitBtn.addEventListener('click', handleFit);
    dom.resetBtn.addEventListener('click', handleReset);

    dom.zoomInBtn.addEventListener('click', () => {
        state.viewTransform.scale *= 1.2;
        updateUI();
        draw();
    });

    dom.zoomOutBtn.addEventListener('click', () => {
        state.viewTransform.scale /= 1.2;
        updateUI();
        draw();
    });

    dom.zoomSlider.addEventListener('input', (e) => {
        state.viewTransform.scale = parseFloat(e.target.value);
        updateUI();
        draw();
    });

    dom.undoBtn.addEventListener('click', () => {
        if (state.history.length > 0) {
            const currentSnapshot = {
                shapes: state.shapes,
                activeShapeId: state.activeShapeId
            };
            state.redoStack.push(JSON.stringify(currentSnapshot));
            
            const prevSnapshot = JSON.parse(state.history.pop());
            // Handle potential legacy array-only history (just in case)
            if (Array.isArray(prevSnapshot)) {
                state.shapes = prevSnapshot;
            } else {
                state.shapes = prevSnapshot.shapes;
                state.activeShapeId = prevSnapshot.activeShapeId;
            }
            
            updateUI();
            draw();
        }
    });

    dom.redoBtn.addEventListener('click', () => {
        if (state.redoStack.length > 0) {
            const currentSnapshot = {
                shapes: state.shapes,
                activeShapeId: state.activeShapeId
            };
            state.history.push(JSON.stringify(currentSnapshot));
            
            const nextSnapshot = JSON.parse(state.redoStack.pop());
            if (Array.isArray(nextSnapshot)) {
                state.shapes = nextSnapshot;
            } else {
                state.shapes = nextSnapshot.shapes;
                state.activeShapeId = nextSnapshot.activeShapeId;
            }
            
            updateUI();
            draw();
        }
    });

    dom.editImageModeCheckbox.addEventListener('change', (e) => {
        state.editImageMode = e.target.checked;
        dom.canvas.style.cursor = state.editImageMode ? 'move' : 'crosshair';
        draw();
    });

    dom.imageScaleInput.addEventListener('change', (e) => {
        state.imageTransform.scale = parseFloat(e.target.value);
        draw();
    });

    dom.imageRotationInput.addEventListener('change', (e) => {
        state.imageTransform.rotation = parseFloat(e.target.value);
        draw();
    });

    dom.flipXBtn.addEventListener('click', () => {
        state.imageTransform.flipX = !state.imageTransform.flipX;
        draw();
    });

    dom.flipYBtn.addEventListener('click', () => {
        state.imageTransform.flipY = !state.imageTransform.flipY;
        draw();
    });

    dom.originXInput.addEventListener('change', (e) => {
        state.worldTransform.originPxX = parseFloat(e.target.value);
        draw();
    });

    dom.originYInput.addEventListener('change', (e) => {
        state.worldTransform.originPxY = parseFloat(e.target.value);
        draw();
    });

    dom.scaleInput.addEventListener('change', (e) => {
        state.worldTransform.pixelsPerUnit = parseFloat(e.target.value);
        draw();
    });

    dom.setOriginBtn.addEventListener('click', () => {
        state.isSettingOrigin = true;
        dom.canvas.style.cursor = 'crosshair';
    });

    dom.resetOriginBtn.addEventListener('click', () => {
        state.worldTransform.originPxX = 0;
        state.worldTransform.originPxY = 0;
        updateUI();
        draw();
    });

    dom.showLabelsCheckbox.addEventListener('change', () => draw());

    dom.snapEnableCheckbox.addEventListener('change', () => draw());
    dom.snapDistSlider.addEventListener('input', (e) => {
        dom.snapDistLabel.textContent = e.target.value;
        draw();
    });

    dom.copyJsonBtn.addEventListener('click', () => {
        const data = {
            worldTransform: state.worldTransform,
            shapes: state.shapes.map(shape => ({
                ...shape,
                pointsPx: shape.points,
                pointsWorld: shape.points.map(p => imageToWorld(p.x, p.y))
            }))
        };
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    });

    dom.copyCsvBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if(activeShape) {
            const csv = activeShape.points.map(p => `${p.x},${p.y}`).join('\n');
            navigator.clipboard.writeText(csv);
        }
    });

    dom.helpBtn.addEventListener('click', () => dom.helpOverlay.style.display = 'flex');
    dom.closeHelpBtn.addEventListener('click', () => dom.helpOverlay.style.display = 'none');
    dom.helpOverlay.addEventListener('click', (e) => {
        if (e.target === dom.helpOverlay) {
            dom.helpOverlay.style.display = 'none';
        }
    });

    dom.addShapeBtn.addEventListener('click', () => {
        addNewPolygon();
        updateUI();
        draw();
    });

    dom.duplicateShapeBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape) {
            recordHistory();
            const newShape = JSON.parse(JSON.stringify(activeShape));
            newShape.id = Date.now() + Math.random();
            newShape.name = activeShape.name + ' (Copy)';
            state.shapes.push(newShape);
            state.activeShapeId = newShape.id;
            updateUI();
            draw();
        }
    });

    dom.deleteShapeBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape) {
            if (confirm(`Delete "${activeShape.name}"?`)) {
                recordHistory();
                state.shapes = state.shapes.filter(s => s.id !== activeShape.id);
                
                if (state.activeShapeId === activeShape.id) {
                    state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                }

                if (state.selectedPoint && state.selectedPoint.shapeId === activeShape.id) {
                    state.selectedPoint = null;
                }
                if (state.hoveredPoint && state.hoveredPoint.shapeId === activeShape.id) {
                    state.hoveredPoint = null;
                }
                
                updateUI();
                draw();
            }
        }
    });

    dom.clearPointsBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            if (confirm(`Clear all points from "${activeShape.name}"?`)) {
                recordHistory();
                activeShape.points = [];
                updateUI();
                draw();
            }
        }
    });

    dom.shapeClosedCheckbox.addEventListener('change', (e) => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            recordHistory();
            activeShape.closed = e.target.checked;
            draw();
        }
    });

    dom.shapeColorInput.addEventListener('input', (e) => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            // No history on input, only on change
            activeShape.color = e.target.value;
            draw();
        }
    });
    
    dom.shapeColorInput.addEventListener('change', () => {
        recordHistory();
    });

    dom.shapeOpacityInput.addEventListener('input', (e) => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            // No history on input, only on change
            activeShape.opacity = parseFloat(e.target.value);
            draw();
        }
    });

    dom.shapeOpacityInput.addEventListener('change', () => {
        recordHistory();
    });

    dom.shapesList.addEventListener('click', (e) => {
        // Event delegation removed, handled directly in dom.js
    });

    dom.canvas.addEventListener('mousedown', (e) => {
        dom.canvas.focus();
        const mouseS = getMousePos(e);
        const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
        const { originPxX, originPxY } = state.worldTransform;
        const originS = imagePxToScreen(originPxX, originPxY);
        state.originDragOffsetS = { x: mouseS.x - originS.x, y: mouseS.y - originS.y };

        state.axisSnapState = { centerActive: false, centerTarget: null, xActive: false, xTargetPx: null, yActive: false, yTargetPx: null };
        state.pointSnapState = { activeToX0: false, activeToY0: false };

        if (e.button === 1 || state.isSpaceDown) {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.button === 0) {
            if (state.editImageMode && state.image) {
                const corners = getImageCorners();
                const tolerance = 10 / state.viewTransform.scale;
                let clickedCorner = null;

                if (corners) {
                    for (const key of ['tl', 'tr', 'br', 'bl']) {
                        if (Math.hypot(corners[key].x - mouseImgPos.x, corners[key].y - mouseImgPos.y) < tolerance) {
                            clickedCorner = key;
                            break;
                        }
                    }
                }

                if (clickedCorner) {
                    state.isDraggingImageCorner = true;
                    state.draggedImageCorner = clickedCorner;
                    state.initialImageTransform = { ...state.imageTransform };
                    state.initialDragCenter = corners.center;
                    state.initialDragDist = Math.hypot(mouseImgPos.x - corners.center.x, mouseImgPos.y - corners.center.y);
                    state.initialDragAngle = Math.atan2(mouseImgPos.y - corners.center.y, mouseImgPos.x - corners.center.x);
                    return;
                }

                state.isDraggingImage = true;
                state.imageDragOffset = { 
                    x: mouseImgPos.x - state.imageTransform.offsetX, 
                    y: mouseImgPos.y - state.imageTransform.offsetY 
                };
                return;
            }

            const axisGrabTolerance = 10 / state.viewTransform.scale;
            if (e.shiftKey && (Math.abs(mouseImgPos.x - originPxX) < axisGrabTolerance || Math.abs(mouseImgPos.y - originPxY) < axisGrabTolerance)) {
                state.isDraggingOrigin = true;
                return;
            }
            if (state.isSettingOrigin) {
                state.worldTransform.originPxX = mouseImgPos.x;
                state.worldTransform.originPxY = mouseImgPos.y;
                state.isSettingOrigin = false;
                dom.canvas.style.cursor = 'crosshair';
                updateUI();
                return;
            }

            const foundPoint = findPointAt(mouseImgPos.x, mouseImgPos.y);
            if (foundPoint) {
                state.activeShapeId = foundPoint.shapeId;
                state.selectedPoint = foundPoint;
                state.draggedPoint = { ...foundPoint };
                state.isPointMoved = false;
            } else {
                const activeShape = getActiveShape();
                if (activeShape && !activeShape.locked) {
                    recordHistory();
                    const { snappedPx } = computePointSnap(mouseImgPos);
                    activeShape.points.push(snappedPx);
                    state.selectedPoint = { shapeId: activeShape.id, pointIndex: activeShape.points.length - 1 };
                }
            }
            updateUI();
            draw();
        }
    });

    dom.canvas.addEventListener('mousemove', (e) => {
        const mouseS = getMousePos(e);
        const imagePos = screenToImagePx(mouseS.x, mouseS.y);
        const worldPos = imageToWorld(imagePos.x, imagePos.y);
        
        dom.mouseCoordsStatus.textContent = `Px: [${Math.round(imagePos.x)}, ${Math.round(imagePos.y)}] | World: [${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}]`;
        
        if (state.isPanning) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.viewTransform.panX += dx;
            state.viewTransform.panY += dy;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            updateUI();
            draw();
            return;
        }

        if (state.isDraggingImageCorner) {
            const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
            const C = state.initialDragCenter;

            const d1 = Math.hypot(mouseImgPos.x - C.x, mouseImgPos.y - C.y);
            const a1 = Math.atan2(mouseImgPos.y - C.y, mouseImgPos.x - C.x);

            const scaleFactor = d1 / state.initialDragDist;
            const angleDiff = a1 - state.initialDragAngle;

            let newScale = state.initialImageTransform.scale * scaleFactor;
            newScale = Math.max(0.01, newScale);

            let newRotation = state.initialImageTransform.rotation + (angleDiff * 180 / Math.PI);

            state.imageTransform.scale = newScale;
            state.imageTransform.rotation = newRotation;

            state.imageTransform.offsetX = C.x - (state.image.width * newScale) / 2;
            state.imageTransform.offsetY = C.y - (state.image.height * newScale) / 2;

            updateUI();
            draw();
            return;
        }

        if (state.isDraggingImage) {
            const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
            state.imageTransform.offsetX = mouseImgPos.x - state.imageDragOffset.x;
            state.imageTransform.offsetY = mouseImgPos.y - state.imageDragOffset.y;
            updateUI();
            draw();
            return;
        }

        if (state.isDraggingOrigin) {
            const rawOriginS = { x: mouseS.x - state.originDragOffsetS.x, y: mouseS.y - state.originDragOffsetS.y };
            const rawOriginPx = screenToImagePx(rawOriginS.x, rawOriginS.y);
            const { snappedPx } = computeAxisSnap(rawOriginPx);
            state.worldTransform.originPxX = snappedPx.x;
            state.worldTransform.originPxY = snappedPx.y;
            updateUI();
            draw();
            return;
        }

        if (state.draggedPoint) {
            const shape = state.shapes.find(s => s.id === state.draggedPoint.shapeId);
            if (shape && !shape.locked) {
                if (!state.isPointMoved) {
                    recordHistory();
                    state.isPointMoved = true;
                }
                const rawPointPx = screenToImagePx(mouseS.x, mouseS.y);
                const { snappedPx } = computePointSnap(rawPointPx, shape.points[state.draggedPoint.pointIndex]);
                shape.points[state.draggedPoint.pointIndex] = snappedPx;
                updateUI();
            }
        } else {
            const imagePos = screenToImagePx(mouseS.x, mouseS.y);
            state.hoveredPoint = findPointAt(imagePos.x, imagePos.y);
            // ... other hover logic ...
        }
        draw();
    });

    dom.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (state.hoveredPoint) {
            const shape = state.shapes.find(s => s.id === state.hoveredPoint.shapeId);
            if (shape && !shape.locked) {
                recordHistory();
                shape.points.splice(state.hoveredPoint.pointIndex, 1);
                state.hoveredPoint = null;
                state.selectedPoint = null;
                updateUI();
                draw();
            }
        } else {
            const activeShape = getActiveShape();
            if (activeShape && !activeShape.locked && activeShape.points.length > 0) {
                recordHistory();
                activeShape.points.pop();
                updateUI();
                draw();
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (state.isPanning) {
            state.isPanning = false;
        }
        if (state.isDraggingOrigin) {
            state.isDraggingOrigin = false;
        }
        if (state.isDraggingImage) {
            state.isDraggingImage = false;
        }
        if (state.isDraggingImageCorner) {
            state.isDraggingImageCorner = false;
            state.draggedImageCorner = null;
        }
        if (state.draggedPoint) {
            state.draggedPoint = null;
            state.isPointMoved = false;
        }
    });

    dom.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = dom.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const mouseBeforeZoom = screenToImagePx(mouseX, mouseY);

        const scaleAmount = 1 - e.deltaY * 0.001;
        const newScale = Math.max(0.1, Math.min(20, state.viewTransform.scale * scaleAmount));

        state.viewTransform.scale = newScale;

        const mouseAfterZoom = screenToImagePx(mouseX, mouseY);

        state.viewTransform.panX += (mouseAfterZoom.x - mouseBeforeZoom.x) * newScale;
        state.viewTransform.panY += (mouseAfterZoom.y - mouseBeforeZoom.y) * newScale;

        updateUI();
        draw();
    });

    window.addEventListener('keydown', (e) => {
        if (document.activeElement !== dom.canvas) return;

        if (e.key === ' ') {
            e.preventDefault();
            state.isSpaceDown = true;
            dom.canvas.style.cursor = 'grab';
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedPoint) {
                const activeShape = getActiveShape();
                if(activeShape){
                    recordHistory();
                    activeShape.points.splice(state.selectedPoint.pointIndex, 1);
                    state.selectedPoint = null;
                    updateUI();
                    draw();
                }
            }
        }
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            dom.undoBtn.click();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            dom.redoBtn.click();
        }
        if(e.key === 'Escape'){
            state.selectedPoint = null;
            draw();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (document.activeElement !== dom.canvas) return;
        
        if (e.key === ' ') {
            state.isSpaceDown = false;
            dom.canvas.style.cursor = 'crosshair';
        }
    });

    dom.canvasWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.canvasWrapper.classList.add('drag-over');
    });

    dom.canvasWrapper.addEventListener('dragleave', () => {
        dom.canvasWrapper.classList.remove('drag-over');
    });

    dom.canvasWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.canvasWrapper.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleImageLoad(e.dataTransfer.files[0]);
        }
    });
}
