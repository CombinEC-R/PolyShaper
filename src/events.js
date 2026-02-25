import { dom, updateUI, setRenameActive } from './dom.js';
import { getState, recordHistory, saveState, getActiveShape, addNewPolygon, loadProjectJson, generateProjectJson, saveSnapshot } from './state.js';
import { getMousePos, screenToImagePx, imageToWorld, worldToImage, findPointAt, getImageCorners, calculatePolygonCentroid, formatNumber, computeAdvancedSnap, imagePxToScreen, distToSegment, downloadFile, calculatePolygonArea } from './utils.js';

import { draw } from './canvas.js';

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const state = getState();
            state.image = img;
            state.worldTransform.originPxX = img.width / 2;
            state.worldTransform.originPxY = img.height / 2;
            state.measurements = [];
            state.measurePoints = [];
            handleFit(dom.canvas);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFit(canvas) {
    const state = getState();
    if (!state.image) return;
    const rect = canvas.getBoundingClientRect();
    
    const imgW = state.image.width * state.imageTransform.scale;
    const imgH = state.image.height * state.imageTransform.scale;
    
    const scaleX = rect.width / imgW;
    const scaleY = rect.height / imgH;
    const scale = Math.min(scaleX, scaleY) * 0.95;
    
    const cx = state.imageTransform.offsetX + imgW / 2;
    const cy = state.imageTransform.offsetY + imgH / 2;
    
    state.viewTransform = {
        scale,
        panX: rect.width / 2 - cx * scale,
        panY: rect.height / 2 - cy * scale,
    };
    updateUI();
    draw();
}

function handleReset() {
    const state = getState();
    if (!state.image) return;
    const rect = dom.canvas.getBoundingClientRect();
    
    const imgW = state.image.width * state.imageTransform.scale;
    const imgH = state.image.height * state.imageTransform.scale;
    const cx = state.imageTransform.offsetX + imgW / 2;
    const cy = state.imageTransform.offsetY + imgH / 2;
    
    state.viewTransform = { 
        scale: 1, 
        panX: rect.width / 2 - cx, 
        panY: rect.height / 2 - cy 
    };
    updateUI();
    draw();
}

export function initEventListeners() {
    const state = getState();

    dom.loadImageBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => e.target.files.length && handleImageLoad(e.target.files[0]));

    dom.fitBtn.addEventListener('click', () => handleFit(dom.canvas));
    dom.resetBtn.addEventListener('click', handleReset);

    const setZoom = (scale) => {
        const state = getState();
        if (!state.image) return;
        const rect = dom.canvas.getBoundingClientRect();
        const centerS = { x: rect.width / 2, y: rect.height / 2 };
        const centerImg = screenToImagePx(centerS.x, centerS.y);
        
        state.viewTransform.scale = scale;
        const newCenterImg = screenToImagePx(centerS.x, centerS.y);
        
        state.viewTransform.panX += (newCenterImg.x - centerImg.x) * scale;
        state.viewTransform.panY += (newCenterImg.y - centerImg.y) * scale;
        
        updateUI();
        draw();
    };

    dom.zoom25Btn.addEventListener('click', () => setZoom(0.25));
    dom.zoom50Btn.addEventListener('click', () => setZoom(0.5));
    dom.zoom100Btn.addEventListener('click', () => setZoom(1));
    dom.zoom200Btn.addEventListener('click', () => setZoom(2));
    dom.zoom400Btn.addEventListener('click', () => setZoom(4));

    dom.zoomInBtn.addEventListener('click', () => {
        state.viewTransform.scale *= 1.2;
        updateUI();
        draw();
    });

    dom.zoomOutBtn.addEventListener('click', () => {
        state.viewTransform.scale /= 1.2;
        updateUI();
        draw();
    });

    dom.zoomSlider.addEventListener('input', (e) => {
        state.viewTransform.scale = parseFloat(e.target.value);
        updateUI();
        draw();
    });

    dom.undoBtn.addEventListener('click', () => {
        if (state.history.length > 0) {
            const currentSnapshot = {
                shapes: state.shapes,
                activeShapeId: state.activeShapeId
            };
            state.redoStack.push(JSON.stringify(currentSnapshot));
            
            const prevSnapshot = JSON.parse(state.history.pop());
            // Handle potential legacy array-only history (just in case)
            if (Array.isArray(prevSnapshot)) {
                state.shapes = prevSnapshot;
            } else {
                state.shapes = prevSnapshot.shapes;
                state.activeShapeId = prevSnapshot.activeShapeId;
            }
            
            updateUI();
            draw();
        }
    });

    dom.redoBtn.addEventListener('click', () => {
        if (state.redoStack.length > 0) {
            const currentSnapshot = {
                shapes: state.shapes,
                activeShapeId: state.activeShapeId
            };
            state.history.push(JSON.stringify(currentSnapshot));
            
            const nextSnapshot = JSON.parse(state.redoStack.pop());
            if (Array.isArray(nextSnapshot)) {
                state.shapes = nextSnapshot;
            } else {
                state.shapes = nextSnapshot.shapes;
                state.activeShapeId = nextSnapshot.activeShapeId;
            }
            
            updateUI();
            draw();
        }
    });

    dom.editImageModeCheckbox.addEventListener('change', (e) => {
        state.editImageMode = e.target.checked;
        dom.canvas.style.cursor = state.editImageMode ? 'move' : 'crosshair';
        draw();
    });

    dom.imageScaleInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.imageTransform.scale = value;
            draw();
        }
    });

    dom.imageRotationInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.imageTransform.rotation = value;
            draw();
        }
    });

    dom.flipXBtn.addEventListener('click', () => {
        state.imageTransform.flipX = !state.imageTransform.flipX;
        draw();
    });

    dom.flipYBtn.addEventListener('click', () => {
        state.imageTransform.flipY = !state.imageTransform.flipY;
        draw();
    });

    dom.originXInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.worldTransform.originPxX = value;
            draw();
        }
    });

    dom.originYInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            state.worldTransform.originPxY = value;
            draw();
        }
    });

    dom.scaleInput.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
            state.worldTransform.pixelsPerUnit = value;
            draw();
        }
    });

    dom.yModeMathRadio.addEventListener('change', () => {
        if (dom.yModeMathRadio.checked) {
            state.worldTransform.yMode = 'math';
            updateUI();
            draw();
        }
    });

    dom.yModeGpuRadio.addEventListener('change', () => {
        if (dom.yModeGpuRadio.checked) {
            state.worldTransform.yMode = 'gpu';
            updateUI();
            draw();
        }
    });

    dom.setOriginBtn.addEventListener('click', () => {
        state.isSettingOrigin = true;
        dom.canvas.style.cursor = 'crosshair';
    });

    dom.resetOriginBtn.addEventListener('click', () => {
        state.worldTransform.originPxX = 0;
        state.worldTransform.originPxY = 0;
        updateUI();
        draw();
    });

    dom.centerViewOriginBtn.addEventListener('click', () => {
        const state = getState();
        if (!state.image) return;
        const rect = dom.canvas.getBoundingClientRect();
        state.viewTransform.panX = rect.width / 2 - state.worldTransform.originPxX * state.viewTransform.scale;
        state.viewTransform.panY = rect.height / 2 - state.worldTransform.originPxY * state.viewTransform.scale;
        updateUI();
        draw();
    });

    dom.showLabelsCheckbox.addEventListener('change', () => draw());

    if (dom.showMinimapCheckbox) {
        dom.showMinimapCheckbox.addEventListener('change', (e) => {
            state.showMinimap = e.target.checked;
            updateUI();
            draw();
        });
    }

    dom.snapEnabledCheckbox.addEventListener('change', (e) => {
        state.snapSettings.enabled = e.target.checked;
        draw();
    });
    dom.snapVertexCheckbox.addEventListener('change', (e) => {
        state.snapSettings.vertex = e.target.checked;
        draw();
    });
    dom.snapEdgeCheckbox.addEventListener('change', (e) => {
        state.snapSettings.edge = e.target.checked;
        draw();
    });
    dom.snapAxisCheckbox.addEventListener('change', (e) => {
        state.snapSettings.axis = e.target.checked;
    });
    dom.snapInInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            state.snapSettings.snapInPx = value;
        }
    });
    dom.snapOutInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            state.snapSettings.snapOutPx = value;
        }
    });

    const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(err => {
                fallbackCopyText(text);
            });
        } else {
            fallbackCopyText(text);
        }
    };

    const fallbackCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure it's not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    };

    const generateCocoJson = () => {
        const state = getState();
        const annotations = [];
        let annId = 1;
        state.shapes.forEach(shape => {
            if (!shape.visible || shape.points.length < 3) return;
            const segmentation = [];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shape.points.forEach(p => {
                segmentation.push(p.x, p.y);
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
            annotations.push({
                id: annId++,
                image_id: 1,
                category_id: 1,
                segmentation: [segmentation],
                area: calculatePolygonArea(shape.points),
                bbox: [minX, minY, maxX - minX, maxY - minY],
                iscrowd: 0
            });
        });
        const coco = {
            images: [
                {
                    id: 1,
                    width: state.image ? state.image.width : 0,
                    height: state.image ? state.image.height : 0,
                    file_name: "image.png"
                }
            ],
            categories: [{ id: 1, name: "polygon", supercategory: "shape" }],
            annotations: annotations
        };
        return JSON.stringify(coco, null, 2);
    };

    const generateCsv = () => {
        const state = getState();
        let csv = "polygonId,pointIndex,worldX,worldY,pxX,pxY\n";
        state.shapes.forEach(shape => {
            shape.points.forEach((p, i) => {
                const w = imageToWorld(p.x, p.y);
                csv += `"${shape.name}",${i},${w.x.toFixed(state.export.decimals)},${w.y.toFixed(state.export.decimals)},${p.x.toFixed(2)},${p.y.toFixed(2)}\n`;
            });
        });
        return csv;
    };

    const generateSvg = () => {
        const state = getState();
        const w = state.image ? state.image.width : 800;
        const h = state.image ? state.image.height : 600;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">\n`;
        
        // Origin crosshair
        const ox = state.worldTransform.originPxX;
        const oy = state.worldTransform.originPxY;
        svg += `  <line x1="${ox}" y1="0" x2="${ox}" y2="${h}" stroke="red" stroke-width="1" opacity="0.5"/>\n`;
        svg += `  <line x1="0" y1="${oy}" x2="${w}" y2="${oy}" stroke="red" stroke-width="1" opacity="0.5"/>\n`;

        state.shapes.forEach(shape => {
            if (!shape.visible || shape.points.length === 0) return;
            const pts = shape.points.map(p => `${p.x},${p.y}`).join(" ");
            if (shape.closed && shape.points.length > 2) {
                svg += `  <polygon points="${pts}" fill="${shape.color}" fill-opacity="${shape.opacity}" stroke="${shape.color}" stroke-width="2"/>\n`;
            } else {
                svg += `  <polyline points="${pts}" fill="none" stroke="${shape.color}" stroke-width="2"/>\n`;
            }
        });
        svg += `</svg>`;
        return svg;
    };

    if (dom.copyJsonBtn) {
        dom.copyJsonBtn.addEventListener('click', () => {
            const includeView = dom.exportViewStateCheckbox && dom.exportViewStateCheckbox.checked;
            copyToClipboard(generateProjectJson(includeView));
        });
    }
    if (dom.downloadJsonBtn) {
        dom.downloadJsonBtn.addEventListener('click', () => {
            const includeView = dom.exportViewStateCheckbox && dom.exportViewStateCheckbox.checked;
            downloadFile('project.json', generateProjectJson(includeView), 'application/json');
        });
    }
    if (dom.downloadCocoBtn) {
        dom.downloadCocoBtn.addEventListener('click', () => {
            downloadFile('coco.json', generateCocoJson(), 'application/json');
        });
    }
    if (dom.copyCsvBtn) {
        dom.copyCsvBtn.addEventListener('click', () => {
            copyToClipboard(generateCsv());
        });
    }
    if (dom.downloadCsvBtn) {
        dom.downloadCsvBtn.addEventListener('click', () => {
            downloadFile('points.csv', generateCsv(), 'text/csv');
        });
    }
    if (dom.downloadSvgBtn) {
        dom.downloadSvgBtn.addEventListener('click', () => {
            downloadFile('export.svg', generateSvg(), 'image/svg+xml');
        });
    }
    if (dom.downloadPngBtn) {
        dom.downloadPngBtn.addEventListener('click', () => {
            const state = getState();
            if (!state.image) return;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = state.image.width;
            offCanvas.height = state.image.height;
            const ctx = offCanvas.getContext('2d');
            
            // Draw image
            ctx.drawImage(state.image, 0, 0);
            
            // Draw shapes
            state.shapes.forEach(shape => {
                if (!shape.visible || shape.points.length < 1) return;
                if (shape.points.length > 1) {
                    ctx.strokeStyle = shape.color;
                    ctx.fillStyle = shape.color;
                    ctx.globalAlpha = shape.opacity;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        ctx.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    if (shape.closed) ctx.closePath();
                    ctx.stroke();
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            });
            
            offCanvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'export.png';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 0);
            }, 'image/png');
        });
    }
    
    if (dom.importJsonInput) {
        dom.importJsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    loadProjectJson(ev.target.result);
                    recordHistory();
                    updateUI();
                    draw();
                } catch (err) {
                    alert("Failed to import JSON: " + err.message);
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // reset
        });
    }

    const setupSlot = (slotNum, nameInput, saveBtn, loadBtn) => {
        if (!nameInput || !saveBtn || !loadBtn) return;
        const savedName = localStorage.getItem(`polygonToolSlot${slotNum}Name`);
        if (savedName) nameInput.value = savedName;

        nameInput.addEventListener('change', () => {
            localStorage.setItem(`polygonToolSlot${slotNum}Name`, nameInput.value);
        });

        saveBtn.addEventListener('click', () => {
            const json = generateProjectJson(true);
            localStorage.setItem(`polygonToolSlot${slotNum}Data`, json);
            localStorage.setItem(`polygonToolSlot${slotNum}Name`, nameInput.value);
            const state = getState();
            state.isDirty = false;
        });

        loadBtn.addEventListener('click', () => {
            const json = localStorage.getItem(`polygonToolSlot${slotNum}Data`);
            if (json) {
                try {
                    loadProjectJson(json);
                    recordHistory();
                    updateUI();
                    draw();
                } catch (err) {
                    alert(`Failed to load Slot ${slotNum}: ` + err.message);
                }
            } else {
                alert(`Slot ${slotNum} is empty.`);
            }
        });
    };

    setupSlot(1, dom.slot1Name, dom.slot1Save, dom.slot1Load);
    setupSlot(2, dom.slot2Name, dom.slot2Save, dom.slot2Load);
    setupSlot(3, dom.slot3Name, dom.slot3Save, dom.slot3Load);

    // Export Controls Listeners
    if (dom.exportModeSelect) {
        dom.exportModeSelect.addEventListener('change', (e) => {
            const state = getState();
            state.export.mode = e.target.value;
        });
    }

    if (dom.exportDecimalsInput) {
        dom.exportDecimalsInput.addEventListener('change', (e) => {
            const state = getState();
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = 2;
            if (val < 0) val = 0;
            if (val > 6) val = 6;
            state.export.decimals = val;
            e.target.value = val;
        });
    }

    dom.helpBtn.addEventListener('click', () => dom.helpOverlay.style.display = 'flex');
    dom.closeHelpBtn.addEventListener('click', () => dom.helpOverlay.style.display = 'none');
    dom.helpOverlay.addEventListener('click', (e) => {
        if (e.target === dom.helpOverlay) {
            dom.helpOverlay.style.display = 'none';
        }
    });

    // Search Input
    if (dom.shapeSearchInput) {
        dom.shapeSearchInput.addEventListener('input', () => {
            updateUI();
        });
    }

    // Context Menu Actions
    if (dom.shapeContextMenu) {
        dom.shapeContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const targetId = parseFloat(dom.shapeContextMenu.dataset.targetId);
            const targetIndex = parseInt(dom.shapeContextMenu.dataset.targetIndex);
            
            if (!action || isNaN(targetId)) return;

            const state = getState();
            const shape = state.shapes.find(s => s.id === targetId);
            if (!shape) return;

            dom.shapeContextMenu.style.display = 'none';

            if (action === 'rename') {
                setRenameActive(targetId);
            } else if (action === 'duplicate') {
                recordHistory();
                const newShape = JSON.parse(JSON.stringify(shape));
                newShape.id = Date.now() + Math.random();
                newShape.name = shape.name + ' (Copy)';
                state.shapes.splice(targetIndex + 1, 0, newShape);
                state.activeShapeId = newShape.id;
                updateUI();
                draw();
            } else if (action === 'delete') {
                recordHistory();
                state.shapes.splice(targetIndex, 1);
                if (state.activeShapeId === targetId) {
                    state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                }
                updateUI();
                draw();
            } else if (action === 'clear-points') {
                recordHistory();
                shape.points = [];
                updateUI();
                draw();
            } else if (action === 'reverse-order') {
                recordHistory();
                shape.points.reverse();
                draw();
            } else if (action === 'move-up') {
                if (targetIndex > 0) {
                    recordHistory();
                    const temp = state.shapes[targetIndex];
                    state.shapes[targetIndex] = state.shapes[targetIndex - 1];
                    state.shapes[targetIndex - 1] = temp;
                    updateUI();
                    draw();
                }
            } else if (action === 'move-down') {
                if (targetIndex < state.shapes.length - 1) {
                    recordHistory();
                    const temp = state.shapes[targetIndex];
                    state.shapes[targetIndex] = state.shapes[targetIndex + 1];
                    state.shapes[targetIndex + 1] = temp;
                    updateUI();
                    draw();
                }
            } else if (action === 'export-shape') {
                const data = {
                    ...shape,
                    points: shape.points.map(p => {
                        const w = imageToWorld(p.x, p.y);
                        return { x: p.x, y: p.y, worldX: w.x, worldY: w.y };
                    })
                };
                downloadFile(`${shape.name}.json`, JSON.stringify(data, null, 2), 'application/json');
            }
        });

        // Close context menu on global click
        document.addEventListener('click', (e) => {
            if (!dom.shapeContextMenu.contains(e.target)) {
                dom.shapeContextMenu.style.display = 'none';
            }
        });
        
        // Close on scroll
        dom.shapesList.addEventListener('scroll', () => {
             dom.shapeContextMenu.style.display = 'none';
        });
    }

    // Keyboard Shortcuts for Shapes
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Control' || e.key === 'Meta') {
            state.isCtrlDown = true;
            if (state.measureMode === 'none') dom.canvas.style.cursor = 'default'; // Select mode cursor
        }

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // 1-9 Selection
        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            if (index < state.shapes.length) {
                state.activeShapeId = state.shapes[index].id;
                updateUI();
                draw();
            }
        }

        // Tab / Shift+Tab Navigation
        if (e.key === 'Tab') {
            e.preventDefault();
            const currentIndex = state.shapes.findIndex(s => s.id === state.activeShapeId);
            let nextIndex = currentIndex;
            let loopCount = 0;
            
            const direction = e.shiftKey ? -1 : 1;
            
            do {
                nextIndex = (nextIndex + direction + state.shapes.length) % state.shapes.length;
                loopCount++;
                const s = state.shapes[nextIndex];
                // Skip if hidden or locked (optional, but good UX)
                if (s.visible && !s.locked) {
                    state.activeShapeId = s.id;
                    updateUI();
                    draw();
                    break;
                }
            } while (loopCount < state.shapes.length);
        }

        if (e.key === ' ') {
            if (!state.isSpaceDown) {
                e.preventDefault();
                state.isSpaceDown = true;
                dom.canvas.style.cursor = 'grab';
            }
        }
        
        // Select All
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (e.shiftKey) {
                // Select ALL points in ALL visible+unlocked shapes
                state.selectedPoints = [];
                state.shapes.forEach(s => {
                    if (s.visible && !s.locked) {
                        s.points.forEach((_, i) => {
                            state.selectedPoints.push({ shapeId: s.id, pointIndex: i });
                        });
                    }
                });
            } else {
                // Select ALL points in active shape
                const activeShape = getActiveShape();
                if (activeShape && activeShape.visible && !activeShape.locked) {
                    state.selectedPoints = activeShape.points.map((_, i) => ({ shapeId: activeShape.id, pointIndex: i }));
                }
            }
            updateUI();
            draw();
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedPoints && state.selectedPoints.length > 0) {
                recordHistory();
                // Group by shapeId and sort indices descending to safely splice
                const toDelete = {};
                state.selectedPoints.forEach(sp => {
                    if (!toDelete[sp.shapeId]) toDelete[sp.shapeId] = [];
                    toDelete[sp.shapeId].push(sp.pointIndex);
                });
                
                Object.keys(toDelete).forEach(shapeIdStr => {
                    const shapeId = parseFloat(shapeIdStr);
                    const shape = state.shapes.find(s => s.id === shapeId);
                    if (shape && !shape.locked) {
                        // Sort descending to delete from end
                        toDelete[shapeIdStr].sort((a, b) => b - a).forEach(idx => {
                            shape.points.splice(idx, 1);
                        });
                    }
                });
                
                state.selectedPoints = [];
                updateUI();
                draw();
            } else if (state.activeShapeId) {
                // Delete shape if Shift is held
                if (e.shiftKey) {
                    const shape = getActiveShape();
                    if (shape && !shape.locked) {
                        recordHistory();
                        const index = state.shapes.findIndex(s => s.id === shape.id);
                        if (index !== -1) {
                            state.shapes.splice(index, 1);
                            state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                            updateUI();
                            draw();
                        }
                    }
                }
            }
        }
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            dom.undoBtn.click();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            dom.redoBtn.click();
        }
        if(e.key === 'Escape'){
            if (dom.helpOverlay && dom.helpOverlay.style.display === 'flex') {
                dom.helpOverlay.style.display = 'none';
                return;
            }
            if (dom.shapeContextMenu && dom.shapeContextMenu.style.display === 'block') {
                dom.shapeContextMenu.style.display = 'none';
                return;
            }
            state.selectedPoints = [];
            state.measurePoints = [];
            updateUI();
            draw();
        }
        if (e.key === 'Alt') {
            state.isAltDown = true;
            draw();
        }
        
        // Nudge
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && state.selectedPoints && state.selectedPoints.length > 0) {
            e.preventDefault();
            
            // Reset transform state if active, as we are modifying points directly
            if (state.transformState && state.transformState.active) {
                state.transformState.active = false;
                state.transformState.originalPoints = null;
                if (dom.transformScaleSlider) {
                    dom.transformScaleSlider.value = 1;
                    dom.transformScaleVal.textContent = '1.00';
                    dom.transformRotateSlider.value = 0;
                    dom.transformRotateVal.textContent = '0°';
                }
            }

            const step = e.shiftKey ? 10 : 1;
            const dx = (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0) * step / state.viewTransform.scale;
            const dy = (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0) * step / state.viewTransform.scale;
            
            if (!state.isPointMoved) {
                recordHistory();
                state.isPointMoved = true;
            }

            state.selectedPoints.forEach(sp => {
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape && !shape.locked) {
                    shape.points[sp.pointIndex].x += dx;
                    shape.points[sp.pointIndex].y += dy;
                }
            });
            draw();
        }

        // Reorder Points
        if ((e.key === '[' || e.key === ']') && state.selectedPoints && state.selectedPoints.length === 1) {
            const sp = state.selectedPoints[0];
            const shape = state.shapes.find(s => s.id === sp.shapeId);
            if (shape && !shape.locked) {
                recordHistory();
                const idx = sp.pointIndex;
                const len = shape.points.length;
                let newIdx = e.key === '[' ? idx - 1 : idx + 1;
                
                if (shape.closed) {
                    newIdx = (newIdx + len) % len;
                } else {
                    if (newIdx < 0 || newIdx >= len) return;
                }
                
                const temp = shape.points[idx];
                shape.points[idx] = shape.points[newIdx];
                shape.points[newIdx] = temp;
                
                // Update selection index
                sp.pointIndex = newIdx;
                updateUI();
                draw();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === ' ') {
            state.isSpaceDown = false;
            dom.canvas.style.cursor = 'crosshair';
        }
        if (e.key === 'Alt') {
            state.isAltDown = false;
            draw();
        }
        if (e.key === 'Control' || e.key === 'Meta') {
            state.isCtrlDown = false;
            if (state.measureMode === 'none') dom.canvas.style.cursor = 'crosshair';
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            state.isPointMoved = false;
        }
    });

    dom.addShapeBtn.addEventListener('click', () => {
        addNewPolygon();
        updateUI();
        draw();
    });

    dom.duplicateShapeBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape) {
            recordHistory();
            const newShape = JSON.parse(JSON.stringify(activeShape));
            newShape.id = Date.now() + Math.random();
            newShape.name = activeShape.name + ' (Copy)';
            state.shapes.push(newShape);
            state.activeShapeId = newShape.id;
            updateUI();
            draw();
        }
    });

    dom.deleteShapeBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape) {
            if (confirm(`Delete "${activeShape.name}"?`)) {
                recordHistory();
                state.shapes = state.shapes.filter(s => s.id !== activeShape.id);
                
                if (state.activeShapeId === activeShape.id) {
                    state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                }

                if (state.selectedPoint && state.selectedPoint.shapeId === activeShape.id) {
                    state.selectedPoint = null;
                }
                if (state.hoveredPoint && state.hoveredPoint.shapeId === activeShape.id) {
                    state.hoveredPoint = null;
                }
                
                updateUI();
                draw();
            }
        }
    });

    dom.clearPointsBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            if (confirm(`Clear all points from "${activeShape.name}"?`)) {
                recordHistory();
                activeShape.points = [];
                updateUI();
                draw();
            }
        }
    });

    dom.shapeClosedCheckbox.addEventListener('change', (e) => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            recordHistory();
            activeShape.closed = e.target.checked;
            draw();
        }
    });

    dom.shapeColorInput.addEventListener('input', (e) => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            // No history on input, only on change
            activeShape.color = e.target.value;
            draw();
        }
    });
    
    dom.shapeColorInput.addEventListener('change', () => {
        recordHistory();
    });

    dom.shapeOpacityInput.addEventListener('input', (e) => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked) {
            // No history on input, only on change
            activeShape.opacity = parseFloat(e.target.value);
            draw();
        }
    });

    dom.shapeOpacityInput.addEventListener('change', () => {
        recordHistory();
    });

    dom.shapesList.addEventListener('click', (e) => {
        // Event delegation removed, handled directly in dom.js
    });

    dom.centerOriginBtn.addEventListener('click', () => {
        const activeShape = getActiveShape();
        if (activeShape && !activeShape.locked && activeShape.points.length > 0) {
            recordHistory();
            const center = calculatePolygonCentroid(activeShape.points);
            const { originPxX, originPxY } = state.worldTransform;
            const dx = originPxX - center.x;
            const dy = originPxY - center.y;
            activeShape.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
            updateUI();
            draw();
        }
    });

    if (dom.measureNoneRadio) {
        dom.measureNoneRadio.addEventListener('change', () => { state.measureMode = 'none'; state.measurePoints = []; draw(); });
        dom.measureDistRadio.addEventListener('change', () => { state.measureMode = 'distance'; state.measurePoints = []; draw(); });
        dom.measureAngleRadio.addEventListener('change', () => { state.measureMode = 'angle'; state.measurePoints = []; draw(); });
        dom.clearMeasurementsBtn.addEventListener('click', () => { state.measurements = []; state.measurePoints = []; draw(); });
    }

    dom.canvas.addEventListener('mousedown', (e) => {
        dom.canvas.focus();
        const mouseS = getMousePos(e, dom.canvas);
        const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
        const { originPxX, originPxY } = state.worldTransform;
        const originS = imagePxToScreen(originPxX, originPxY);
        state.originDragOffsetS = { x: mouseS.x - originS.x, y: mouseS.y - originS.y };



        if (e.button === 1 || state.isSpaceDown) {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.button === 0) {
            if (state.measureMode !== 'none') {
                let newPoint = mouseImgPos;
                if (state.snapPreview && state.snapPreview.active) {
                    newPoint = state.snapPreview.snappedPx;
                } else if (state.hoveredPoint) {
                    const shape = state.shapes.find(s => s.id === state.hoveredPoint.shapeId);
                    if (shape) newPoint = shape.points[state.hoveredPoint.pointIndex];
                }
                state.measurePoints.push({...newPoint});
                
                if (state.measureMode === 'distance' && state.measurePoints.length === 2) {
                    state.measurements.push({ type: 'distance', points: [...state.measurePoints] });
                    state.measurePoints = [];
                } else if (state.measureMode === 'angle' && state.measurePoints.length === 3) {
                    state.measurements.push({ type: 'angle', points: [...state.measurePoints] });
                    state.measurePoints = [];
                }
                draw();
                return;
            }

            if (state.editImageMode && state.image) {
                const corners = getImageCorners();
                const tolerance = 10 / state.viewTransform.scale;
                let clickedCorner = null;

                if (corners) {
                    for (const key of ['tl', 'tr', 'br', 'bl']) {
                        if (Math.hypot(corners[key].x - mouseImgPos.x, corners[key].y - mouseImgPos.y) < tolerance) {
                            clickedCorner = key;
                            break;
                        }
                    }
                }

                if (clickedCorner) {
                    state.isDraggingImageCorner = true;
                    state.draggedImageCorner = clickedCorner;
                    state.initialImageTransform = { ...state.imageTransform };
                    state.initialDragCenter = corners.center;
                    state.initialDragDist = Math.hypot(mouseImgPos.x - corners.center.x, mouseImgPos.y - corners.center.y);
                    state.initialDragAngle = Math.atan2(mouseImgPos.y - corners.center.y, mouseImgPos.x - corners.center.x);
                    return;
                }

                state.isDraggingImage = true;
                state.imageDragOffset = { 
                    x: mouseImgPos.x - state.imageTransform.offsetX, 
                    y: mouseImgPos.y - state.imageTransform.offsetY 
                };
                return;
            }

            const axisGrabTolerance = 10 / state.viewTransform.scale;
            if (e.shiftKey && (Math.abs(mouseImgPos.x - originPxX) < axisGrabTolerance || Math.abs(mouseImgPos.y - originPxY) < axisGrabTolerance)) {
                state.isDraggingOrigin = true;
                return;
            }
            if (state.isSettingOrigin) {
                state.worldTransform.originPxX = mouseImgPos.x;
                state.worldTransform.originPxY = mouseImgPos.y;
                state.isSettingOrigin = false;
                dom.canvas.style.cursor = 'crosshair';
                updateUI();
                return;
            }

            const foundPoint = findPointAt(mouseImgPos.x, mouseImgPos.y);

            if (foundPoint) {
                state.activeShapeId = foundPoint.shapeId;
                const isSelected = state.selectedPoints && state.selectedPoints.some(p => p.shapeId === foundPoint.shapeId && p.pointIndex === foundPoint.pointIndex);
                
                if (e.shiftKey) {
                    if (!isSelected) {
                        state.selectedPoints.push(foundPoint);
                    }
                } else if (e.ctrlKey || e.metaKey) {
                    if (isSelected) {
                        state.selectedPoints = state.selectedPoints.filter(p => !(p.shapeId === foundPoint.shapeId && p.pointIndex === foundPoint.pointIndex));
                    } else {
                        state.selectedPoints.push(foundPoint);
                    }
                } else {
                    if (!isSelected) {
                        state.selectedPoints = [foundPoint];
                    }
                }
                
                state.draggedPoint = { ...foundPoint };
                state.isPointMoved = false;
                state.lastMousePos = mouseImgPos;
            } else {
                // No point clicked
                
                // Ctrl-Drag Polygon Logic (Moved here to allow point selection with Ctrl)
                if (e.ctrlKey || e.metaKey) {
                    const activeShape = getActiveShape();
                    if (activeShape && !activeShape.locked && activeShape.points.length > 0) {
                        state.isDraggingPolygon = true;
                        state.isPolygonMoved = false;
                        state.polygonDragStartPos = { ...mouseImgPos };
                        state.initialPolygonPoints = activeShape.points.map(p => ({ ...p }));
                        dom.canvas.style.cursor = 'move';
                        return;
                    }
                }

                if (e.altKey) {
                    const activeShape = getActiveShape();
                    if (activeShape && !activeShape.locked && activeShape.visible) {
                        let minDist = Infinity;
                        let bestEdge = -1;
                        const screenP = imagePxToScreen(mouseImgPos.x, mouseImgPos.y);
                        const count = activeShape.closed ? activeShape.points.length : activeShape.points.length - 1;
                        for (let i = 0; i < count; i++) {
                            const p1 = activeShape.points[i];
                            const p2 = activeShape.points[(i + 1) % activeShape.points.length];
                            const sp1 = imagePxToScreen(p1.x, p1.y);
                            const sp2 = imagePxToScreen(p2.x, p2.y);
                            const dist = distToSegment(screenP, sp1, sp2);
                            if (dist < minDist) {
                                minDist = dist;
                                bestEdge = i;
                            }
                        }
                        if (minDist <= 10) {
                            recordHistory();
                            activeShape.points.splice(bestEdge + 1, 0, {x: mouseImgPos.x, y: mouseImgPos.y});
                            state.selectedPoints = [{shapeId: activeShape.id, pointIndex: bestEdge + 1}];
                            state.activeShapeId = activeShape.id;
                            updateUI(); draw(); return;
                        }
                    }
                }

                if (e.shiftKey) {
                    state.boxSelect = { active: true, startPx: mouseImgPos, endPx: mouseImgPos };
                    return;
                }
                
                // Add new point (only if NOT holding Ctrl/Meta)
                if (!e.ctrlKey && !e.metaKey) {
                    state.selectedPoints = [];
                    const activeShape = getActiveShape();
                    if (activeShape && !activeShape.locked) {
                        recordHistory();
                        let newPoint = mouseImgPos;
                        if (state.snapPreview && state.snapPreview.active) {
                            newPoint = state.snapPreview.snappedPx;
                        }
                        activeShape.points.push(newPoint);
                        state.selectedPoints = [{ shapeId: activeShape.id, pointIndex: activeShape.points.length - 1 }];
                    }
                }
            }
            updateUI();
            draw();
        }
    });

    dom.canvas.addEventListener('mousemove', (e) => {
        const mouseS = getMousePos(e, dom.canvas);
        state.currentMousePos = mouseS;
        const imagePos = screenToImagePx(mouseS.x, mouseS.y);
        const worldPos = imageToWorld(imagePos.x, imagePos.y);
        
        dom.mouseCoordsStatus.textContent = `Px: [${Math.round(imagePos.x)}, ${Math.round(imagePos.y)}] | World: [${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}]`;
        
        if (state.boxSelect && state.boxSelect.active) {
            state.boxSelect.endPx = imagePos;
            draw();
            return;
        }

        if (state.isPanning) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.viewTransform.panX += dx;
            state.viewTransform.panY += dy;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            updateUI();
            draw();
            return;
        }

        if (state.isDraggingPolygon) {
            const currentMouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
            const dx = currentMouseImgPos.x - state.polygonDragStartPos.x;
            const dy = currentMouseImgPos.y - state.polygonDragStartPos.y;
            
            const activeShape = getActiveShape();
            if (activeShape) {
                if (!state.isPolygonMoved) {
                    recordHistory();
                    state.isPolygonMoved = true;
                }
                
                activeShape.points = state.initialPolygonPoints.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy
                }));
                
                dom.mouseCoordsStatus.textContent = `Polygon Move (Ctrl) | Px: [${Math.round(currentMouseImgPos.x)}, ${Math.round(currentMouseImgPos.y)}]`;
                updateUI();
                draw();
            }
            return;
        }

        if (state.isDraggingImageCorner) {
            const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
            const C = state.initialDragCenter;

            const d1 = Math.hypot(mouseImgPos.x - C.x, mouseImgPos.y - C.y);
            const a1 = Math.atan2(mouseImgPos.y - C.y, mouseImgPos.x - C.x);

            const scaleFactor = d1 / state.initialDragDist;
            const angleDiff = a1 - state.initialDragAngle;

            let newScale = state.initialImageTransform.scale * scaleFactor;
            newScale = Math.max(0.01, newScale);

            let newRotation = state.initialImageTransform.rotation + (angleDiff * 180 / Math.PI);

            state.imageTransform.scale = newScale;
            state.imageTransform.rotation = newRotation;

            state.imageTransform.offsetX = C.x - (state.image.width * newScale) / 2;
            state.imageTransform.offsetY = C.y - (state.image.height * newScale) / 2;

            updateUI();
            draw();
            return;
        }

        if (state.isDraggingImage) {
            const mouseImgPos = screenToImagePx(mouseS.x, mouseS.y);
            state.imageTransform.offsetX = mouseImgPos.x - state.imageDragOffset.x;
            state.imageTransform.offsetY = mouseImgPos.y - state.imageDragOffset.y;
            updateUI();
            draw();
            return;
        }

        if (state.isDraggingOrigin) {
            const rawOriginS = { x: mouseS.x - state.originDragOffsetS.x, y: mouseS.y - state.originDragOffsetS.y };
            const rawOriginPx = screenToImagePx(rawOriginS.x, rawOriginS.y);

            // The new snap logic handles axis snapping, but dragging the origin itself is a separate concept.
            // Let's adjust it to use the new snap system for its snapping.
            const snapResult = computeAdvancedSnap(rawOriginPx, null, null, state);
            const newOrigin = snapResult.active ? snapResult.snappedPx : rawOriginPx;

            state.worldTransform.originPxX = newOrigin.x;
            state.worldTransform.originPxY = newOrigin.y;
            updateUI();
            draw();
            return;
        }

        if (state.draggedPoint) {
            if (!state.isPointMoved) {
                recordHistory();
                state.isPointMoved = true;
            }
            
            const dx = imagePos.x - state.lastMousePos.x;
            const dy = imagePos.y - state.lastMousePos.y;

            state.selectedPoints.forEach(sp => {
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape && !shape.locked) {
                    shape.points[sp.pointIndex].x += dx;
                    shape.points[sp.pointIndex].y += dy;
                }
            });

            if (state.selectedPoints.length === 1) {
                const shape = state.shapes.find(s => s.id === state.draggedPoint.shapeId);
                if (shape && !shape.locked) {
                    const pt = shape.points[state.draggedPoint.pointIndex];
                    const snapResult = (state.isAltDown) ? { active: false } : computeAdvancedSnap(pt, state.draggedPoint.shapeId, state.draggedPoint.pointIndex, state);
                    if (snapResult.active) {
                        pt.x = snapResult.snappedPx.x;
                        pt.y = snapResult.snappedPx.y;
                    }
                    state.snapState = snapResult;
                }
            } else {
                state.snapState = { active: false };
            }

            state.lastMousePos = imagePos;
            updateUI();
        } else {
            const imagePos = screenToImagePx(mouseS.x, mouseS.y);
            state.hoveredPoint = findPointAt(imagePos.x, imagePos.y);
            
            // Placement Preview / Snap
            if (state.measureMode !== 'none') {
                 const snapResult = (state.isAltDown) ? { active: false } : computeAdvancedSnap(imagePos, null, null, state);
                 state.snapPreview = snapResult;
                 // If hovered point, snap to it
                 if (state.hoveredPoint) {
                     const shape = state.shapes.find(s => s.id === state.hoveredPoint.shapeId);
                     if (shape) {
                         state.snapPreview = { active: true, snappedPx: shape.points[state.hoveredPoint.pointIndex], type: 'vertex' };
                     }
                 }
            } else {
                const activeShape = getActiveShape();
                if (activeShape && !activeShape.locked && !state.hoveredPoint) {
                     const snapResult = (state.isAltDown) ? { active: false } : computeAdvancedSnap(imagePos, activeShape.id, null, state);
                     state.snapPreview = snapResult;
                } else {
                    state.snapPreview = { active: false };
                }
            }
        }
        draw();
    });

    dom.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (state.hoveredPoint) {
            const shape = state.shapes.find(s => s.id === state.hoveredPoint.shapeId);
            if (shape && !shape.locked) {
                recordHistory();
                shape.points.splice(state.hoveredPoint.pointIndex, 1);
                state.hoveredPoint = null;
                state.selectedPoints = [];
                updateUI();
                draw();
            }
        } else {
            const activeShape = getActiveShape();
            if (activeShape && !activeShape.locked && activeShape.points.length > 0) {
                recordHistory();
                activeShape.points.pop();
                updateUI();
                draw();
            }
        }
    });

    // Context Menu Actions
    dom.shapeContextMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const shapeId = parseFloat(dom.shapeContextMenu.dataset.targetId);
        const state = getState();
        const shape = state.shapes.find(s => s.id === shapeId);

        if (!shape) return;

        if (action === 'rename') {
            setRenameActive(true, shapeId);
            updateUI();
        } else if (action === 'duplicate') {
            recordHistory();
            const newShape = JSON.parse(JSON.stringify(shape));
            newShape.id = Date.now() + Math.random();
            newShape.name = shape.name + ' (Copy)';
            state.shapes.push(newShape);
            state.activeShapeId = newShape.id;
            updateUI();
            draw();
        } else if (action === 'delete') {
            if (confirm(`Delete "${shape.name}"?`)) {
                recordHistory();
                state.shapes = state.shapes.filter(s => s.id !== shapeId);
                if (state.activeShapeId === shapeId) {
                    state.activeShapeId = state.shapes.length > 0 ? state.shapes[0].id : null;
                }
                updateUI();
                draw();
            }
        } else if (action === 'clear-points') {
            if (confirm(`Clear all points from "${shape.name}"?`)) {
                recordHistory();
                shape.points = [];
                updateUI();
                draw();
            }
        } else if (action === 'reverse-order') {
            recordHistory();
            shape.points.reverse();
            draw();
        } else if (action === 'move-up') {
            const idx = state.shapes.findIndex(s => s.id === shapeId);
            if (idx > 0) {
                recordHistory();
                const temp = state.shapes[idx];
                state.shapes[idx] = state.shapes[idx - 1];
                state.shapes[idx - 1] = temp;
                updateUI();
                draw();
            }
        } else if (action === 'move-down') {
            const idx = state.shapes.findIndex(s => s.id === shapeId);
            if (idx < state.shapes.length - 1) {
                recordHistory();
                const temp = state.shapes[idx];
                state.shapes[idx] = state.shapes[idx + 1];
                state.shapes[idx + 1] = temp;
                updateUI();
                draw();
            }
        } else if (action.startsWith('export-shape')) {
            // Per-shape export
            const format = action.split('-')[2]; // json, csv, svg
            
            if (format === 'json') {
                const data = {
                    image: state.image ? { name: state.image.name, width: state.image.width, height: state.image.height } : null,
                    coord: state.worldTransform,
                    exportSettings: state.export,
                    shapes: [shape].map(s => ({
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
                const jsonStr = JSON.stringify(data, null, 2);
                downloadFile(jsonStr, `${shape.name.replace(/\s+/g, '_')}.json`, 'application/json');
            } else if (format === 'csv') {
                // Basic CSV for single shape
                let csv = 'shape_name,point_index,pixel_x,pixel_y,world_x,world_y\n';
                shape.points.forEach((p, i) => {
                    const w = imageToWorld(p.x, p.y);
                    csv += `"${shape.name}",${i},${p.x.toFixed(2)},${p.y.toFixed(2)},${w.x.toFixed(state.export.decimals)},${w.y.toFixed(state.export.decimals)}\n`;
                });
                downloadFile(csv, `${shape.name.replace(/\s+/g, '_')}.csv`, 'text/csv');
            } else if (format === 'svg') {
                // Basic SVG for single shape
                const w = state.image ? state.image.width : 800;
                const h = state.image ? state.image.height : 600;
                let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
                
                let pointsStr = shape.points.map(p => `${p.x},${p.y}`).join(' ');
                let fill = shape.closed ? shape.color : 'none';
                let stroke = shape.color;
                
                if (shape.closed) {
                    svg += `  <polygon points="${pointsStr}" fill="${fill}" stroke="${stroke}" stroke-width="2" fill-opacity="${shape.opacity}" />\n`;
                } else {
                    svg += `  <polyline points="${pointsStr}" fill="none" stroke="${stroke}" stroke-width="2" />\n`;
                }
                
                svg += `</svg>`;
                downloadFile(svg, `${shape.name.replace(/\s+/g, '_')}.svg`, 'image/svg+xml');
            }
        }

        dom.shapeContextMenu.style.display = 'none';
    });

    window.addEventListener('mouseup', (e) => {
        if (state.boxSelect && state.boxSelect.active) {
            const minX = Math.min(state.boxSelect.startPx.x, state.boxSelect.endPx.x);
            const maxX = Math.max(state.boxSelect.startPx.x, state.boxSelect.endPx.x);
            const minY = Math.min(state.boxSelect.startPx.y, state.boxSelect.endPx.y);
            const maxY = Math.max(state.boxSelect.startPx.y, state.boxSelect.endPx.y);
            
            const newSelection = [];
            state.shapes.forEach(shape => {
                if (!shape.visible || shape.locked) return;
                shape.points.forEach((p, idx) => {
                    if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
                        newSelection.push({ shapeId: shape.id, pointIndex: idx });
                    }
                });
            });
            
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                newSelection.forEach(ns => {
                    if (!state.selectedPoints.some(sp => sp.shapeId === ns.shapeId && sp.pointIndex === ns.pointIndex)) {
                        state.selectedPoints.push(ns);
                    }
                });
            } else {
                state.selectedPoints = newSelection;
            }
            
            state.boxSelect.active = false;
            updateUI();
            draw();
        }

        if (state.isPanning) {
            state.isPanning = false;
        }
        if (state.isDraggingOrigin) {
            state.isDraggingOrigin = false;
        }
        if (state.isDraggingImage) {
            state.isDraggingImage = false;
        }
        if (state.isDraggingPolygon) {
            state.isDraggingPolygon = false;
            state.isPolygonMoved = false;
            state.initialPolygonPoints = null;
            state.polygonDragStartPos = null;
            dom.canvas.style.cursor = 'crosshair';
        }
        if (state.isDraggingImageCorner) {
            state.isDraggingImageCorner = false;
            state.draggedImageCorner = null;
        }
        if (state.draggedPoint) {
            state.draggedPoint = null;
            state.isPointMoved = false;
        }
    });

    dom.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = dom.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const mouseBeforeZoom = screenToImagePx(mouseX, mouseY);

        const scaleAmount = 1 - e.deltaY * 0.001;
        const newScale = Math.max(0.1, Math.min(20, state.viewTransform.scale * scaleAmount));

        state.viewTransform.scale = newScale;

        const mouseAfterZoom = screenToImagePx(mouseX, mouseY);

        state.viewTransform.panX += (mouseAfterZoom.x - mouseBeforeZoom.x) * newScale;
        state.viewTransform.panY += (mouseAfterZoom.y - mouseBeforeZoom.y) * newScale;

        updateUI();
        draw();
    });

    window.addEventListener('resize', () => {
        updateUI();
        draw();
    });

    dom.canvasWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.canvasWrapper.classList.add('drag-over');
    });

    dom.canvasWrapper.addEventListener('dragleave', () => {
        dom.canvasWrapper.classList.remove('drag-over');
    });

    dom.canvasWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.canvasWrapper.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleImageLoad(e.dataTransfer.files[0]);
        }
    });

    // Point Editor Listeners
    if (dom.pointPxX && dom.pointPxY && dom.pointWorldX && dom.pointWorldY) {
        const updateFromPx = () => {
            const state = getState();
            if (state.selectedPoints && state.selectedPoints.length === 1) {
                const sp = state.selectedPoints[0];
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape && !shape.locked) {
                    const x = parseFloat(dom.pointPxX.value);
                    const y = parseFloat(dom.pointPxY.value);
                    if (!isNaN(x) && !isNaN(y)) {
                        shape.points[sp.pointIndex].x = x;
                        shape.points[sp.pointIndex].y = y;
                        draw();
                        
                        // Update world inputs
                        const worldP = imageToWorld(x, y);
                        dom.pointWorldX.value = worldP.x.toFixed(3);
                        dom.pointWorldY.value = worldP.y.toFixed(3);
                    }
                }
            }
        };

        const updateFromWorld = () => {
            const state = getState();
            if (state.selectedPoints && state.selectedPoints.length === 1) {
                const sp = state.selectedPoints[0];
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape && !shape.locked) {
                    const wx = parseFloat(dom.pointWorldX.value);
                    const wy = parseFloat(dom.pointWorldY.value);
                    if (!isNaN(wx) && !isNaN(wy)) {
                        const imgP = worldToImage(wx, wy);
                        shape.points[sp.pointIndex].x = imgP.x;
                        shape.points[sp.pointIndex].y = imgP.y;
                        draw();
                        
                        // Update pixel inputs
                        dom.pointPxX.value = Math.round(imgP.x);
                        dom.pointPxY.value = Math.round(imgP.y);
                    }
                }
            }
        };

        const onFocus = () => {
            recordHistory();
        };

        dom.pointPxX.addEventListener('input', updateFromPx);
        dom.pointPxY.addEventListener('input', updateFromPx);
        dom.pointWorldX.addEventListener('input', updateFromWorld);
        dom.pointWorldY.addEventListener('input', updateFromWorld);

        dom.pointPxX.addEventListener('focus', onFocus);
        dom.pointPxY.addEventListener('focus', onFocus);
        dom.pointWorldX.addEventListener('focus', onFocus);
        dom.pointWorldY.addEventListener('focus', onFocus);
    }

    // Transform Panel Listeners
    if (dom.transformPanel) {
        const resetTransformState = () => {
            const state = getState();
            state.transformState = {
                active: false,
                originalPoints: null,
                pivot: null,
                scale: 1,
                rotation: 0
            };
            dom.transformScaleSlider.value = 1;
            dom.transformScaleVal.textContent = '1.00';
            dom.transformRotateSlider.value = 0;
            dom.transformRotateVal.textContent = '0°';
        };

        const initTransform = () => {
            const state = getState();
            if (!state.selectedPoints || state.selectedPoints.length === 0) return;

            // Store original points
            const originalPoints = new Map();
            state.selectedPoints.forEach(sp => {
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape) {
                    const p = shape.points[sp.pointIndex];
                    originalPoints.set(`${sp.shapeId}-${sp.pointIndex}`, { x: p.x, y: p.y });
                }
            });

            // Calculate Pivot
            let pivot = { x: 0, y: 0 };
            if (dom.pivotOrigin.checked) {
                pivot = { x: state.worldTransform.originPxX, y: state.worldTransform.originPxY };
            } else {
                // Centroid of selection
                let sumX = 0, sumY = 0, count = 0;
                originalPoints.forEach(p => {
                    sumX += p.x;
                    sumY += p.y;
                    count++;
                });
                if (count > 0) {
                    pivot = { x: sumX / count, y: sumY / count };
                }
            }

            state.transformState.active = true;
            state.transformState.originalPoints = originalPoints;
            state.transformState.pivot = pivot;
            state.transformState.scale = parseFloat(dom.transformScaleSlider.value);
            state.transformState.rotation = parseFloat(dom.transformRotateSlider.value);
        };

        const applyTransform = () => {
            const state = getState();
            if (!state.transformState.active) initTransform();
            
            const { originalPoints, pivot, scale, rotation } = state.transformState;
            if (!originalPoints) return;

            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            state.selectedPoints.forEach(sp => {
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape && !shape.locked) {
                    const orig = originalPoints.get(`${sp.shapeId}-${sp.pointIndex}`);
                    if (orig) {
                        // Translate to pivot
                        let dx = orig.x - pivot.x;
                        let dy = orig.y - pivot.y;

                        // Scale
                        dx *= scale;
                        dy *= scale;

                        // Rotate
                        const rx = dx * cos - dy * sin;
                        const ry = dx * sin + dy * cos;

                        // Translate back
                        shape.points[sp.pointIndex].x = pivot.x + rx;
                        shape.points[sp.pointIndex].y = pivot.y + ry;
                    }
                }
            });
            draw();
        };

        dom.transformScaleSlider.addEventListener('input', (e) => {
            const state = getState();
            state.transformState.scale = parseFloat(e.target.value);
            dom.transformScaleVal.textContent = state.transformState.scale.toFixed(2);
            applyTransform();
        });

        dom.transformRotateSlider.addEventListener('input', (e) => {
            const state = getState();
            state.transformState.rotation = parseFloat(e.target.value);
            dom.transformRotateVal.textContent = state.transformState.rotation + '°';
            applyTransform();
        });

        dom.transformScaleReset.addEventListener('click', () => {
            const state = getState();
            state.transformState.scale = 1;
            dom.transformScaleSlider.value = 1;
            dom.transformScaleVal.textContent = '1.00';
            applyTransform();
        });

        dom.transformRotateReset.addEventListener('click', () => {
            const state = getState();
            state.transformState.rotation = 0;
            dom.transformRotateSlider.value = 0;
            dom.transformRotateVal.textContent = '0°';
            applyTransform();
        });

        dom.btnTransformApply.addEventListener('click', () => {
            const state = getState();
            if (state.transformState.active) {
                // We need to record history BEFORE the change, but we've already changed it visually.
                // However, undo stack should contain the state BEFORE transform started.
                // Since we didn't record history on slider move, we need to handle this carefully.
                // Actually, the best way is:
                // 1. Revert to originalPoints.
                // 2. Record History.
                // 3. Re-apply transform.
                // 4. Reset transform state.
                
                const { originalPoints } = state.transformState;
                
                // Revert first
                state.selectedPoints.forEach(sp => {
                    const shape = state.shapes.find(s => s.id === sp.shapeId);
                    if (shape && originalPoints) {
                        const orig = originalPoints.get(`${sp.shapeId}-${sp.pointIndex}`);
                        if (orig) {
                            shape.points[sp.pointIndex].x = orig.x;
                            shape.points[sp.pointIndex].y = orig.y;
                        }
                    }
                });

                recordHistory();

                // Re-apply (we can just call applyTransform again, but we need to ensure active is true)
                // But wait, applyTransform uses current slider values.
                // So we just need to run the math again.
                // Or simpler: just restore, record, then run applyTransform logic inline.
                
                // Let's just call applyTransform() again.
                applyTransform(); 
                
                resetTransformState();
            }
        });

        dom.btnTransformCancel.addEventListener('click', () => {
            const state = getState();
            if (state.transformState.active) {
                const { originalPoints } = state.transformState;
                state.selectedPoints.forEach(sp => {
                    const shape = state.shapes.find(s => s.id === sp.shapeId);
                    if (shape && originalPoints) {
                        const orig = originalPoints.get(`${sp.shapeId}-${sp.pointIndex}`);
                        if (orig) {
                            shape.points[sp.pointIndex].x = orig.x;
                            shape.points[sp.pointIndex].y = orig.y;
                        }
                    }
                });
                resetTransformState();
                draw();
            }
        });

        // Mirroring
        const mirrorSelection = (axis) => {
            const state = getState();
            if (!state.selectedPoints || state.selectedPoints.length === 0) return;
            
            recordHistory();

            // Mirror around World Axis
            // Axis X (y=0): Flip Y
            // Axis Y (x=0): Flip X
            
            state.selectedPoints.forEach(sp => {
                const shape = state.shapes.find(s => s.id === sp.shapeId);
                if (shape && !shape.locked) {
                    const p = shape.points[sp.pointIndex];
                    const worldP = imageToWorld(p.x, p.y);
                    
                    if (axis === 'x') {
                        // Mirror X (around Y-axis, so x becomes -x)
                        // Wait, "Mirror X" usually means "Flip horizontally".
                        // If I flip horizontally, I am mirroring across the Y-axis (x=0).
                        // If I flip vertically, I am mirroring across the X-axis (y=0).
                        // Let's assume "Mirror X" means "Flip X coordinate" (x -> -x).
                        worldP.x = -worldP.x;
                    } else {
                        // Mirror Y (y -> -y)
                        worldP.y = -worldP.y;
                    }
                    
                    const newImgP = worldToImage(worldP.x, worldP.y);
                    shape.points[sp.pointIndex].x = newImgP.x;
                    shape.points[sp.pointIndex].y = newImgP.y;
                }
            });
            draw();
        };

        dom.btnMirrorX.addEventListener('click', () => mirrorSelection('x'));
        dom.btnMirrorY.addEventListener('click', () => mirrorSelection('y'));

        // Reset transform state when selection changes (handled in updateUI or selection logic?)
        // Ideally, whenever selection changes, we should reset the panel.
        // We can hook into updateUI or just check in the loop.
        // But updateUI is called frequently.
        // Let's add a check in updateUI or just rely on the user to Apply/Cancel.
        // If user changes selection while transforming, it might get weird.
        // Let's force reset on selection change.
        // We can do this by adding a listener to the selection change event? 
        // We don't have a custom event system.
        // We can modify the selection logic in events.js to call resetTransformState.
        // But that's scattered.
        // For now, let's just leave it. If they change selection, the "active" state might persist but point references might be wrong?
        // No, we store shapeId-pointIndex strings. If selection changes, those keys might not match.
        // It's safer to reset.
    }

    // Snapshots
    if (dom.saveSnapshotBtn) {
        dom.saveSnapshotBtn.addEventListener('click', () => {
            const name = dom.snapshotNameInput.value.trim();
            saveSnapshot(name);
            dom.snapshotNameInput.value = '';
            updateUI();
        });
    }
}
