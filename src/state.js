let state = {
    image: null,
    shapes: [],
    activeShapeId: null,
    selectedPoint: null, // { shapeId, pointIndex }
    hoveredPoint: null, // { shapeId, pointIndex }
    draggedPoint: null, // { shapeId, pointIndex }
    dragStartPos: null,

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
    worldTransform: { originPxX: 0, originPxY: 0, pixelsPerUnit: 1, yMode: 'math' },
    isPanning: false,
    isSettingOrigin: false,
    isDraggingOrigin: false,
    isSpaceDown: false,
    isAltDown: false,
    lastMousePos: { x: 0, y: 0 },
    originDragOffsetS: { x: 0, y: 0 },
    snapSettings: {
        enabled: true,
        vertex: true,
        edge: true,
        axis: true,
        snapInPx: 10,
        snapOutPx: 16
    },
    snapState: {
        active: false,
        type: null, // 'vertex', 'edge', 'axis'
        targetRef: null, // { shapeId, pointIndex } or { shapeId, edgeIndex } or 'axisX'/'axisY'
        snappedPx: null, // { x, y }
        rawPx: null // { x, y } for hysteresis
    },
    snapPreview: {
        active: false,
        type: null,
        targetRef: null,
        snappedPx: null
    },
    isPointMoved: false,
    isDraggingPolygon: false,
    isPolygonMoved: false,
    initialPolygonPoints: null,
    polygonDragStartPos: null,
    export: {
        decimals: 2,
        mode: 'absolute' // 'absolute', 'centered', 'origin'
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
        export: state.export
    };
    localStorage.setItem('polygonToolState_v2', JSON.stringify(stateToSave));
};

export const loadState = () => {
    const saved = localStorage.getItem('polygonToolState_v2');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.shapes = parsed.shapes || [];
        state.activeShapeId = parsed.activeShapeId || null;
        state.worldTransform = parsed.worldTransform || { originPxX: 0, originPxY: 0, pixelsPerUnit: 1, yMode: 'math' };
        if (!state.worldTransform.yMode) {
            state.worldTransform.yMode = 'math';
        }
        state.imageTransform = parsed.imageTransform || { offsetX: 0, offsetY: 0, scale: 1, flipX: false, flipY: false, rotation: 0 };
        if (parsed.export) {
            state.export = parsed.export;
            if (state.export.mode === 'origin') {
                state.export.mode = '0 centered';
            }
        }
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
             state.worldTransform = parsed.worldTransform || { originPxX: 0, originPxY: 0, pixelsPerUnit: 1, yMode: 'math' };
             if (!state.worldTransform.yMode) {
                state.worldTransform.yMode = 'math';
            }
        }
    }

    if (state.shapes.length === 0) {
        addNewPolygon();
    }
};

export const recordHistory = () => {
    const snapshot = {
        shapes: state.shapes,
        activeShapeId: state.activeShapeId
    };
    state.history.push(JSON.stringify(snapshot));
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
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
    const color = colors[state.shapes.length % colors.length];
    return { 
        id,
        name: `Polygon ${state.shapes.length + 1}`,
        points: [],
        visible: true,
        locked: false,
        closed: true,
        color: color,
        opacity: 0.3
    };
}

export function addNewPolygon() {
    recordHistory();
    const newShape = createNewShape();
    state.shapes.push(newShape);
    state.activeShapeId = newShape.id;
    // updateUI(); // This will be called from main.js
}
