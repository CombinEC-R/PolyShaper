import { getState, getActiveShape, recordHistory } from './state.js';
import { imageToWorld } from './utils.js';
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
    dom.scaleInput = document.getElementById('scale-input');
    dom.showLabelsCheckbox = document.getElementById('show-labels-checkbox');
    dom.snapEnabledCheckbox = document.getElementById('snap-enabled-checkbox');
    dom.snapVertexCheckbox = document.getElementById('snap-vertex-checkbox');
    dom.snapEdgeCheckbox = document.getElementById('snap-edge-checkbox');
    dom.snapAxisCheckbox = document.getElementById('snap-axis-checkbox');
    dom.snapInInput = document.getElementById('snap-in-input');
    dom.snapOutInput = document.getElementById('snap-out-input');
    dom.pointsTbody = document.getElementById('points-tbody');
    dom.copyJsonBtn = document.getElementById('copy-json-btn');
    dom.copyCsvBtn = document.getElementById('copy-csv-btn');
    dom.exportModeSelect = document.getElementById('export-mode-select');
    dom.exportDecimalsInput = document.getElementById('export-decimals-input');
    dom.mouseCoordsStatus = document.getElementById('mouse-coords');
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
    dom.centerOriginBtn = document.getElementById('center-origin-btn');

    // Event Delegation for Rename
    dom.shapesList.addEventListener('dblclick', (e) => {
        const nameEl = e.target.closest('[data-action="rename"]');
        if (!nameEl) return;
        
        const shapeId = parseInt(nameEl.dataset.shapeId, 10);
        if (!isNaN(shapeId)) {
            renameState = { active: true, shapeId: shapeId };
            updateUI();
        }
    });
}

function updateShapesListUI() {
    const state = getState();
    dom.shapesList.innerHTML = '';
    state.shapes.forEach(shape => {
        const item = document.createElement('div');
        item.className = 'shape-list-item';
        const isActive = shape.id === state.activeShapeId;
        item.style.cssText = `
            display: flex; 
            align-items: center; 
            padding: 4px; 
            border-radius: 3px; 
            cursor: pointer; 
            background-color: ${isActive ? 'var(--accent-color)' : 'transparent'}; 
            border-bottom: 1px solid var(--border-color);
            color: ${isActive ? '#fff' : 'var(--text-primary)'};
        `;
        item.dataset.id = shape.id;

        // Color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.style.cssText = `
            width: 12px; height: 12px; 
            background-color: ${shape.color}; 
            border-radius: 50%; 
            margin-right: 8px;
            border: 1px solid #fff;
        `;
        item.appendChild(colorIndicator);

        // Name or Input
        if (renameState.active && renameState.shapeId === shape.id) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = shape.name;
            input.style.cssText = 'flex-grow: 1; width: 100%; background: var(--bg-tertiary); color: white; border: 1px solid var(--accent-color); padding: 2px;';
            
            // Stop propagation to prevent row selection
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('dblclick', (e) => e.stopPropagation());
            input.addEventListener('mousedown', (e) => e.stopPropagation());

            const commit = () => {
                const newName = input.value.trim();
                if (newName && newName !== shape.name) {
                    recordHistory();
                    shape.name = newName;
                }
                renameState = { active: false, shapeId: null };
                updateUI();
            };

            const cancel = () => {
                renameState = { active: false, shapeId: null };
                updateUI();
            };

            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    commit();
                } else if (e.key === 'Escape') {
                    cancel();
                }
            });

            item.appendChild(input);
            
            // Auto-focus and select all
            requestAnimationFrame(() => {
                input.focus();
                input.select();
            });

        } else {
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${shape.name} (${shape.points.length})`;
            nameSpan.style.cssText = 'flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none;';
            nameSpan.dataset.action = 'rename';
            nameSpan.dataset.shapeId = shape.id;
            item.appendChild(nameSpan);
        }

        // Visible Toggle
        const eyeBtn = document.createElement('button');
        eyeBtn.innerHTML = shape.visible ? '👁️' : '🙈';
        eyeBtn.title = 'Toggle Visibility (Alt+Click for Solo)';
        eyeBtn.style.cssText = 'padding: 2px 4px; background: none; border: none; cursor: pointer; font-size: 1.1em;';
        eyeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.altKey) {
                // Solo mode
                const otherShapes = state.shapes.filter(s => s.id !== shape.id);
                const allOthersHidden = otherShapes.every(s => !s.visible);
                
                if (allOthersHidden && shape.visible) {
                    // Restore all (simple logic: make all visible)
                    state.shapes.forEach(s => s.visible = true);
                } else {
                    // Hide others, show this
                    state.shapes.forEach(s => s.visible = (s.id === shape.id));
                }
            } else {
                shape.visible = !shape.visible;
            }
            updateUI();
            draw();
        });
        item.appendChild(eyeBtn);

        // Lock Toggle
        const lockBtn = document.createElement('button');
        lockBtn.innerHTML = shape.locked ? '🔒' : '🔓';
        lockBtn.title = 'Toggle Lock';
        lockBtn.style.cssText = 'padding: 2px 4px; background: none; border: none; cursor: pointer; font-size: 1.1em;';
        lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shape.locked = !shape.locked;
            updateUI();
            draw();
        });
        item.appendChild(lockBtn);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete Shape';
        deleteBtn.style.cssText = 'padding: 2px 4px; background: none; border: none; cursor: pointer; font-size: 1.1em;';
        deleteBtn.dataset.action = 'delete-shape';
        deleteBtn.dataset.shapeId = shape.id;
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Record history before modification
            recordHistory();

            // Use splice to mutate array in place
            const index = state.shapes.findIndex(s => s.id === shape.id);
            if (index !== -1) {
                state.shapes.splice(index, 1);
                
                // Update active shape if needed
                if (state.activeShapeId === shape.id) {
                    state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                }

                // Clear selection if needed
                if (state.selectedPoint && state.selectedPoint.shapeId === shape.id) {
                    state.selectedPoint = null;
                }
                if (state.hoveredPoint && state.hoveredPoint.shapeId === shape.id) {
                    state.hoveredPoint = null;
                }
                
                updateUI();
                draw();
            }
        });
        item.appendChild(deleteBtn);

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

export function updateUI() {
    const state = getState();
    updateShapesListUI();

    dom.pointsTbody.innerHTML = '';
    const activeShape = getActiveShape();
    
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
    } else {
        dom.shapeClosedCheckbox.disabled = true;
        dom.shapeColorInput.disabled = true;
        dom.shapeOpacityInput.disabled = true;
        dom.centerOriginBtn.disabled = true;
        dom.deleteShapeBtn.disabled = true;
        dom.duplicateShapeBtn.disabled = true;
        dom.clearPointsBtn.disabled = true;
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

    dom.snapEnabledCheckbox.checked = state.snapSettings.enabled;
    dom.snapVertexCheckbox.checked = state.snapSettings.vertex;
    dom.snapEdgeCheckbox.checked = state.snapSettings.edge;
    dom.snapAxisCheckbox.checked = state.snapSettings.axis;
    dom.snapInInput.value = state.snapSettings.snapInPx;
    dom.snapOutInput.value = state.snapSettings.snapOutPx;

    if (dom.exportDecimalsInput) {
        dom.exportDecimalsInput.value = state.export.decimals;
    }
    dom.exportModeSelect.value = state.export.mode;
}
