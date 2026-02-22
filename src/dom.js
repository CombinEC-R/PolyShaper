import { getState, getActiveShape } from './state.js';
import { imageToWorld } from './utils.js';

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
    closePolygonCheckbox: document.getElementById('close-polygon-checkbox'),
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
    addPolygonBtn: document.getElementById('add-polygon-btn'),
    polygonList: document.getElementById('polygon-list'),
};

function updatePolygonListUI() {
    const state = getState();
    dom.polygonList.innerHTML = '';
    state.shapes.forEach(shape => {
        const item = document.createElement('div');
        item.className = 'polygon-list-item';
        item.style.cssText = `
            display: flex; 
            align-items: center; 
            padding: 0.25rem; 
            border-radius: 3px; 
            cursor: pointer; 
            background-color: ${shape.id === state.activeShapeId ? 'var(--accent-color)' : 'transparent'}; 
            margin-bottom: 2px;`;
        item.dataset.id = shape.id;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = shape.name;
        nameInput.style.cssText = 'flex-grow: 1; background: none; border: none; color: white;';
        nameInput.addEventListener('change', (e) => {
            shape.name = e.target.value;
            // recordHistory(); This should be handled in an event handler in events.js
        });
        
        const eyeBtn = document.createElement('button');
        eyeBtn.innerHTML = shape.visible ? '👁️' : '🙈';
        eyeBtn.style.cssText = 'padding: 2px 5px; background: none; border: none; cursor: pointer;';
        eyeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shape.visible = !shape.visible;
            updateUI();
        });

        const lockBtn = document.createElement('button');
        lockBtn.innerHTML = shape.locked ? '🔒' : '🔓';
        lockBtn.style.cssText = 'padding: 2px 5px; background: none; border: none; cursor: pointer;';
        lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shape.locked = !shape.locked;
            updateUI();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.style.cssText = 'padding: 2px 5px; background: none; border: none; cursor: pointer;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${shape.name}"?`)) {
                state.shapes = state.shapes.filter(s => s.id !== shape.id);
                if (state.activeShapeId === shape.id) {
                    state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                }
                // recordHistory();
                updateUI();
            }
        });

        item.appendChild(nameInput);
        item.appendChild(eyeBtn);
        item.appendChild(lockBtn);
        item.appendChild(deleteBtn);
        dom.polygonList.appendChild(item);

        item.addEventListener('click', () => {
            state.activeShapeId = shape.id;
            updateUI();
        });
    });
}

export function updateUI() {
    const state = getState();
    updatePolygonListUI();

    dom.pointsTbody.innerHTML = '';
    const activeShape = getActiveShape();
    if (activeShape) {
        activeShape.points.forEach((p, i) => {
            const worldCoords = imageToWorld(p.x, p.y);
            const row = dom.pointsTbody.insertRow();
            row.innerHTML = `<td>${i}</td><td>(${p.x.toFixed(1)}, ${p.y.toFixed(1)})</td><td>(${worldCoords.x.toFixed(3)}, ${worldCoords.y.toFixed(3)})</td>`;
        });
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
