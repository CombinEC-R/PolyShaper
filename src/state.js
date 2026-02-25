let state = {
    image: null,
    shapes: [],
    activeShapeId: null,
    selectedPoints: [], // Array of { shapeId, pointIndex }
    boxSelect: { active: false, startPx: null, endPx: null },
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
    isCtrlDown: false,
    showMinimap: false,
    lastMousePos: { x: 0, y: 0 },
    currentMousePos: { x: 0, y: 0 },
    originDragOffsetS: { x: 0, y: 0 },
    snapSettings: {
        enabled: true,
        vertex: true,
        edge: true,
        axis: true,
        snapInPx: 10,
        snapOutPx: 16
    },
    measureMode: 'none', // 'none', 'distance', 'angle'
    measurePoints: [],
    measurements: [],
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
    transformState: {
        active: false,
        originalPoints: null, // Map<string, {x, y}> where key is `${shapeId}-${pointIndex}`
        pivot: null, // {x, y}
        scale: 1,
        rotation: 0
    },
    snapshots: [], // Array of { id, name, timestamp, data }
    compareMode: false,
    compareSnapshot: null, // The snapshot data to compare against
    history: [],
    redoStack: [],
    isDirty: false,
};

let autosaveTimeout = null;

export const triggerAutosave = () => {
    state.isDirty = true;
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
        const json = generateProjectJson(true);
        localStorage.setItem('polygonToolAutosave', json);
    }, 500);
};

export const getState = () => state;

export const generateProjectJson = (includeView = false) => {
    const data = {
        image: state.image ? {
            name: state.image.name || "image",
            width: state.image.width,
            height: state.image.height
        } : null,
        coord: state.worldTransform,
        exportSettings: state.export,
        shapes: state.shapes.map(s => ({
            id: s.id,
            name: s.name,
            closed: s.closed,
            color: s.color,
            opacity: s.opacity,
            visible: s.visible,
            locked: s.locked,
            points: s.points.map(p => ({ x: p.x, y: p.y }))
        }))
    };
    if (includeView) {
        data.viewTransform = state.viewTransform;
        data.imageTransform = state.imageTransform;
    }
    return JSON.stringify(data, null, 2);
};

export const loadProjectJson = (jsonStr) => {
    const data = JSON.parse(jsonStr);
    if (data.coord) state.worldTransform = data.coord;
    if (data.exportSettings) state.export = data.exportSettings;
    if (data.viewTransform) state.viewTransform = data.viewTransform;
    if (data.imageTransform) state.imageTransform = data.imageTransform;
    if (data.shapes && Array.isArray(data.shapes)) {
        state.shapes = data.shapes;
        state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
    }
    state.isDirty = false;
};

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

export const saveSnapshot = (name) => {
    const snapshot = {
        id: Date.now(),
        name: name || `Snapshot ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
        data: generateProjectJson(true)
    };
    state.snapshots.push(snapshot);
    localStorage.setItem('polygonToolSnapshots', JSON.stringify(state.snapshots));
    return snapshot;
};

export const deleteSnapshot = (id) => {
    state.snapshots = state.snapshots.filter(s => s.id !== id);
    localStorage.setItem('polygonToolSnapshots', JSON.stringify(state.snapshots));
    if (state.compareSnapshot && state.compareSnapshot.id === id) {
        state.compareMode = false;
        state.compareSnapshot = null;
    }
};

export const loadSnapshotsFromStorage = () => {
    const stored = localStorage.getItem('polygonToolSnapshots');
    if (stored) {
        try {
            state.snapshots = JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load snapshots", e);
            state.snapshots = [];
        }
    }
};

export const loadState = () => {
    loadSnapshotsFromStorage();
    const autosave = localStorage.getItem('polygonToolAutosave');
    if (autosave) {
        try {
            loadProjectJson(autosave);
            state.isDirty = false;
            return;
        } catch (e) {
            console.error("Failed to load autosave", e);
        }
    }

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
    state.isDirty = false;
};

export const recordHistory = () => {
    const snapshot = {
        shapes: state.shapes,
        activeShapeId: state.activeShapeId
    };
    state.history.push(JSON.stringify(snapshot));
    if (state.history.length > 50) state.history.shift();
    state.redoStack = [];
    triggerAutosave();
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
