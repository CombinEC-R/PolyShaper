let state = {
    image: null,
    shapes: [],
    activeShapeId: null,
    selectedPoint: null, // { shapeId, pointIndex }
    hoveredPoint: null, // { shapeId, pointIndex }
    draggedPoint: null, // { shapeId, pointIndex }
    dragStartPos: null,
    snapPoint: null,
    imageTransform: {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        flipX: false,
        flipY: false,
        rotation: 0
    },
    editImageMode: false,
    isDraggingImage: false,
    isDraggingImageCorner: false,
    draggedImageCorner: null,
    initialImageTransform: null,
    initialDragCenter: null,
    initialDragDist: 0,
    initialDragAngle: 0,
    imageDragOffset: { x: 0, y: 0 },
    viewTransform: { scale: 1, panX: 0, panY: 0 },
    worldTransform: { originPxX: 0, originPxY: 0, pixelsPerUnit: 1 },
    isPanning: false,
    isSettingOrigin: false,
    isDraggingOrigin: false,
    isSpaceDown: false,
    lastMousePos: { x: 0, y: 0 },
    originDragOffsetS: { x: 0, y: 0 },
    axisSnapState: { 
        centerActive: false, 
        centerTarget: null, 
        xActive: false, 
        xTargetPx: null, 
        yActive: false, 
        yTargetPx: null 
    },
    pointSnapState: { 
        activeToX0: false, 
        activeToY0: false 
    },
    history: [],
    redoStack: [],
};

export const getState = () => state;

export const saveState = () => {
    const stateToSave = {
        shapes: state.shapes,
        activeShapeId: state.activeShapeId,
        worldTransform: state.worldTransform,
        imageTransform: state.imageTransform,
        closePolygon: document.getElementById('close-polygon-checkbox').checked,
    };
    localStorage.setItem('polygonToolState_v2', JSON.stringify(stateToSave));
};

export const loadState = () => {
    const saved = localStorage.getItem('polygonToolState_v2');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.shapes = parsed.shapes || [];
        state.activeShapeId = parsed.activeShapeId || null;
        state.worldTransform = parsed.worldTransform || { originPxX: 0, originPxY: 0, pixelsPerUnit: 1 };
        state.imageTransform = parsed.imageTransform || { offsetX: 0, offsetY: 0, scale: 1, flipX: false, flipY: false, rotation: 0 };
        document.getElementById('close-polygon-checkbox').checked = parsed.closePolygon || false;
    } else {
        const oldSaved = localStorage.getItem('polygonToolState');
        if (oldSaved) {
            const parsed = JSON.parse(oldSaved);
            if (parsed.points && parsed.points.length > 0) {
                const newShape = createNewShape();
                newShape.points = parsed.points;
                state.shapes.push(newShape);
                state.activeShapeId = newShape.id;
            }
             state.worldTransform = parsed.worldTransform || { originPxX: 0, originPxY: 0, pixelsPerUnit: 1 };
             document.getElementById('close-polygon-checkbox').checked = parsed.closePolygon || false;
        }
    }

    if (state.shapes.length === 0) {
        addNewPolygon();
    }
};

export const recordHistory = () => {
    state.history.push(JSON.stringify(state.shapes));
    if (state.history.length > 50) state.history.shift();
    state.redoStack = [];
    // updateUI(); // This will be called from main.js
};

export function getActiveShape() {
    if (!state.activeShapeId) return null;
    return state.shapes.find(s => s.id === state.activeShapeId);
}

export function createNewShape() {
    const id = Date.now() + Math.random();
    return { 
        id,
        name: `Polygon ${state.shapes.length + 1}`,
        points: [],
        visible: true,
        locked: false,
    };
}

export function addNewPolygon() {
    const newShape = createNewShape();
    state.shapes.push(newShape);
    state.activeShapeId = newShape.id;
    recordHistory();
    // updateUI(); // This will be called from main.js
}
