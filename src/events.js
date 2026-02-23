import { dom, updateUI } from './dom.js';
import { getState, recordHistory, saveState, getActiveShape, addNewPolygon } from './state.js';
import { getMousePos, screenToImagePx, imageToWorld, findPointAt, getImageCorners, calculatePolygonCentroid, formatNumber, computeAdvancedSnap, imagePxToScreen } from './utils.js';

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
            handleFit(dom.canvas);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFit(canvas) {
    const state = getState();
    if (!state.image) return;
    const rect = canvas.getBoundingClientRect();
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
    handleFit(dom.canvas);
}

export function initEventListeners() {
    const state = getState();

    dom.loadImageBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => e.target.files.length && handleImageLoad(e.target.files[0]));

    dom.fitBtn.addEventListener('click', () => handleFit(dom.canvas));
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
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.imageTransform.scale = value;
            draw();
        }
    });

    dom.imageRotationInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.imageTransform.rotation = value;
            draw();
        }
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
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.worldTransform.originPxX = value;
            draw();
        }
    });

    dom.originYInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.worldTransform.originPxY = value;
            draw();
        }
    });

    dom.scaleInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
            state.worldTransform.pixelsPerUnit = value;
            draw();
        }
    });

    dom.yModeMathRadio.addEventListener('change', () => {
        if (dom.yModeMathRadio.checked) {
            state.worldTransform.yMode = 'math';
            updateUI();
            draw();
        }
    });

    dom.yModeGpuRadio.addEventListener('change', () => {
        if (dom.yModeGpuRadio.checked) {
            state.worldTransform.yMode = 'gpu';
            updateUI();
            draw();
        }
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

    dom.snapEnabledCheckbox.addEventListener('change', (e) => {
        state.snapSettings.enabled = e.target.checked;
        draw();
    });
    dom.snapVertexCheckbox.addEventListener('change', (e) => {
        state.snapSettings.vertex = e.target.checked;
        draw();
    });
    dom.snapEdgeCheckbox.addEventListener('change', (e) => {
        state.snapSettings.edge = e.target.checked;
        draw();
    });
    dom.snapAxisCheckbox.addEventListener('change', (e) => {
        state.snapSettings.axis = e.target.checked;
    });
    dom.snapInInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            state.snapSettings.snapInPx = value;
        }
    });
    dom.snapOutInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            state.snapSettings.snapOutPx = value;
        }
    });

    const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(err => {
                fallbackCopyText(text);
            });
        } else {
            fallbackCopyText(text);
        }
    };

    const fallbackCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure it's not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    };

    dom.copyJsonBtn.addEventListener('click', () => {
        const state = getState();
        const { originPxX, originPxY, pixelsPerUnit, yMode } = state.worldTransform;
        const { decimals, mode } = state.export;
        
        const data = {
            coord: {
                originPxX,
                originPxY,
                pixelsPerUnit,
                yMode,
                unitLabel: "unit"
            },
            export: {
                mode,
                decimals
            },
            shapes: state.shapes.map(shape => {
                const worldPointsAbs = shape.points.map(p => imageToWorld(p.x, p.y));
                let offset = { x: 0, y: 0 };

                if (mode === 'centered') {
                    if (shape.closed && shape.points.length > 2) {
                         const centerPx = calculatePolygonCentroid(shape.points);
                         offset = imageToWorld(centerPx.x, centerPx.y);
                    } else if (shape.points.length > 0) {
                        // Bbox center
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        worldPointsAbs.forEach(p => {
                            minX = Math.min(minX, p.x);
                            minY = Math.min(minY, p.y);
                            maxX = Math.max(maxX, p.x);
                            maxY = Math.max(maxY, p.y);
                        });
                        offset = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
                    }
                } else if (mode === '0 centered' && worldPointsAbs.length > 0) {
                    offset = { ...worldPointsAbs[0] };
                }

                const points = worldPointsAbs.map(p => ({
                    x: formatNumber(p.x - offset.x, decimals),
                    y: formatNumber(p.y - offset.y, decimals)
                }));

                return {
                    id: shape.id,
                    name: shape.name,
                    closed: shape.closed,
                    points: points
                };
            })
        };
        
        copyToClipboard(JSON.stringify(data, null, 2));
    });

    dom.copyCsvBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if(activeShape) {
            const state = getState();
            const { decimals, mode } = state.export;
            
            const worldPointsAbs = activeShape.points.map(p => imageToWorld(p.x, p.y));
            let offset = { x: 0, y: 0 };

            if (mode === 'centered') {
                if (activeShape.closed && activeShape.points.length > 2) {
                     const centerPx = calculatePolygonCentroid(activeShape.points);
                     offset = imageToWorld(centerPx.x, centerPx.y);
                } else if (activeShape.points.length > 0) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    worldPointsAbs.forEach(p => {
                        minX = Math.min(minX, p.x);
                        minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x);
                        maxY = Math.max(maxY, p.y);
                    });
                    offset = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
                }
            } else if (mode === '0 centered' && worldPointsAbs.length > 0) {
                offset = { ...worldPointsAbs[0] };
            }

            const csv = worldPointsAbs.map(p => {
                const x = formatNumber(p.x - offset.x, decimals);
                const y = formatNumber(p.y - offset.y, decimals);
                return `${x},${y}`;
            }).join('\n');
            copyToClipboard(csv);
        }
    });

    // Export Controls Listeners
    if (dom.exportModeSelect) {
        dom.exportModeSelect.addEventListener('change', (e) => {
            const state = getState();
            state.export.mode = e.target.value;
        });
    }

    if (dom.exportDecimalsInput) {
        dom.exportDecimalsInput.addEventListener('change', (e) => {
            const state = getState();
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = 2;
            if (val < 0) val = 0;
            if (val > 6) val = 6;
            state.export.decimals = val;
            e.target.value = val;
        });
    }

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

    dom.centerOriginBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked && activeShape.points.length > 0) {
            recordHistory();
            const center = calculatePolygonCentroid(activeShape.points);
            const { originPxX, originPxY } = state.worldTransform;
            const dx = originPxX - center.x;
            const dy = originPxY - center.y;
            activeShape.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
            updateUI();
            draw();
        }
    });

    dom.canvas.addEventListener('mousedown', (e) => {
        dom.canvas.focus();
        const mouseS = getMousePos(e, dom.canvas);
        const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
        const { originPxX, originPxY } = state.worldTransform;
        const originS = imagePxToScreen(originPxX, originPxY);
        state.originDragOffsetS = { x: mouseS.x - originS.x, y: mouseS.y - originS.y };



        if (e.button === 1 || state.isSpaceDown) {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.button === 0) {
            // Ctrl-Drag Polygon Logic
            if (e.ctrlKey || e.metaKey) {
                const activeShape = getActiveShape();
                if (activeShape && !activeShape.locked && activeShape.points.length > 0) {
                    state.isDraggingPolygon = true;
                    state.isPolygonMoved = false;
                    state.polygonDragStartPos = { ...mouseImgPos };
                    state.initialPolygonPoints = activeShape.points.map(p => ({ ...p }));
                    dom.canvas.style.cursor = 'move';
                    return;
                }
            }

            if (state.editImageMode && state.image) {
                // ... existing image drag logic ...
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
                    let newPoint = mouseImgPos;
                    if (state.snapPreview && state.snapPreview.active) {
                        newPoint = state.snapPreview.snappedPx;
                    }
                    activeShape.points.push(newPoint);
                    state.selectedPoint = { shapeId: activeShape.id, pointIndex: activeShape.points.length - 1 };
                }
            }
            updateUI();
            draw();
        }
    });

    dom.canvas.addEventListener('mousemove', (e) => {
        const mouseS = getMousePos(e, dom.canvas);
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

        if (state.isDraggingPolygon) {
            const currentMouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
            const dx = currentMouseImgPos.x - state.polygonDragStartPos.x;
            const dy = currentMouseImgPos.y - state.polygonDragStartPos.y;
            
            const activeShape = getActiveShape();
            if (activeShape) {
                if (!state.isPolygonMoved) {
                    recordHistory();
                    state.isPolygonMoved = true;
                }
                
                activeShape.points = state.initialPolygonPoints.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy
                }));
                
                dom.mouseCoordsStatus.textContent = `Polygon Move (Ctrl) | Px: [${Math.round(currentMouseImgPos.x)}, ${Math.round(currentMouseImgPos.y)}]`;
                updateUI();
                draw();
            }
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

            // The new snap logic handles axis snapping, but dragging the origin itself is a separate concept.
            // Let's adjust it to use the new snap system for its snapping.
            const snapResult = computeAdvancedSnap(rawOriginPx, null, null, state);
            const newOrigin = snapResult.active ? snapResult.snappedPx : rawOriginPx;

            state.worldTransform.originPxX = newOrigin.x;
            state.worldTransform.originPxY = newOrigin.y;
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
                
                // Advanced Snap
                const snapResult = (state.isAltDown) ? { active: false } : computeAdvancedSnap(rawPointPx, shape.id, state.draggedPoint.pointIndex, state);
                state.snapState = snapResult;
                const newPos = snapResult.active ? snapResult.snappedPx : rawPointPx;

                shape.points[state.draggedPoint.pointIndex] = newPos;
                updateUI();
            }
        } else {
            const imagePos = screenToImagePx(mouseS.x, mouseS.y);
            state.hoveredPoint = findPointAt(imagePos.x, imagePos.y);
            
            // Placement Preview
            const activeShape = getActiveShape();
            if (activeShape && !activeShape.locked && !state.hoveredPoint) {
                 const snapResult = (state.isAltDown) ? { active: false } : computeAdvancedSnap(imagePos, activeShape.id, null, state);
                 state.snapPreview = snapResult;
            } else {
                state.snapPreview = { active: false };
            }
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
        if (state.isDraggingPolygon) {
            state.isDraggingPolygon = false;
            state.isPolygonMoved = false;
            state.initialPolygonPoints = null;
            state.polygonDragStartPos = null;
            dom.canvas.style.cursor = 'crosshair';
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
        if (e.key === 'Alt') {
            state.isAltDown = true;
            draw();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (document.activeElement !== dom.canvas) return;
        
        if (e.key === ' ') {
            state.isSpaceDown = false;
            dom.canvas.style.cursor = 'crosshair';
        }
        if (e.key === 'Alt') {
            state.isAltDown = false;
            draw();
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
