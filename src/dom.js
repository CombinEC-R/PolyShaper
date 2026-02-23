import { getState, getActiveShape, recordHistory } from './state.js';
import { imageToWorld } from './utils.js';
import { draw } from './canvas.js';

export const dom = {
    canvas: document.getElementById('canvas'),
    ctx: document.getElementById('canvas').getContext('2d'),
    canvasWrapper: document.querySelector('.canvas-wrapper'),
    loadImageBtn: document.getElementById('load-image-btn'),
    fileInput: document.getElementById('file-input'),
    fitBtn: document.getElementById('fit-btn'),
    resetBtn: document.getElementById('reset-btn'),
    zoomSlider: document.getElementById('zoom-slider'),
    zoomInBtn: document.getElementById('zoom-in-btn'),
    zoomOutBtn: document.getElementById('zoom-out-btn'),
    undoBtn: document.getElementById('undo-btn'),
    redoBtn: document.getElementById('redo-btn'),
    editImageModeCheckbox: document.getElementById('edit-image-mode-checkbox'),
    imageScaleInput: document.getElementById('image-scale-input'),
    imageRotationInput: document.getElementById('image-rotation-input'),
    flipXBtn: document.getElementById('flip-x-btn'),
    flipYBtn: document.getElementById('flip-y-btn'),
    originXInput: document.getElementById('origin-x-input'),
    originYInput: document.getElementById('origin-y-input'),
    setOriginBtn: document.getElementById('set-origin-btn'),
    resetOriginBtn: document.getElementById('reset-origin-btn'),
    scaleInput: document.getElementById('scale-input'),
    showLabelsCheckbox: document.getElementById('show-labels-checkbox'),
    snapEnableCheckbox: document.getElementById('snap-enable-checkbox'),
    snapDistSlider: document.getElementById('snap-dist-slider'),
    snapDistLabel: document.getElementById('snap-dist-label'),
    pointsTbody: document.getElementById('points-tbody'),
    copyJsonBtn: document.getElementById('copy-json-btn'),
    copyCsvBtn: document.getElementById('copy-csv-btn'),
    mouseCoordsStatus: document.getElementById('mouse-coords'),
    zoomStatus: document.getElementById('zoom-status'),
    helpBtn: document.getElementById('help-btn'),
    helpOverlay: document.getElementById('help-overlay'),
    closeHelpBtn: document.getElementById('close-help-btn'),
    
    addShapeBtn: document.getElementById('add-shape-btn'),
    duplicateShapeBtn: document.getElementById('duplicate-shape-btn'),
    deleteShapeBtn: document.getElementById('delete-shape-btn'),
    clearPointsBtn: document.getElementById('clear-points-btn'),
    shapesList: document.getElementById('shapes-list'),
    shapeClosedCheckbox: document.getElementById('shape-closed-checkbox'),
    shapeColorInput: document.getElementById('shape-color-input'),
    shapeOpacityInput: document.getElementById('shape-opacity-input'),
};

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

        // Name (editable on double click)
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${shape.name} (${shape.points.length})`;
        nameSpan.style.cssText = 'flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none;';
        nameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = shape.name;
            input.style.cssText = 'width: 100%; background: var(--bg-tertiary); color: white; border: none; padding: 2px;';
            
            const saveName = () => {
                shape.name = input.value || shape.name;
                recordHistory();
                updateUI();
            };

            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') saveName();
            });
            
            item.replaceChild(input, nameSpan);
            input.focus();
        });
        item.appendChild(nameSpan);

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
        dom.deleteShapeBtn.disabled = true;
        dom.duplicateShapeBtn.disabled = true;
        dom.clearPointsBtn.disabled = true;
    }

    dom.zoomSlider.value = state.viewTransform.scale;
    dom.zoomStatus.textContent = `Zoom: ${(state.viewTransform.scale * 100).toFixed(0)}%`;
    dom.editImageModeCheckbox.checked = state.editImageMode;
    dom.imageScaleInput.value = state.imageTransform.scale;
    dom.imageRotationInput.value = state.imageTransform.rotation;
    dom.originXInput.value = state.worldTransform.originPxX.toFixed(2);
    dom.originYInput.value = state.worldTransform.originPxY.toFixed(2);
    dom.scaleInput.value = state.worldTransform.pixelsPerUnit;
    dom.undoBtn.disabled = state.history.length === 0;
    dom.redoBtn.disabled = state.redoStack.length === 0;
}
