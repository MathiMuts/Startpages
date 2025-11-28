import { API } from './api.js';
import { UI } from './ui.js';

let sectionSortable = null;
let linkSortables = [];

export const DragDrop = {
    init: (isEditMode) => {
        const gridContainer = document.getElementById('grid-container');
        const linkContainers = document.querySelectorAll('.section-links');

        if (gridContainer) {
            sectionSortable = new Sortable(gridContainer, {
                animation: 400,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                swapThreshold: 0.5,
                direction: 'horizontal',
                disabled: !isEditMode,
                draggable: ".draggable-section",
                handle: '.section-header',
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                filter: ".add-section-btn",
                preventOnFilter: false,
                onStart: function() { 
                    document.body.classList.add('dragging-active'); 
                    document.body.style.overflow = 'hidden';
                },
                onEnd: function (evt) { 
                    document.body.classList.remove('dragging-active');
                    document.body.style.overflow = '';
                    const sections = gridContainer.querySelectorAll('.draggable-section');
                    const ids = Array.from(sections).map(sec => sec.getAttribute('data-id'));
                    API.updateSectionOrder(ids);
                }
            });
        }

        linkContainers.forEach(container => DragDrop.initSingleLinkSortable(container, isEditMode));
    },

    initSingleLinkSortable: (container, isEditMode) => {
        const sortable = new Sortable(container, {
            group: 'links', 
            animation: 200,
            easing: "cubic-bezier(1, 0, 0, 1)",
            disabled: !isEditMode,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            ghostClass: 'sortable-ghost',
            onMove: function (evt) { return evt.from === evt.to || !evt.to.classList.contains('section-full'); },
            onStart: function() { 
                document.body.classList.add('dragging-active', 'dragging-link-active'); 
            },
            onEnd: function (evt) {
                document.body.classList.remove('dragging-active', 'dragging-link-active');
                UI.checkLinkLimit(evt.from);
                if (evt.from !== evt.to) UI.checkLinkLimit(evt.to);
                
                const links = evt.to.querySelectorAll('.draggable-link');
                const ids = Array.from(links).map(link => link.getAttribute('data-id'));
                API.updateLinkOrder(evt.to.getAttribute('data-section-id'), ids);
            }
        });
        linkSortables.push(sortable);
    },

    toggleEditMode: (enable) => {
        if (sectionSortable) sectionSortable.option("disabled", !enable);
        linkSortables.forEach(s => s.option("disabled", !enable));
    }
};