import { getState } from './state.js';
import { dom } from './dom.js';

export const imageToWorld = (imageX, imageY) => {
    const state = getState();
    const { originPxX, originPxY, pixelsPerUnit } = state.worldTransform;
    if (pixelsPerUnit === 0) return { x: Infinity, y: Infinity };
    const worldX = (imageX - originPxX) / pixelsPerUnit;
    const worldY = (originPxY - imageY) / pixelsPerUnit;
    return { x: worldX, y: worldY };
};

export const worldToImage = (worldX, worldY) => {
    const state = getState();
    const { originPxX, originPxY, pixelsPerUnit } = state.worldTransform;
    if (pixelsPerUnit === 0) return { x: Infinity, y: Infinity };
    const imageX = worldX * pixelsPerUnit + originPxX;
    const imageY = originPxY - worldY * pixelsPerUnit;
    return { x: imageX, y: imageY };
};

export const getMousePos = (e) => {
    const rect = dom.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export const screenToImagePx = (screenX, screenY) => {
    const state = getState();
    const { panX, panY, scale } = state.viewTransform;
    const imgX = (screenX - panX) / scale;
    const imgY = (screenY - panY) / scale;
    return { x: imgX, y: imgY };
};

export const imagePxToScreen = (imageX, imageY) => {
    const state = getState();
    const { panX, panY, scale } = state.viewTransform;
    const screenX = imageX * scale + panX;
    const screenY = imageY * scale + panY;
    return { x: screenX, y: screenY };
};

export const getMouseImagePos = (e) => {
    const mousePos = getMousePos(e);
    return screenToImagePx(mousePos.x, mousePos.y);
}

export function getImageCorners() {
    const state = getState();
    if (!state.image) return null;

    const w = state.image.width;
    const h = state.image.height;
    const t = state.imageTransform;

    const cx = t.offsetX + (w * t.scale) / 2;
    const cy = t.offsetY + (h * t.scale) / 2;

    const scaleX = (t.flipX ? -1 : 1) * t.scale;
    const scaleY = (t.flipY ? -1 : 1) * t.scale;
    const angle = t.rotation * Math.PI / 180;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const transformPoint = (x, y) => {
        let sx = x * scaleX;
        let sy = y * scaleY;
        let rx = sx * cos - sy * sin;
        let ry = sx * sin + sy * cos;
        return { x: rx + cx, y: ry + cy };
    };

    return {
        tl: transformPoint(-w/2, -h/2),
        tr: transformPoint(w/2, -h/2),
        br: transformPoint(w/2, h/2),
        bl: transformPoint(-w/2, h/2),
        center: { x: cx, y: cy }
    };
}

export function calculateGridInterval() {
    const state = getState();
    const targetPixelSpacing = 80; // Aim for grid lines roughly 80px apart on screen
    const pixelsPerUnit = state.worldTransform.pixelsPerUnit;
    const scale = state.viewTransform.scale;

    const worldUnitsPerTargetSpacing = targetPixelSpacing / (pixelsPerUnit * scale);

    const power = Math.pow(10, Math.floor(Math.log10(worldUnitsPerTargetSpacing)));
    const normalizedInterval = worldUnitsPerTargetSpacing / power;

    let majorInterval;
    if (normalizedInterval < 1.5) {
        majorInterval = 1 * power;
    } else if (normalizedInterval < 3.5) {
        majorInterval = 2 * power;
    } else if (normalizedInterval < 7.5) {
        majorInterval = 5 * power;
    } else {
        majorInterval = 10 * power;
    }
    
    const minorInterval = majorInterval / 5;

    return { major: majorInterval, minor: minorInterval };
}

export function findPointAt(imgX, imgY) {
    const state = getState();
    const tolerance = 10 / state.viewTransform.scale;
    for (const shape of [...state.shapes].reverse()) { 
        if (!shape.visible || shape.locked) continue;
        const pointIndex = shape.points.findIndex(p => Math.hypot(p.x - imgX, p.y - imgY) < tolerance);
        if (pointIndex > -1) {
            return { shapeId: shape.id, pointIndex };
        }
    }
    return null;
}

export function computeAxisSnap(rawOriginPx) {
    const state = getState();
    const snapConfig = { centerIn: 10, centerOut: 16, axisIn: 10, axisOut: 16 };
    let snappedPx = { ...rawOriginPx };

    const allPoints = state.shapes.flatMap(s => s.visible && !s.locked ? s.points.map(p => ({ ...p, shapeId: s.id })) : []);
    const rawOriginS = imagePxToScreen(rawOriginPx.x, rawOriginPx.y);

    // --- Center Snap (Priority 1) ---
    if (state.axisSnapState.centerActive) {
        const targetS = imagePxToScreen(state.axisSnapState.centerTarget.x, state.axisSnapState.centerTarget.y);
        const distS = Math.hypot(targetS.x - rawOriginS.x, targetS.y - rawOriginS.y);
        if (distS < snapConfig.centerOut) {
            snappedPx = { x: state.axisSnapState.centerTarget.x, y: state.axisSnapState.centerTarget.y };
            return { snappedPx, snapIndicators: [] }; // Early exit, center snap holds
        } else {
            state.axisSnapState.centerActive = false;
            state.axisSnapState.centerTarget = null;
        }
    }

    let bestCenterCandidate = null;
    let minCenterDist = Infinity;
    for (const p of allPoints) {
        const pS = imagePxToScreen(p.x, p.y);
        const distS = Math.hypot(pS.x - rawOriginS.x, pS.y - rawOriginS.y);
        if (distS < snapConfig.centerIn && distS < minCenterDist) {
            minCenterDist = distS;
            bestCenterCandidate = p;
        }
    }

    if (bestCenterCandidate) {
        state.axisSnapState.centerActive = true;
        state.axisSnapState.centerTarget = { x: bestCenterCandidate.x, y: bestCenterCandidate.y };
        snappedPx = { x: bestCenterCandidate.x, y: bestCenterCandidate.y };
        return { snappedPx, snapIndicators: [] };
    }

    // --- Axis Snap (Priority 2) ---
    // X-Axis
    if (state.axisSnapState.xActive) {
        const targetS = imagePxToScreen(state.axisSnapState.xTargetPx, rawOriginPx.y);
        const distS = Math.abs(targetS.x - rawOriginS.x);
        if (distS < snapConfig.axisOut) {
            snappedPx.x = state.axisSnapState.xTargetPx;
        } else {
            state.axisSnapState.xActive = false;
            state.axisSnapState.xTargetPx = null;
        }
    } else {
        let bestXCandidate = null;
        let minXDist = Infinity;
        for (const p of allPoints) {
            const pS = imagePxToScreen(p.x, p.y);
            const distS = Math.abs(pS.x - rawOriginS.x);
            if (distS < snapConfig.axisIn && distS < minXDist) {
                minXDist = distS;
                bestXCandidate = p;
            }
        }
        if (bestXCandidate) {
            state.axisSnapState.xActive = true;
            state.axisSnapState.xTargetPx = bestXCandidate.x;
            snappedPx.x = bestXCandidate.x;
        }
    }

    // Y-Axis
    if (state.axisSnapState.yActive) {
        const targetS = imagePxToScreen(rawOriginPx.x, state.axisSnapState.yTargetPx);
        const distS = Math.abs(targetS.y - rawOriginS.y);
        if (distS < snapConfig.axisOut) {
            snappedPx.y = state.axisSnapState.yTargetPx;
        } else {
            state.axisSnapState.yActive = false;
            state.axisSnapState.yTargetPx = null;
        }
    } else {
        let bestYCandidate = null;
        let minYDist = Infinity;
        for (const p of allPoints) {
            const pS = imagePxToScreen(p.x, p.y);
            const distS = Math.abs(pS.y - rawOriginS.y);
            if (distS < snapConfig.axisIn && distS < minYDist) {
                minYDist = distS;
                bestYCandidate = p;
            }
        }
        if (bestYCandidate) {
            state.axisSnapState.yActive = true;
            state.axisSnapState.yTargetPx = bestYCandidate.y;
            snappedPx.y = bestYCandidate.y;
        }
    }

    return { snappedPx, snapIndicators: [] };
}

export function computePointSnap(rawPointPx, ignorePoint = null) {
    const state = getState();
    const snapConfig = { axisIn: 10, axisOut: 16 };
    let snappedPx = { ...rawPointPx };
    const { originPxX, originPxY } = state.worldTransform;

    const rawPointS = imagePxToScreen(rawPointPx.x, rawPointPx.y);
    const originS = imagePxToScreen(originPxX, originPxY);

    // Snap to X-Axis (Y=0)
    if (state.pointSnapState.activeToY0) {
        const distS = Math.abs(rawPointS.y - originS.y);
        if (distS < snapConfig.axisOut) {
            snappedPx.y = originPxY;
        } else {
            state.pointSnapState.activeToY0 = false;
        }
    } else {
        const distS = Math.abs(rawPointS.y - originS.y);
        if (distS < snapConfig.axisIn) {
            state.pointSnapState.activeToY0 = true;
            snappedPx.y = originPxY;
        }
    }

    // Snap to Y-Axis (X=0)
    if (state.pointSnapState.activeToX0) {
        const distS = Math.abs(rawPointS.x - originS.x);
        if (distS < snapConfig.axisOut) {
            snappedPx.x = originPxX;
        } else {
            state.pointSnapState.activeToX0 = false;
        }
    } else {
        const distS = Math.abs(rawPointS.x - originS.x);
        if (distS < snapConfig.axisIn) {
            state.pointSnapState.activeToX0 = true;
            snappedPx.x = originPxX;
        }
    }

    return { snappedPx, snapIndicators: [] };
}
