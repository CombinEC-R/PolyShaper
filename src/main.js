import { loadState, saveState, getState } from './state.js';
import { initEventListeners } from './events.js';
import { updateUI, initDom } from './dom.js';
import { draw } from './canvas.js';

document.addEventListener('DOMContentLoaded', () => {
    initDom();
    loadState();
    initEventListeners();
    updateUI();
    draw();

    window.addEventListener('beforeunload', (e) => {
        saveState();
        const state = getState();
        if (state.isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});
