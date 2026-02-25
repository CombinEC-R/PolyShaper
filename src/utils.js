import { getState } from './state.js';

export const imageToWorld = (imageX, imageY) => {
    const state = getState();
    const { originPxX, originPxY, pixelsPerUnit, yMode } = state.worldTransform;
    if (pixelsPerUnit === 0) return { x: Infinity, y: Infinity };
    const worldX = (imageX - originPxX) / pixelsPerUnit;
    const worldY = yMode === 'math' 
        ? (originPxY - imageY) / pixelsPerUnit 
        : (imageY - originPxY) / pixelsPerUnit;
    return { x: worldX, y: worldY };
};

export const worldToImage = (worldX, worldY) => {
    const state = getState();
    const { originPxX, originPxY, pixelsPerUnit, yMode } = state.worldTransform;
    if (pixelsPerUnit === 0) return { x: Infinity, y: Infinity };
    const imageX = worldX * pixelsPerUnit + originPxX;
    const imageY = yMode === 'math'
        ? originPxY - worldY * pixelsPerUnit
        : originPxY + worldY * pixelsPerUnit;
    return { x: imageX, y: imageY };
};

export const getMousePos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
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

    const effectivePixelsPerUnit = pixelsPerUnit * scale;

    if (Math.abs(effectivePixelsPerUnit) < 1e-6) {
        return { major: 1, minor: 0.2 }; // Default interval if too zoomed out/in or invalid scale
    }

    const worldUnitsPerTargetSpacing = targetPixelSpacing / effectivePixelsPerUnit;

    if (worldUnitsPerTargetSpacing <= 0) {
        return { major: 1, minor: 0.2 }; // Handle negative pixelsPerUnit from input
    }

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
    let nearest = null;
    let minD = Infinity;
    for (const shape of [...state.shapes].reverse()) { 
        if (!shape.visible || shape.locked) continue;
        shape.points.forEach((p, i) => {
            const d = Math.hypot(p.x - imgX, p.y - imgY);
            if (d < tolerance && d < minD) {
                minD = d;
                nearest = { shapeId: shape.id, pointIndex: i };
            }
        });
    }
    return nearest;
}



export function calculatePolygonCentroid(points) {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1) return { x: points[0].x, y: points[0].y };
    if (points.length === 2) return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

    let signedArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < points.length; i++) {
        const x0 = points[i].x;
        const y0 = points[i].y;
        const x1 = points[(i + 1) % points.length].x;
        const y1 = points[(i + 1) % points.length].y;

        const a = x0 * y1 - x1 * y0;
        signedArea += a;
        cx += (x0 + x1) * a;
        cy += (y0 + y1) * a;
    }

    signedArea *= 0.5;
    
    if (Math.abs(signedArea) < 1e-6) {
        // Fallback to bbox center
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    }

    cx /= (6 * signedArea);
    cy /= (6 * signedArea);

    return { x: cx, y: cy };
}

export const formatNumber = (n, decimals) => {
    if (decimals === 0) {
        return Math.round(n);
    }
    return Number(n.toFixed(decimals));
};

export function computeAdvancedSnap(rawImagePos, excludeShapeId, excludePointIndex, state) {
    if (!state.snapSettings.enabled || state.isAltDown) {
        return { active: false, snappedPx: rawImagePos, type: null, targetRef: null, rawPx: rawImagePos };
    }

    const rawScreen = imagePxToScreen(rawImagePos.x, rawImagePos.y);
    const snapIn = state.snapSettings.snapInPx;
    const snapOut = state.snapSettings.snapOutPx;
    
    // Check if we are currently snapped and should hold (hysteresis)
    if (state.snapState.active && state.snapState.snappedPx) {
        const snappedScreen = imagePxToScreen(state.snapState.snappedPx.x, state.snapState.snappedPx.y);
        const distToTarget = Math.hypot(rawScreen.x - snappedScreen.x, rawScreen.y - snappedScreen.y);
        
        if (distToTarget < snapOut) {
            return { ...state.snapState, rawPx: rawImagePos }; // Keep snap, update rawPx for reference if needed
        }
    }

    let bestCandidate = null;
    let minDist = snapIn;

    // 1. Axis Snap
    if (state.snapSettings.axis) {
        const originScreen = imagePxToScreen(state.worldTransform.originPxX, state.worldTransform.originPxY);
        
        // X-Axis (vertical line at x=0) -> raw.x matches origin.x
        // Distance is |rawScreen.x - originScreen.x|
        const distX = Math.abs(rawScreen.x - originScreen.x);
        if (distX < minDist) {
            minDist = distX;
            bestCandidate = {
                active: true,
                type: 'axis',
                targetRef: 'axisY', // Snapped to Y axis (x=0)
                snappedPx: { x: state.worldTransform.originPxX, y: rawImagePos.y }
            };
        }

        // Y-Axis (horizontal line at y=0) -> raw.y matches origin.y
        const distY = Math.abs(rawScreen.y - originScreen.y);
        if (distY < minDist) {
            minDist = distY;
            bestCandidate = {
                active: true,
                type: 'axis',
                targetRef: 'axisX', // Snapped to X axis (y=0)
                snappedPx: { x: rawImagePos.x, y: state.worldTransform.originPxY }
            };
        }
        
        // Origin (both)
        const distOrigin = Math.hypot(rawScreen.x - originScreen.x, rawScreen.y - originScreen.y);
        if (distOrigin < minDist) {
            minDist = distOrigin;
            bestCandidate = {
                active: true,
                type: 'axis',
                targetRef: 'origin',
                snappedPx: { x: state.worldTransform.originPxX, y: state.worldTransform.originPxY }
            };
        }
    }

    // 2. Vertex Snap
    if (state.snapSettings.vertex) {
        state.shapes.forEach(shape => {
            if (shape.id === excludeShapeId && excludePointIndex === null) return; // Skip active shape if configured (but prompt says skip active shape by default)
            // Prompt: "Standard: Kandidaten sind alle Shapes außer dem aktiven Shape"
            if (shape.id === excludeShapeId) return; 
            if (!shape.visible || shape.locked) return;

            shape.points.forEach((p, idx) => {
                if (shape.id === excludeShapeId && idx === excludePointIndex) return;
                const pScreen = imagePxToScreen(p.x, p.y);
                const dist = Math.hypot(rawScreen.x - pScreen.x, rawScreen.y - pScreen.y);
                if (dist < minDist) {
                    minDist = dist;
                    bestCandidate = {
                        active: true,
                        type: 'vertex',
                        targetRef: { shapeId: shape.id, pointIndex: idx },
                        snappedPx: { x: p.x, y: p.y }
                    };
                }
            });
        });
    }

    // 3. Edge Snap
    if (state.snapSettings.edge) {
        state.shapes.forEach(shape => {
            if (shape.id === excludeShapeId) return;
            if (!shape.visible || shape.locked) return;
            if (shape.points.length < 2) return;

            const count = shape.closed ? shape.points.length : shape.points.length - 1;
            for (let i = 0; i < count; i++) {
                const p1 = shape.points[i];
                const p2 = shape.points[(i + 1) % shape.points.length];
                
                const p1Screen = imagePxToScreen(p1.x, p1.y);
                const p2Screen = imagePxToScreen(p2.x, p2.y);

                // Project rawScreen onto segment p1Screen-p2Screen
                const l2 = (p1Screen.x - p2Screen.x)**2 + (p1Screen.y - p2Screen.y)**2;
                if (l2 === 0) continue;
                
                let t = ((rawScreen.x - p1Screen.x) * (p2Screen.x - p1Screen.x) + (rawScreen.y - p1Screen.y) * (p2Screen.y - p1Screen.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                
                const projScreen = {
                    x: p1Screen.x + t * (p2Screen.x - p1Screen.x),
                    y: p1Screen.y + t * (p2Screen.y - p1Screen.y)
                };
                
                const dist = Math.hypot(rawScreen.x - projScreen.x, rawScreen.y - projScreen.y);
                
                if (dist < minDist) {
                    minDist = dist;
                    // Calculate snapped position in Image Space using t
                    const snappedImageX = p1.x + t * (p2.x - p1.x);
                    const snappedImageY = p1.y + t * (p2.y - p1.y);
                    
                    bestCandidate = {
                        active: true,
                        type: 'edge',
                        targetRef: { shapeId: shape.id, edgeIndex: i },
                        snappedPx: { x: snappedImageX, y: snappedImageY }
                    };
                }
            }
        });
    }

    if (bestCandidate) {
        return { ...bestCandidate, rawPx: rawImagePos };
    }

    return { active: false, snappedPx: rawImagePos, type: null, targetRef: null, rawPx: rawImagePos };
}

export function sqr(x) { return x * x }
export function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
export function distToSegmentSquared(p, v, w) {
    let l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
export function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

export function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

export function calculatePolygonArea(points) {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
}

export function calculatePolygonPerimeter(points, closed) {
    if (points.length < 2) return 0;
    let perimeter = 0;
    for (let i = 0; i < points.length - 1; i++) {
        perimeter += Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
    }
    if (closed && points.length > 2) {
        perimeter += Math.hypot(points[0].x - points[points.length-1].x, points[0].y - points[points.length-1].y);
    }
    return perimeter;
}

export function calculateAngle(p1, p2, p3) {
    const a = Math.hypot(p3.x - p2.x, p3.y - p2.y);
    const b = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const c = Math.hypot(p3.x - p1.x, p3.y - p1.y);
    if (a === 0 || b === 0) return 0;
    let cosVal = (a*a + b*b - c*c) / (2 * a * b);
    cosVal = Math.max(-1, Math.min(1, cosVal));
    return Math.acos(cosVal) * (180 / Math.PI);
}
