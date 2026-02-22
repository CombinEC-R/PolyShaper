import { loadState, saveState } from './state.js';
import { initEventListeners } from './events.js';
import { updateUI } from './dom.js';
import { draw } from './canvas.js';

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initEventListeners();
    updateUI();
    draw();

    window.addEventListener('beforeunload', saveState);
});
