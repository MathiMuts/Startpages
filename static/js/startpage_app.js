import { API } from './modules/api.js';
import { UI } from './modules/ui.js';
import { DragDrop } from './modules/drag-drop.js';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.section-links').forEach(container => UI.checkLinkLimit(container));
    UI.checkSectionEmptyState();
    DragDrop.init(isEditMode);
    initInteractionListeners();
    initModalLogic();
});

let isEditMode = false;
let longPressTimer;
let ignoreNextClick = false;
let clickStartTime = 0;

function initInteractionListeners() {
    const appContainer = document.body;
    const startHandler = (e) => { clickStartTime = Date.now(); handleStartPress(e); };

    appContainer.addEventListener('mousedown', startHandler);
    appContainer.addEventListener('touchstart', startHandler, { passive: true });
    ['mouseup', 'mouseleave', 'touchend', 'touchmove'].forEach(evt => appContainer.addEventListener(evt, handleCancelPress));

    appContainer.addEventListener('click', (e) => {
        if (ignoreNextClick) { ignoreNextClick = false; e.preventDefault(); e.stopPropagation(); return; }
        if (e.target.closest('.static-add-btn') || e.target.closest('.add-section-btn')) return;
        if (!isEditMode) return;
        if ((Date.now() - clickStartTime) > 200) return;

        const sectionEl = e.target.closest('.draggable-section');
        const linkEl = e.target.closest('.draggable-link');
        
        if (e.target.closest('#edit-modal-card')) return;

        if (linkEl) {
            e.preventDefault(); e.stopPropagation(); 
            openEditModal('link', linkEl.getAttribute('data-id'));
        } else if (sectionEl) {
            e.preventDefault();
            openEditModal('section', sectionEl.getAttribute('data-id'));
        } else if (!e.target.closest('#edit-modal') && !e.target.closest('button')) {
            toggleEditMode(false);
        }
    });
}

function handleStartPress(e) {
    if (isEditMode) return;
    if (!e.target.closest('.draggable-section') && !e.target.closest('.draggable-link')) return;
    longPressTimer = setTimeout(() => { toggleEditMode(true); ignoreNextClick = true; }, 800);
}

function handleCancelPress() { clearTimeout(longPressTimer); }

function toggleEditMode(enable) {
    isEditMode = enable;
    const body = document.body;
    const modeIndicator = document.getElementById('mode-indicator');
    
    if (enable) {
        body.classList.add('edit-mode-active');
        if(modeIndicator) modeIndicator.innerText = "Edit Mode Active";
    } else {
        body.classList.remove('edit-mode-active');
        if(modeIndicator) modeIndicator.innerText = "Hold any item to Edit";
    }
    DragDrop.toggleEditMode(enable);
}

// --- Modals ---
function initModalLogic() {
    const form = document.getElementById('edit-form');
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('edit-type').value;
            const formEl = document.getElementById('edit-form');
            const formData = Object.fromEntries(new FormData(formEl).entries());

            if (type === 'new_link') {
                API.addLink({section_id: formData.id, name: formData.name, url: formData.url, color: formData.color})
                   .then(res => { if(res.status ==='success') { closeEditModal(); UI.appendNewLink(formData.id, res.link); showToast('Link added'); }});
            } else if (type === 'new_section') {
                API.addSection(formData.name)
                   .then(res => { if(res.status ==='success') { closeEditModal(); const newCont = UI.appendNewSection(res.section); DragDrop.initSingleLinkSortable(newCont, true); showToast('Section created'); }});
            } else {
                API.saveItem(formData).then(res => { if(res.status ==='success') { closeEditModal(); UI.updateUiItem(formData); showToast('Saved'); }});
            }
        });
    }
    
    // Setup Delete Button Hold
    const delBtn = document.getElementById('btn-delete');
    if(delBtn) {
        let timer;
        const start = () => {
            document.getElementById('btn-delete-text').innerText = "Hold...";
            document.getElementById('btn-delete-fill').style.width = '100%';
            timer = setTimeout(() => {
                API.deleteItem(document.getElementById('edit-type').value, document.getElementById('edit-id').value)
                   .then(res => { if(res.status==='success'){ closeEditModal(); UI.removeItemFromDom(document.getElementById('edit-type').value, document.getElementById('edit-id').value); showToast('Deleted'); }});
            }, 1500);
        };
        const end = () => { clearTimeout(timer); document.getElementById('btn-delete-fill').style.width = '0%'; document.getElementById('btn-delete-text').innerText = "Delete"; };
        
        delBtn.addEventListener('mousedown', start);
        delBtn.addEventListener('touchstart', start);
        delBtn.addEventListener('mouseup', end);
        delBtn.addEventListener('mouseleave', end);
        delBtn.addEventListener('touchend', end);
    }
}

// --- Exports to Global Scope for HTML onclick ---
window.openEditModal = (type, id) => {
    const modal = document.getElementById('edit-modal');
    document.getElementById('modal-title').innerText = type === 'section' ? 'Edit Section' : 'Edit Link';
    document.getElementById('btn-delete').classList.remove('hidden');
    document.getElementById('btn-cancel').classList.add('hidden');
    document.getElementById('edit-type').value = type;
    document.getElementById('edit-id').value = id;

    API.getItem(type, id).then(data => {
        document.getElementById('edit-name').value = data.name;
        if (type === 'link') {
            document.getElementById('url-field-group').style.display = 'block';
            document.getElementById('color-field-group').style.visibility = 'visible';
            document.getElementById('edit-url').value = data.url;
            document.getElementById('edit-color').value = data.color || '';
            UI.sanitizeColorInput(document.getElementById('edit-color'));
        } else {
            document.getElementById('url-field-group').style.display = 'none';
            document.getElementById('color-field-group').style.visibility = 'hidden';
        }
        modal.classList.remove('hidden');
    });
};

window.openAddLinkModal = (sectionId) => {
    document.getElementById('modal-title').innerText = 'Add New Link';
    document.getElementById('edit-id').value = sectionId;
    document.getElementById('edit-type').value = 'new_link';
    document.getElementById('btn-delete').classList.add('hidden');
    document.getElementById('btn-cancel').classList.remove('hidden');
    document.getElementById('edit-name').value = '';
    document.getElementById('edit-url').value = '';
    document.getElementById('edit-color').value = '';
    UI.sanitizeColorInput(document.getElementById('edit-color'));
    document.getElementById('url-field-group').style.display = 'block';
    document.getElementById('color-field-group').style.visibility = 'visible';
    document.getElementById('edit-modal').classList.remove('hidden');
    toggleEditMode(true);
};

window.openAddSectionModal = () => {
    document.getElementById('modal-title').innerText = 'Add New Section';
    document.getElementById('edit-type').value = 'new_section';
    document.getElementById('btn-delete').classList.add('hidden');
    document.getElementById('btn-cancel').classList.remove('hidden');
    document.getElementById('edit-name').value = '';
    document.getElementById('url-field-group').style.display = 'none';
    document.getElementById('color-field-group').style.visibility = 'hidden';
    document.getElementById('edit-modal').classList.remove('hidden');
    toggleEditMode(true);
};

window.closeEditModal = () => document.getElementById('edit-modal').classList.add('hidden');
window.sanitizeColorInput = UI.sanitizeColorInput;
window.openAllLinksInSection = (trigger) => {
    const section = trigger.closest('section');
    if (section) section.querySelectorAll('.section-links a').forEach(link => { if (link.href) window.open(link.href, '_blank'); });
};