import { getState } from './state.js';
import { dom } from './dom.js';
import { calculateGridInterval, imageToWorld, worldToImage, getImageCorners } from './utils.js';

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

    // --- Draw Shapes (Polygons) BEFORE Grid ---
    state.shapes.forEach(shape => {
        if (!shape.visible || shape.points.length < 1) return;

        // Draw polygon lines
        if (shape.points.length > 1) {
            ctx.strokeStyle = shape.color;
            ctx.fillStyle = shape.color;
            ctx.globalAlpha = shape.opacity;
            ctx.lineWidth = 2 / state.viewTransform.scale;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            if (shape.closed) {
                ctx.closePath();
            }
            ctx.stroke();
            ctx.fill();
            ctx.globalAlpha = 1.0;
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
            ctx.lineWidth = 1 / state.viewTransform.scale;
            ctx.stroke();
        });
    });

    const { originPxX, originPxY } = state.worldTransform;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 1 / state.viewTransform.scale;
    ctx.beginPath();
    ctx.moveTo(originPxX, -1e6);
    ctx.lineTo(originPxX, 1e6);
    ctx.moveTo(-1e6, originPxY);
    ctx.lineTo(1e6, originPxY);
    ctx.stroke();

    // --- Draw Grid Ticks (Lines only) ---
    const gridInterval = calculateGridInterval();
    const { pixelsPerUnit } = state.worldTransform;
    const majorTickSize = 5 / state.viewTransform.scale;
    const minorTickSize = 2 / state.viewTransform.scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    
    const view = {
        left: -state.viewTransform.panX / state.viewTransform.scale,
        right: (rect.width - state.viewTransform.panX) / state.viewTransform.scale,
        top: -state.viewTransform.panY / state.viewTransform.scale,
        bottom: (rect.height - state.viewTransform.panY) / state.viewTransform.scale
    };

    const majorIntervalPx = gridInterval.major * pixelsPerUnit;

    // Collect labels to draw later
    const labelsToDraw = [];

    // X-Axis Ticks
    const startX_world = Math.floor(imageToWorld(view.left, 0).x / gridInterval.minor) * gridInterval.minor;
    const endX_world = Math.ceil(imageToWorld(view.right, 0).x / gridInterval.minor) * gridInterval.minor;
    
    for (let worldX = startX_world; worldX <= endX_world; worldX += gridInterval.minor) {
        if (Math.abs(worldX) < 1e-9) continue;
        const { x: imageX } = worldToImage(worldX, 0);
        
        const isMajorTick = Math.abs(worldX / gridInterval.major - Math.round(worldX / gridInterval.major)) < 1e-9;
        const tickSize = isMajorTick ? majorTickSize : minorTickSize;

        ctx.beginPath();
        ctx.moveTo(imageX, originPxY - tickSize);
        ctx.lineTo(imageX, originPxY + tickSize);
        ctx.stroke();

        if (isMajorTick) {
            labelsToDraw.push({
                text: Number(worldX.toPrecision(4)),
                x: imageX,
                y: originPxY + tickSize + 4 / state.viewTransform.scale,
                align: 'center',
                baseline: 'top'
            });
        }
    }

    // Y-Axis Ticks
    const y1_world = imageToWorld(0, view.bottom).y;
    const y2_world = imageToWorld(0, view.top).y;
    const startY_world = Math.floor(Math.min(y1_world, y2_world) / gridInterval.minor) * gridInterval.minor;
    const endY_world = Math.ceil(Math.max(y1_world, y2_world) / gridInterval.minor) * gridInterval.minor;

    for (let worldY = startY_world; worldY <= endY_world; worldY += gridInterval.minor) {
        if (Math.abs(worldY) < 1e-9) continue;
        const { y: imageY } = worldToImage(0, worldY);

        const isMajorTick = Math.abs(worldY / gridInterval.major - Math.round(worldY / gridInterval.major)) < 1e-9;
        const tickSize = isMajorTick ? majorTickSize : minorTickSize;

        ctx.beginPath();
        ctx.moveTo(originPxX - tickSize, imageY);
        ctx.lineTo(originPxX + tickSize, imageY);
        ctx.stroke();

        if (isMajorTick) {
             const originScreenX = (originPxX * state.viewTransform.scale) + state.viewTransform.panX;
             const isLeft = originScreenX < 60;
             const xOffset = isLeft ? tickSize + 4 / state.viewTransform.scale : -tickSize - 4 / state.viewTransform.scale;
             labelsToDraw.push({
                 text: Number(worldY.toPrecision(4)),
                 x: originPxX + xOffset,
                 y: imageY,
                 align: isLeft ? 'left' : 'right',
                 baseline: 'middle'
             });
        }
    }

    // Collect point labels
    if (dom.showLabelsCheckbox.checked) {
        state.shapes.forEach(shape => {
            if (!shape.visible) return;
            shape.points.forEach((p, i) => {
                labelsToDraw.push({
                    text: String(i),
                    x: p.x,
                    y: p.y - 10 / state.viewTransform.scale,
                    align: 'center',
                    baseline: 'bottom'
                });
            });
        });
    }

    // --- Draw Labels Last (Adaptive) ---
    // We need to restore context to draw labels in screen space properly (handled inside helper)
    // But helper expects to be called while context is in world space? 
    // No, helper calculates screen coords from world coords using state.
    // So we can call it. But helper calls ctx.setTransform, so we should restore ctx after each label or after all?
    // Helper restores ctx.
    
    labelsToDraw.forEach(l => {
        drawAdaptiveLabel(ctx, String(l.text), l.x, l.y, l.align, l.baseline, state);
    });

    // Draw Snap Indicators (New)
    const snap = state.snapState.active ? state.snapState : (state.snapPreview && state.snapPreview.active ? state.snapPreview : null);
    
    ctx.restore();

    if (snap) {
        const snappedScreen = {
            x: (snap.snappedPx.x * state.viewTransform.scale) + state.viewTransform.panX,
            y: (snap.snappedPx.y * state.viewTransform.scale) + state.viewTransform.panY
        };
        
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        // Pulsing effect
        const time = Date.now();
        const pulse = (Math.sin(time / 200) + 1) / 2; // 0..1
        const radius = 6 + pulse * 4;

        if (snap.type === 'vertex') {
            ctx.beginPath();
            ctx.arc(snappedScreen.x, snappedScreen.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (snap.type === 'edge') {
            ctx.beginPath();
            ctx.arc(snappedScreen.x, snappedScreen.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Highlight Edge
            const shape = state.shapes.find(s => s.id === snap.targetRef.shapeId);
            if (shape) {
                const p1 = shape.points[snap.targetRef.edgeIndex];
                const p2 = shape.points[(snap.targetRef.edgeIndex + 1) % shape.points.length];
                
                const p1S = {
                    x: (p1.x * state.viewTransform.scale) + state.viewTransform.panX,
                    y: (p1.y * state.viewTransform.scale) + state.viewTransform.panY
                };
                const p2S = {
                    x: (p2.x * state.viewTransform.scale) + state.viewTransform.panX,
                    y: (p2.y * state.viewTransform.scale) + state.viewTransform.panY
                };
                
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(p1S.x, p1S.y);
                ctx.lineTo(p2S.x, p2S.y);
                ctx.stroke();
            }
        } else if (snap.type === 'axis') {
            ctx.beginPath();
            ctx.arc(snappedScreen.x, snappedScreen.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Highlight Axis
            const originS = {
                x: (state.worldTransform.originPxX * state.viewTransform.scale) + state.viewTransform.panX,
                y: (state.worldTransform.originPxY * state.viewTransform.scale) + state.viewTransform.panY
            };
            
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.lineWidth = 1;
            
            if (snap.targetRef === 'axisX' || snap.targetRef === 'origin') {
                // Horizontal line at y=originY
                ctx.beginPath();
                ctx.moveTo(0, originS.y);
                ctx.lineTo(ctx.canvas.width, originS.y);
                ctx.stroke();
            }
            if (snap.targetRef === 'axisY' || snap.targetRef === 'origin') {
                // Vertical line at x=originX
                ctx.beginPath();
                ctx.moveTo(originS.x, 0);
                ctx.lineTo(originS.x, ctx.canvas.height);
                ctx.stroke();
            }
        }
        
        ctx.restore();
        
        // Request next frame for pulse
        requestAnimationFrame(draw);
    }
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawAdaptiveLabel(ctx, text, imageX, imageY, align, baseline, state) {
    const dpr = window.devicePixelRatio || 1;
    
    // Convert image coordinates to screen coordinates
    const screenX = (imageX * state.viewTransform.scale) + state.viewTransform.panX;
    const screenY = (imageY * state.viewTransform.scale) + state.viewTransform.panY;

    if (isNaN(screenX) || isNaN(screenY)) {
        return; // Don't draw if coordinates are invalid
    }

    // Sampling
    let isDark = false;
    const sampleSize = 12;
    const halfSample = sampleSize / 2;
    const sampleX = Math.floor(screenX * dpr);
    const sampleY = Math.floor(screenY * dpr);

    try {
        // Only sample if within canvas bounds
        if (sampleX - halfSample >= 0 && sampleY - halfSample >= 0 && 
            sampleX + halfSample <= ctx.canvas.width && sampleY + halfSample <= ctx.canvas.height) {
            
            const imageData = ctx.getImageData(sampleX - halfSample, sampleY - halfSample, sampleSize, sampleSize);
            const data = imageData.data;
            let totalL = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                // Luminance: 0.2126*R + 0.7152*G + 0.0722*B
                totalL += 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
            }
            const avgL = totalL / (data.length / 4);
            isDark = avgL < 140;
        } else {
            isDark = false;
        }
    } catch (e) {
        console.error("getImageData failed, using fallback.", {e, text, screenX, screenY});
        drawTaintedFallback(ctx, text, screenX, screenY, align, baseline, dpr);
        return;
    }

    const fillColor = isDark ? '#ffffff' : '#000000';
    const strokeColor = isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)';
    const backplateColor = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    const height = 12; 
    const paddingX = 4;
    const paddingY = 2;
    
    let rectX = screenX;
    let rectY = screenY;
    
    if (align === 'center') rectX -= width / 2;
    else if (align === 'right') rectX -= width;
    
    if (baseline === 'middle') rectY -= height / 2;
    else if (baseline === 'bottom') rectY -= height;
    
    // Draw Backplate
    ctx.fillStyle = backplateColor;
    roundRect(ctx, rectX - paddingX, rectY - paddingY, width + paddingX * 2, height + paddingY * 2, 3);
    ctx.fill();
    
    // Draw Halo
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, screenX, screenY);
    
    // Draw Text
    ctx.fillStyle = fillColor;
    ctx.fillText(text, screenX, screenY);
    
    ctx.restore();
}

function drawTaintedFallback(ctx, text, screenX, screenY, align, baseline, dpr) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.lineJoin = 'round';
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.strokeText(text, screenX, screenY);
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeText(text, screenX, screenY);
    
    ctx.fillStyle = 'black';
    ctx.fillText(text, screenX, screenY);
    
    ctx.restore();
}
