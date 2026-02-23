import { getState } from './state.js';
import { dom } from './dom.js';
import { calculateGridInterval, imageToWorld, getImageCorners } from './utils.js';

let isDirty = true;
let renderRequested = false;

export function draw() {
    isDirty = true;
    if (!renderRequested) {
        renderRequested = true;
        requestAnimationFrame(render);
    }
}

function render() {
    renderRequested = false;
    if (!isDirty) return;
    isDirty = false;

    const state = getState();
    const { ctx, canvas } = dom;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(state.viewTransform.panX, state.viewTransform.panY);
    ctx.scale(state.viewTransform.scale, state.viewTransform.scale);

    if (state.image) {
        ctx.save();
        const cx = state.imageTransform.offsetX + (state.image.width * state.imageTransform.scale) / 2;
        const cy = state.imageTransform.offsetY + (state.image.height * state.imageTransform.scale) / 2;
        
        ctx.translate(cx, cy);
        ctx.rotate(state.imageTransform.rotation * Math.PI / 180);
        ctx.scale(
            (state.imageTransform.flipX ? -1 : 1) * state.imageTransform.scale, 
            (state.imageTransform.flipY ? -1 : 1) * state.imageTransform.scale
        );
        
        ctx.drawImage(state.image, -state.image.width / 2, -state.image.height / 2);
        ctx.restore();

        if (state.editImageMode) {
            const corners = getImageCorners();
            if (corners) {
                ctx.strokeStyle = '#00aaff';
                ctx.lineWidth = 2 / state.viewTransform.scale;
                ctx.setLineDash([5 / state.viewTransform.scale, 5 / state.viewTransform.scale]);
                
                ctx.beginPath();
                ctx.moveTo(corners.tl.x, corners.tl.y);
                ctx.lineTo(corners.tr.x, corners.tr.y);
                ctx.lineTo(corners.br.x, corners.br.y);
                ctx.lineTo(corners.bl.x, corners.bl.y);
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#00aaff';
                ctx.lineWidth = 2 / state.viewTransform.scale;
                const radius = 6 / state.viewTransform.scale;
                
                for (const key of ['tl', 'tr', 'br', 'bl']) {
                    ctx.beginPath();
                    ctx.arc(corners[key].x, corners[key].y, radius, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
    }

    const { originPxX, originPxY } = state.worldTransform;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 1 / state.viewTransform.scale;
    ctx.beginPath();
    ctx.moveTo(originPxX, -1e6);
    ctx.lineTo(originPxX, 1e6);
    ctx.moveTo(-1e6, originPxY);
    ctx.lineTo(1e6, originPxY);
    ctx.stroke();

    // --- Draw Grid Ticks and Labels ---
    const gridInterval = calculateGridInterval();
    const { pixelsPerUnit } = state.worldTransform;
    const majorTickSize = 5 / state.viewTransform.scale;
    const minorTickSize = 2 / state.viewTransform.scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `${10 / state.viewTransform.scale}px Arial`;
    const view = {
        left: -state.viewTransform.panX / state.viewTransform.scale,
        right: (rect.width - state.viewTransform.panX) / state.viewTransform.scale,
        top: -state.viewTransform.panY / state.viewTransform.scale,
        bottom: (rect.height - state.viewTransform.panY) / state.viewTransform.scale
    };

    const majorIntervalPx = gridInterval.major * pixelsPerUnit;

    // X-Axis Ticks
    const startX_world = Math.floor(imageToWorld(view.left, 0).x / gridInterval.minor) * gridInterval.minor;
    const endX_world = Math.ceil(imageToWorld(view.right, 0).x / gridInterval.minor) * gridInterval.minor;
    
    for (let worldX = startX_world; worldX <= endX_world; worldX += gridInterval.minor) {
        if (Math.abs(worldX) < 1e-9) continue;
        const imageX = originPxX + worldX * pixelsPerUnit;
        
        const isMajorTick = Math.abs(worldX % gridInterval.major) < 1e-9 || Math.abs((worldX % gridInterval.major) - gridInterval.major) < 1e-9;
        const tickSize = isMajorTick ? majorTickSize : minorTickSize;

        ctx.beginPath();
        ctx.moveTo(imageX, originPxY - tickSize);
        ctx.lineTo(imageX, originPxY + tickSize);
        ctx.stroke();

        if (isMajorTick) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(Number(worldX.toPrecision(4)), imageX, originPxY + tickSize + 4 / state.viewTransform.scale);
        }
    }

    // Y-Axis Ticks
    const startY_world = Math.floor(imageToWorld(0, view.bottom).y / gridInterval.minor) * gridInterval.minor;
    const endY_world = Math.ceil(imageToWorld(0, view.top).y / gridInterval.minor) * gridInterval.minor;

    for (let worldY = startY_world; worldY <= endY_world; worldY += gridInterval.minor) {
        if (Math.abs(worldY) < 1e-9) continue;
        const imageY = originPxY - worldY * pixelsPerUnit;

        const isMajorTick = Math.abs(worldY % gridInterval.major) < 1e-9 || Math.abs((worldY % gridInterval.major) - gridInterval.major) < 1e-9;
        const tickSize = isMajorTick ? majorTickSize : minorTickSize;

        ctx.beginPath();
        ctx.moveTo(originPxX - tickSize, imageY);
        ctx.lineTo(originPxX + tickSize, imageY);
        ctx.stroke();

        if (isMajorTick) {
             ctx.textAlign = (originPxX * state.viewTransform.scale + state.viewTransform.panX < 40) ? 'left' : 'right';
             const xOffset = (originPxX * state.viewTransform.scale + state.viewTransform.panX < 40) ? tickSize + 4 / state.viewTransform.scale : -tickSize - 4 / state.viewTransform.scale;
             ctx.textBaseline = 'middle';
             ctx.fillText(Number(worldY.toPrecision(4)), originPxX + xOffset, imageY);
        }
    }

    state.shapes.forEach(shape => {
        if (!shape.visible || shape.points.length < 1) return;

        // Draw polygon lines
        if (shape.points.length > 1) {
            ctx.strokeStyle = 'rgba(0, 122, 204, 0.9)';
            ctx.fillStyle = 'rgba(0, 122, 204, 0.3)';
            ctx.lineWidth = 2 / state.viewTransform.scale;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            if (dom.closePolygonCheckbox.checked) { // This should probably be shape-specific
                ctx.closePath();
            }
            ctx.stroke();
            ctx.fill();
        }

        // Draw points
        shape.points.forEach((p, i) => {
            ctx.beginPath();
            const isHovered = state.hoveredPoint && state.hoveredPoint.shapeId === shape.id && state.hoveredPoint.pointIndex === i;
            const isSelected = state.selectedPoint && state.selectedPoint.shapeId === shape.id && state.selectedPoint.pointIndex === i;
            const radius = (isHovered && !isSelected) ? 7 / state.viewTransform.scale : 5 / state.viewTransform.scale;
            
            ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isSelected ? '#ffcc00' : '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.stroke();

            if (dom.showLabelsCheckbox.checked) {
                ctx.fillStyle = 'white';
                ctx.font = `${12 / state.viewTransform.scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(i, p.x, p.y - 10 / state.viewTransform.scale);
            }
        });
    });

    if (state.snapPoint) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 1 / state.viewTransform.scale;
        ctx.beginPath();
        ctx.arc(state.snapPoint.x, state.snapPoint.y, parseFloat(dom.snapDistSlider.value) / state.viewTransform.scale, 0, 2 * Math.PI);
        ctx.stroke();
    }

    ctx.restore();
}
