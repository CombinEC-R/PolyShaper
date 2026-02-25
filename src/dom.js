import { getState, getActiveShape, recordHistory, deleteSnapshot, loadProjectJson } from './state.js';
import { imageToWorld, calculatePolygonArea, calculatePolygonPerimeter } from './utils.js';
import { draw } from './canvas.js';

export const dom = {};

let renameState = { active: false, shapeId: null };

export function initDom() {
    dom.canvas = document.getElementById('canvas');
    dom.ctx = document.getElementById('canvas').getContext('2d');
    dom.canvasWrapper = document.querySelector('.canvas-wrapper');
    dom.loadImageBtn = document.getElementById('load-image-btn');
    dom.fileInput = document.getElementById('file-input');
    dom.fitBtn = document.getElementById('fit-btn');
    dom.resetBtn = document.getElementById('reset-btn');
    dom.zoomSlider = document.getElementById('zoom-slider');
    dom.zoomInBtn = document.getElementById('zoom-in-btn');
    dom.zoomOutBtn = document.getElementById('zoom-out-btn');
    dom.zoom25Btn = document.getElementById('zoom-25-btn');
    dom.zoom50Btn = document.getElementById('zoom-50-btn');
    dom.zoom100Btn = document.getElementById('zoom-100-btn');
    dom.zoom200Btn = document.getElementById('zoom-200-btn');
    dom.zoom400Btn = document.getElementById('zoom-400-btn');
    dom.undoBtn = document.getElementById('undo-btn');
    dom.redoBtn = document.getElementById('redo-btn');
    dom.editImageModeCheckbox = document.getElementById('edit-image-mode-checkbox');
    dom.imageScaleInput = document.getElementById('image-scale-input');
    dom.imageRotationInput = document.getElementById('image-rotation-input');
    dom.flipXBtn = document.getElementById('flip-x-btn');
    dom.flipYBtn = document.getElementById('flip-y-btn');
    dom.originXInput = document.getElementById('origin-x-input');
    dom.originYInput = document.getElementById('origin-y-input');
    dom.setOriginBtn = document.getElementById('set-origin-btn');
    dom.resetOriginBtn = document.getElementById('reset-origin-btn');
    dom.centerViewOriginBtn = document.getElementById('center-view-origin-btn');
    dom.scaleInput = document.getElementById('scale-input');
    dom.showLabelsCheckbox = document.getElementById('show-labels-checkbox');
    dom.showMinimapCheckbox = document.getElementById('show-minimap-checkbox');
    dom.minimapCanvas = document.getElementById('minimap');
    dom.snapEnabledCheckbox = document.getElementById('snap-enabled-checkbox');
    dom.snapVertexCheckbox = document.getElementById('snap-vertex-checkbox');
    dom.snapEdgeCheckbox = document.getElementById('snap-edge-checkbox');
    dom.snapAxisCheckbox = document.getElementById('snap-axis-checkbox');
    dom.snapInInput = document.getElementById('snap-in-input');
    dom.snapOutInput = document.getElementById('snap-out-input');
    dom.pointEditor = document.getElementById('point-editor');
    dom.pointPxX = document.getElementById('point-px-x');
    dom.pointPxY = document.getElementById('point-px-y');
    dom.pointWorldX = document.getElementById('point-world-x');
    dom.pointWorldY = document.getElementById('point-world-y');

    dom.transformPanel = document.getElementById('transform-panel');
    dom.pivotCentroid = document.getElementById('pivot-centroid');
    dom.pivotOrigin = document.getElementById('pivot-origin');
    dom.transformScaleSlider = document.getElementById('transform-scale-slider');
    dom.transformScaleVal = document.getElementById('transform-scale-val');
    dom.transformScaleReset = document.getElementById('transform-scale-reset');
    dom.transformRotateSlider = document.getElementById('transform-rotate-slider');
    dom.transformRotateVal = document.getElementById('transform-rotate-val');
    dom.transformRotateReset = document.getElementById('transform-rotate-reset');
    dom.btnMirrorX = document.getElementById('btn-mirror-x');
    dom.btnMirrorY = document.getElementById('btn-mirror-y');
    dom.btnTransformApply = document.getElementById('btn-transform-apply');
    dom.btnTransformCancel = document.getElementById('btn-transform-cancel');

    dom.snapshotNameInput = document.getElementById('snapshot-name-input');
    dom.saveSnapshotBtn = document.getElementById('save-snapshot-btn');
    dom.snapshotsList = document.getElementById('snapshots-list');

    dom.pointsTbody = document.getElementById('points-tbody');
    dom.copyJsonBtn = document.getElementById('copy-json-btn');
    dom.copyCsvBtn = document.getElementById('copy-csv-btn');
    dom.downloadJsonBtn = document.getElementById('download-json-btn');
    dom.downloadCsvBtn = document.getElementById('download-csv-btn');
    dom.downloadCocoBtn = document.getElementById('download-coco-btn');
    dom.downloadSvgBtn = document.getElementById('download-svg-btn');
    dom.downloadPngBtn = document.getElementById('download-png-btn');
    dom.importJsonInput = document.getElementById('import-json-input');
    dom.exportViewStateCheckbox = document.getElementById('export-view-state-checkbox');
    dom.exportModeSelect = document.getElementById('export-mode-select');
    dom.exportDecimalsInput = document.getElementById('export-decimals-input');

    dom.slot1Name = document.getElementById('slot-1-name');
    dom.slot1Save = document.getElementById('slot-1-save');
    dom.slot1Load = document.getElementById('slot-1-load');
    dom.slot2Name = document.getElementById('slot-2-name');
    dom.slot2Save = document.getElementById('slot-2-save');
    dom.slot2Load = document.getElementById('slot-2-load');
    dom.slot3Name = document.getElementById('slot-3-name');
    dom.slot3Save = document.getElementById('slot-3-save');
    dom.slot3Load = document.getElementById('slot-3-load');

    dom.measureNoneRadio = document.getElementById('measure-none');
    dom.measureDistRadio = document.getElementById('measure-dist');
    dom.measureAngleRadio = document.getElementById('measure-angle');
    dom.clearMeasurementsBtn = document.getElementById('clear-measurements-btn');
    dom.statPerimeter = document.getElementById('stat-perimeter');
    dom.statArea = document.getElementById('stat-area');

    dom.mouseCoordsStatus = document.getElementById('mouse-coords');
    dom.selectionStatus = document.getElementById('selection-status');
    dom.zoomStatus = document.getElementById('zoom-status');
    dom.yModeStatus = document.getElementById('y-mode-status');
    dom.yModeMathRadio = document.getElementById('y-mode-math');
    dom.yModeGpuRadio = document.getElementById('y-mode-gpu');
    dom.helpBtn = document.getElementById('help-btn');
    dom.helpOverlay = document.getElementById('help-overlay');
    dom.closeHelpBtn = document.getElementById('close-help-btn');
    
    dom.addShapeBtn = document.getElementById('add-shape-btn');
    dom.duplicateShapeBtn = document.getElementById('duplicate-shape-btn');
    dom.deleteShapeBtn = document.getElementById('delete-shape-btn');
    dom.clearPointsBtn = document.getElementById('clear-points-btn');
    dom.shapesList = document.getElementById('shapes-list');
    dom.shapeClosedCheckbox = document.getElementById('shape-closed-checkbox');
    dom.shapeColorInput = document.getElementById('shape-color-input');
    dom.shapeOpacityInput = document.getElementById('shape-opacity-input');
    dom.shapeSearchInput = document.getElementById('shape-search-input');
    dom.shapeContextMenu = document.getElementById('shape-context-menu');
    dom.centerOriginBtn = document.getElementById('center-origin-btn');
}

let draggedItem = null;

function updateShapesListUI() {
    const state = getState();
    dom.shapesList.innerHTML = '';
    
    const filter = dom.shapeSearchInput ? dom.shapeSearchInput.value.toLowerCase() : '';

    state.shapes.forEach((shape, index) => {
        if (filter && !shape.name.toLowerCase().includes(filter)) return;

        const item = document.createElement('div');
        item.className = 'shape-list-item';
        item.draggable = true; // Enable Drag and Drop
        const isActive = shape.id === state.activeShapeId;
        
        // Drag Events
        item.addEventListener('dragstart', (e) => {
            draggedItem = index;
            e.dataTransfer.effectAllowed = 'move';
            item.style.opacity = '0.5';
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            item.style.borderTop = '2px solid var(--accent-color)';
        });

        item.addEventListener('dragleave', () => {
             item.style.borderTop = 'none';
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.style.borderTop = 'none';
            if (draggedItem !== null && draggedItem !== index) {
                // Reorder in state
                const itemToMove = state.shapes[draggedItem];
                state.shapes.splice(draggedItem, 1);
                state.shapes.splice(index, 0, itemToMove);
                recordHistory();
                updateUI();
                draw();
            }
            draggedItem = null;
        });
        
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
            draggedItem = null;
            // Cleanup borders if any
            Array.from(dom.shapesList.children).forEach(child => child.style.borderTop = 'none');
        });

        item.style.cssText = `
            display: flex; 
            align-items: center; 
            padding: 4px; 
            border-radius: 3px; 
            cursor: pointer; 
            background-color: ${isActive ? 'var(--accent-color)' : 'transparent'}; 
            border-bottom: 1px solid var(--border-color);
            color: ${isActive ? '#fff' : 'var(--text-primary)'};
            user-select: none;
        `;
        item.dataset.id = shape.id;
        item.dataset.index = index;

        // Context Menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Position context menu
            dom.shapeContextMenu.style.display = 'block';
            dom.shapeContextMenu.style.left = `${e.clientX}px`;
            dom.shapeContextMenu.style.top = `${e.clientY}px`;
            
            // Store target shape id on the menu for event handler
            dom.shapeContextMenu.dataset.targetId = shape.id;
            dom.shapeContextMenu.dataset.targetIndex = index;
        });

        // Color Picker (Mini)
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = shape.color;
        colorInput.style.cssText = `
            width: 16px; height: 16px; 
            border: none; padding: 0; 
            margin-right: 8px; 
            cursor: pointer; 
            background: none;
        `;
        colorInput.addEventListener('input', (e) => {
            shape.color = e.target.value;
            draw();
        });
        colorInput.addEventListener('change', () => recordHistory());
        colorInput.addEventListener('click', e => e.stopPropagation());
        item.appendChild(colorInput);

        // Name or Input
        if (renameState.active && renameState.shapeId === shape.id) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = shape.name;
            input.style.cssText = 'flex-grow: 1; width: 100px; background: var(--bg-tertiary); color: white; border: 1px solid var(--accent-color); padding: 2px;';
            
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('dblclick', (e) => e.stopPropagation());
            input.addEventListener('mousedown', (e) => e.stopPropagation());

            let isDone = false;
            const commit = () => {
                if (isDone) return;
                isDone = true;
                const newName = input.value.trim();
                if (newName && newName !== shape.name) {
                    recordHistory();
                    shape.name = newName;
                }
                renameState = { active: false, shapeId: null };
                updateUI();
            };

            const cancel = () => {
                if (isDone) return;
                isDone = true;
                renameState = { active: false, shapeId: null };
                updateUI();
            };

            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') commit();
                else if (e.key === 'Escape') cancel();
            });

            item.appendChild(input);
            requestAnimationFrame(() => { input.focus(); input.select(); });

        } else {
            const nameContainer = document.createElement('div');
            nameContainer.style.cssText = 'flex-grow: 1; display: flex; flex-direction: column; overflow: hidden;';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = shape.name;
            nameSpan.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;';
            
            const statsSpan = document.createElement('span');
            const area = shape.points.length > 2 ? (calculatePolygonArea(shape.points) / (state.worldTransform.pixelsPerUnit**2)).toFixed(1) : 0;
            statsSpan.textContent = `${shape.points.length} pts | ${area} u²`;
            statsSpan.style.cssText = 'font-size: 0.75em; opacity: 0.7;';
            
            nameContainer.appendChild(nameSpan);
            nameContainer.appendChild(statsSpan);
            
            nameContainer.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                renameState = { active: true, shapeId: shape.id };
                updateUI();
            });
            item.appendChild(nameContainer);
        }

        // Controls Container
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '2px';

        // Visible Toggle
        const eyeBtn = document.createElement('button');
        eyeBtn.innerHTML = shape.visible ? '👁️' : '🙈';
        eyeBtn.title = 'Toggle Visibility (Alt+Click for Solo)';
        eyeBtn.style.cssText = 'padding: 2px; background: none; border: none; cursor: pointer; font-size: 1em; color: inherit;';
        eyeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.altKey) {
                const otherShapes = state.shapes.filter(s => s.id !== shape.id);
                const allOthersHidden = otherShapes.every(s => !s.visible);
                if (allOthersHidden && shape.visible) {
                    state.shapes.forEach(s => s.visible = true);
                } else {
                    state.shapes.forEach(s => s.visible = (s.id === shape.id));
                }
            } else {
                shape.visible = !shape.visible;
            }
            updateUI();
            draw();
        });
        controls.appendChild(eyeBtn);

        // Lock Toggle
        const lockBtn = document.createElement('button');
        lockBtn.innerHTML = shape.locked ? '🔒' : '🔓';
        lockBtn.title = 'Toggle Lock';
        lockBtn.style.cssText = 'padding: 2px; background: none; border: none; cursor: pointer; font-size: 1em; color: inherit;';
        lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shape.locked = !shape.locked;
            updateUI();
            draw();
        });
        controls.appendChild(lockBtn);

        item.appendChild(controls);

        // Click to select
        item.addEventListener('click', (e) => {
            const target = e.target.nodeType === 3 ? e.target.parentElement : e.target;
            if (target.closest('button') || target.tagName === 'INPUT') return;
            state.activeShapeId = shape.id;
            updateUI();
            draw();
        });

        dom.shapesList.appendChild(item);
    });
}

export function setRenameActive(shapeId) {
    renameState = { active: true, shapeId };
    updateUI();
}

export function updateUI() {
    const state = getState();
    updateShapesListUI();

    dom.pointsTbody.innerHTML = '';
    const activeShape = getActiveShape();
    
    // Point Editor
    if (dom.pointEditor) {
        if (state.selectedPoints && state.selectedPoints.length === 1) {
            dom.pointEditor.style.display = 'block';
            const sp = state.selectedPoints[0];
            const shape = state.shapes.find(s => s.id === sp.shapeId);
            if (shape) {
                const p = shape.points[sp.pointIndex];
                const worldP = imageToWorld(p.x, p.y);
                
                if (document.activeElement !== dom.pointPxX) dom.pointPxX.value = Math.round(p.x);
                if (document.activeElement !== dom.pointPxY) dom.pointPxY.value = Math.round(p.y);
                if (document.activeElement !== dom.pointWorldX) dom.pointWorldX.value = worldP.x.toFixed(3);
                if (document.activeElement !== dom.pointWorldY) dom.pointWorldY.value = worldP.y.toFixed(3);
            }
        } else {
            dom.pointEditor.style.display = 'none';
        }
    }

    // Transform Panel
    if (dom.transformPanel) {
        if (state.selectedPoints && state.selectedPoints.length > 0) {
            dom.transformPanel.style.display = 'block';
        } else {
            dom.transformPanel.style.display = 'none';
        }
    }

    // Update Active Shape Controls
    if (activeShape) {
        dom.shapeClosedCheckbox.checked = activeShape.closed;
        dom.shapeClosedCheckbox.disabled = activeShape.locked;
        
        dom.shapeColorInput.value = activeShape.color;
        dom.shapeColorInput.disabled = activeShape.locked;
        
        dom.shapeOpacityInput.value = activeShape.opacity;
        dom.shapeOpacityInput.disabled = activeShape.locked;
        dom.centerOriginBtn.disabled = activeShape.locked || activeShape.points.length === 0;

        dom.deleteShapeBtn.disabled = false;
        dom.duplicateShapeBtn.disabled = false;
        dom.clearPointsBtn.disabled = activeShape.locked || activeShape.points.length === 0;

        activeShape.points.forEach((p, i) => {
            const worldCoords = imageToWorld(p.x, p.y);
            const row = dom.pointsTbody.insertRow();
            row.innerHTML = `<td>${i}</td><td>(${p.x.toFixed(1)}, ${p.y.toFixed(1)})</td><td>(${worldCoords.x.toFixed(3)}, ${worldCoords.y.toFixed(3)})</td>`;
        });

        // Update Stats
        if (activeShape.points.length > 1) {
            const perimeterPx = calculatePolygonPerimeter(activeShape.points, activeShape.closed);
            const perimeterWorld = perimeterPx / state.worldTransform.pixelsPerUnit;
            if (dom.statPerimeter) dom.statPerimeter.textContent = `${perimeterWorld.toFixed(2)} u`;
            
            if (activeShape.points.length > 2) {
                const areaPx = calculatePolygonArea(activeShape.points);
                const areaWorld = areaPx / (state.worldTransform.pixelsPerUnit * state.worldTransform.pixelsPerUnit);
                if (dom.statArea) dom.statArea.textContent = `${areaWorld.toFixed(2)} u²`;
            } else {
                if (dom.statArea) dom.statArea.textContent = '-';
            }
        } else {
            if (dom.statPerimeter) dom.statPerimeter.textContent = '-';
            if (dom.statArea) dom.statArea.textContent = '-';
        }
    } else {
        dom.shapeClosedCheckbox.disabled = true;
        dom.shapeColorInput.disabled = true;
        dom.shapeOpacityInput.disabled = true;
        dom.centerOriginBtn.disabled = true;
        dom.deleteShapeBtn.disabled = true;
        dom.duplicateShapeBtn.disabled = true;
        dom.clearPointsBtn.disabled = true;
        if (dom.statPerimeter) dom.statPerimeter.textContent = '-';
        if (dom.statArea) dom.statArea.textContent = '-';
    }

    dom.zoomSlider.value = state.viewTransform.scale;
    dom.zoomStatus.textContent = `Zoom: ${(state.viewTransform.scale * 100).toFixed(0)}%`;
    dom.yModeStatus.textContent = `Y-Mode: ${state.worldTransform.yMode === 'math' ? 'Math' : 'GPU'}`;
    if (state.worldTransform.yMode === 'math') {
        dom.yModeMathRadio.checked = true;
    } else {
        dom.yModeGpuRadio.checked = true;
    }
    dom.editImageModeCheckbox.checked = state.editImageMode;
    dom.imageScaleInput.value = state.imageTransform.scale;
    dom.imageRotationInput.value = state.imageTransform.rotation;
    dom.originXInput.value = state.worldTransform.originPxX.toFixed(2);
    dom.originYInput.value = state.worldTransform.originPxY.toFixed(2);
    dom.scaleInput.value = state.worldTransform.pixelsPerUnit;
    dom.undoBtn.disabled = state.history.length === 0;
    dom.redoBtn.disabled = state.redoStack.length === 0;

    if (dom.selectionStatus) {
        const selCount = state.selectedPoints ? state.selectedPoints.length : 0;
        const shapeName = activeShape ? activeShape.name : '-';
        dom.selectionStatus.textContent = `Sel: ${selCount} | Shape: ${shapeName}`;
    }

    if (dom.showMinimapCheckbox) {
        dom.showMinimapCheckbox.checked = state.showMinimap;
        dom.minimapCanvas.style.display = state.showMinimap ? 'block' : 'none';
    }

    dom.snapEnabledCheckbox.checked = state.snapSettings.enabled;
    dom.snapVertexCheckbox.checked = state.snapSettings.vertex;
    dom.snapEdgeCheckbox.checked = state.snapSettings.edge;
    dom.snapAxisCheckbox.checked = state.snapSettings.axis;
    dom.snapInInput.value = state.snapSettings.snapInPx;
    dom.snapOutInput.value = state.snapSettings.snapOutPx;

    // Update Snapshots List
    if (dom.snapshotsList) {
        dom.snapshotsList.innerHTML = '';
        state.snapshots.forEach(snap => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 4px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem;';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = snap.name;
            nameSpan.title = new Date(snap.timestamp).toLocaleString();
            nameSpan.style.flexGrow = '1';
            nameSpan.style.cursor = 'pointer';
            nameSpan.onclick = () => {
                if (confirm(`Load snapshot "${snap.name}"? Unsaved changes will be lost.`)) {
                    recordHistory();
                    loadProjectJson(snap.data);
                    updateUI();
                    draw();
                }
            };
            
            const controls = document.createElement('div');
            controls.style.display = 'flex';
            controls.style.gap = '4px';

            // Compare Toggle
            const compareBtn = document.createElement('button');
            const isComparing = state.compareMode && state.compareSnapshot && state.compareSnapshot.id === snap.id;
            compareBtn.textContent = isComparing ? '👁️' : '👁️‍🗨️';
            compareBtn.title = isComparing ? 'Stop Comparing' : 'Compare with Current';
            compareBtn.style.padding = '2px 4px';
            compareBtn.onclick = (e) => {
                e.stopPropagation();
                if (isComparing) {
                    state.compareMode = false;
                    state.compareSnapshot = null;
                } else {
                    state.compareMode = true;
                    state.compareSnapshot = snap;
                }
                updateUI();
                draw();
            };

            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️';
            delBtn.title = 'Delete Snapshot';
            delBtn.style.padding = '2px 4px';
            delBtn.style.color = '#ff6b6b';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete snapshot "${snap.name}"?`)) {
                    deleteSnapshot(snap.id);
                    updateUI();
                }
            };

            controls.appendChild(compareBtn);
            controls.appendChild(delBtn);
            div.appendChild(nameSpan);
            div.appendChild(controls);
            dom.snapshotsList.appendChild(div);
        });
    }

    if (dom.exportDecimalsInput) {
        dom.exportDecimalsInput.value = state.export.decimals;
    }
    dom.exportModeSelect.value = state.export.mode;
}
