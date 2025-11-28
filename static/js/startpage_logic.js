// startpages/static/js/startpage_logic.js

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.section-links').forEach(container => {
        checkLinkLimit(container);
    });

    checkSectionEmptyState();

    initSortables();
    initInteractionListeners();
    initModalLogic();
});

let isEditMode = false;
let sectionSortable = null;
let linkSortables = [];
let longPressTimer;
let ignoreNextClick = false;
let clickStartTime = 0; 

// --- 1. CSRF Token Helper ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

// --- 2. Sortable.js Initialization ---
function initSortables() {
    const gridContainer = document.getElementById('grid-container');
    const linkContainers = document.querySelectorAll('.section-links');

    if (gridContainer) {
        sectionSortable = new Sortable(gridContainer, {
            animation: 350,
            disabled: true, 
            draggable: ".draggable-section",
            handle: '.section-header',
            ghostClass: 'sortable-ghost',
            filter: ".add-section-btn",
            preventOnFilter: false,
            onEnd: function (evt) {
                saveSectionOrder();
            }
        });
    }

    linkContainers.forEach(container => {
        initSingleLinkSortable(container);
    });
}

function initSingleLinkSortable(container) {
    const sortable = new Sortable(container, {
        group: 'links', 
        animation: 150,
        disabled: !isEditMode, 
        fallbackOnBody: true,
        swapThreshold: 0.65,
        ghostClass: 'sortable-ghost',
        
        onMove: function (evt) {
            if (evt.from === evt.to) return true;
            if (evt.to.classList.contains('section-full')) {
                return false; 
            }
            return true;
        },

        onStart: function() {
            document.body.classList.add('dragging-active');
        },
        onEnd: function (evt) {
            document.body.classList.remove('dragging-active');
            
            checkLinkLimit(evt.from);
            if (evt.from !== evt.to) {
                checkLinkLimit(evt.to);
            }

            saveLinkOrder(evt.to.getAttribute('data-section-id'), evt.to);
        }
    });
    linkSortables.push(sortable);
}

function checkLinkLimit(container) {
    if (!container) return;
    const sectionId = container.getAttribute('data-section-id');
    const count = container.querySelectorAll('.draggable-link').length;
    
    const addBtn = document.querySelector(`#add-btn-container-${sectionId} .static-add-btn`);
    
    if (addBtn) {
        if (count >= 10) {
            addBtn.style.setProperty('display', 'none', 'important');
            container.classList.add('section-full');
        } else {
            addBtn.style.removeProperty('display');
            container.classList.remove('section-full');
            
            if (count === 0) {
                addBtn.classList.remove('hidden', 'edit-mode-visible');
                addBtn.classList.add('flex');
            } else {
                addBtn.classList.add('hidden', 'edit-mode-visible');
                addBtn.classList.remove('flex');
            }
        }
    }
}

function checkSectionEmptyState() {
    const grid = document.getElementById('grid-container');
    if (!grid) return;
    
    const count = grid.querySelectorAll('.draggable-section').length;
    const addSectionBtn = grid.querySelector('.add-section-btn');
    
    if (addSectionBtn) {
        if (count === 0) {
            addSectionBtn.classList.remove('hidden', 'edit-mode-visible');
            addSectionBtn.classList.add('flex');
        } else {
            addSectionBtn.classList.add('hidden', 'edit-mode-visible');
            addSectionBtn.classList.remove('flex');
        }
    }
}

// --- 3. Interaction Logic ---
function initInteractionListeners() {
    const appContainer = document.querySelector('body');

    const startHandler = (e) => {
        clickStartTime = Date.now();
        handleStartPress(e);
    };

    appContainer.addEventListener('mousedown', startHandler);
    appContainer.addEventListener('touchstart', startHandler, { passive: true });

    appContainer.addEventListener('mouseup', handleCancelPress);
    appContainer.addEventListener('mouseleave', handleCancelPress);
    appContainer.addEventListener('touchend', handleCancelPress);
    appContainer.addEventListener('touchmove', handleCancelPress);

    appContainer.addEventListener('click', (e) => {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (e.target.closest('.static-add-btn') || e.target.closest('.add-section-btn')) {
            return;
        }
        
        if (!isEditMode) return;

        const duration = Date.now() - clickStartTime;
        if (duration > 200) {
            return; 
        }

        const sectionEl = e.target.closest('.draggable-section');
        const linkEl = e.target.closest('.draggable-link');
        
        const isModal = e.target.closest('#edit-modal');
        const isModalCard = e.target.closest('#edit-modal-card'); 

        if (isModalCard) return;

        if (linkEl) {
            e.preventDefault();
            e.stopPropagation(); 
            openEditModal('link', linkEl.getAttribute('data-id'));
            return;
        }

        if (sectionEl) {
            e.preventDefault();
            openEditModal('section', sectionEl.getAttribute('data-id'));
            return;
        } 

        if (!isModal && !e.target.closest('button')) {
            toggleEditMode(false);
        }
    });
}

function handleStartPress(e) {
    if (isEditMode) return; 
    
    if (!e.target.closest('.draggable-section') && !e.target.closest('.draggable-link')) return;

    longPressTimer = setTimeout(() => {
        toggleEditMode(true);
        ignoreNextClick = true; 
    }, 800); 
}

function handleCancelPress() {
    clearTimeout(longPressTimer);
}

function toggleEditMode(enable) {
    isEditMode = enable;
    const body = document.body;
    const modeIndicator = document.getElementById('mode-indicator');

    if (enable) {
        body.classList.add('edit-mode-active');
        if(modeIndicator) modeIndicator.innerText = "Edit Mode Active";
        
        if (sectionSortable) sectionSortable.option("disabled", false);
        linkSortables.forEach(s => s.option("disabled", false));
    } else {
        body.classList.remove('edit-mode-active');
        if(modeIndicator) modeIndicator.innerText = "Hold any item to Edit";
        
        if (sectionSortable) sectionSortable.option("disabled", true);
        linkSortables.forEach(s => s.option("disabled", true));
    }
}

// --- 4. API Calls ---

function saveSectionOrder() {
    const grid = document.getElementById('grid-container');
    const sections = grid.querySelectorAll('.draggable-section');
    const ids = Array.from(sections).map(sec => sec.getAttribute('data-id'));

    fetch('/api/update-section-order/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ ids: ids })
    });
}

function saveLinkOrder(sectionId, container) {
    const links = container.querySelectorAll('.draggable-link');
    const ids = Array.from(links).map(link => link.getAttribute('data-id'));

    fetch('/api/update-link-order/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ section_id: sectionId, link_ids: ids })
    })
    .then(res => {
        if (!res.ok) {
            res.json().then(data => showToast(data.message, 'error'));
        }
    });
}

// --- 5. Modal Logic & UI Updates ---

const modal = document.getElementById('edit-modal');
const form = document.getElementById('edit-form');
const urlGroup = document.getElementById('url-field-group');
const modalTitle = document.getElementById('modal-title');
const deleteBtn = document.getElementById('btn-delete');
const cancelBtn = document.getElementById('btn-cancel');

function initModalLogic() {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.getElementById('edit-type').value;
        if (type === 'new_link') {
            saveNewLink();
        } else if (type === 'new_section') {
            saveNewSection();
        } else {
            saveItemDetails();
        }
    });

    initDeleteButtonLogic();
}

function openEditModal(type, id) {
    modalTitle.innerText = type === 'section' ? 'Edit Section' : 'Edit Link';
    
    // SWAP BUTTONS: Show Delete, Hide Cancel
    deleteBtn.classList.remove('hidden');
    cancelBtn.classList.add('hidden');
    
    fetch(`/api/get-item-details/?type=${type}&id=${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-type').value = data.type;
            document.getElementById('edit-name').value = data.name;

            if (type === 'link') {
                urlGroup.style.display = 'block';
                document.getElementById('edit-url').value = data.url;
                document.getElementById('edit-url').required = true;
            } else {
                urlGroup.style.display = 'none';
                document.getElementById('edit-url').required = false;
            }

            modal.classList.remove('hidden');
        })
        .catch(err => console.error(err));
}

window.openAddLinkModal = function(sectionId) {
    modalTitle.innerText = 'Add New Link';
    document.getElementById('edit-id').value = sectionId;
    document.getElementById('edit-type').value = 'new_link';
    
    // SWAP BUTTONS: Hide Delete, Show Cancel
    deleteBtn.classList.add('hidden');
    cancelBtn.classList.remove('hidden');

    document.getElementById('edit-name').value = '';
    document.getElementById('edit-url').value = '';
    document.getElementById('edit-url').required = true;
    urlGroup.style.display = 'block';
    
    modal.classList.remove('hidden');
    toggleEditMode(true);
}

window.openAddSectionModal = function() {
    modalTitle.innerText = 'Add New Section';
    document.getElementById('edit-type').value = 'new_section';
    document.getElementById('edit-id').value = ''; 
    
    // SWAP BUTTONS: Hide Delete, Show Cancel
    deleteBtn.classList.add('hidden');
    cancelBtn.classList.remove('hidden');

    document.getElementById('edit-name').value = '';
    
    urlGroup.style.display = 'none';
    document.getElementById('edit-url').required = false;
    
    modal.classList.remove('hidden');
    toggleEditMode(true);
}

function closeEditModal() {
    modal.classList.add('hidden');
    resetDeleteButton();
}

// --- HOLD TO DELETE LOGIC ---

let deleteHoldTimer = null;
let isDeleteReady = false;
const HOLD_DURATION = 1500; 

function initDeleteButtonLogic() {
    const btn = document.getElementById('btn-delete');
    
    btn.addEventListener('mousedown', handleHoldStart);
    btn.addEventListener('mouseup', handleHoldEnd);
    btn.addEventListener('mouseleave', handleHoldCancel);
    
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleHoldStart(e); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); handleHoldEnd(e); });
}

function handleHoldStart(e) {
    if (e.button !== 0 && e.type !== 'touchstart') return; 

    const btn = document.getElementById('btn-delete');
    const fill = document.getElementById('btn-delete-fill');
    const text = document.getElementById('btn-delete-text');

    isDeleteReady = false;
    
    text.innerText = "Hold...";
    text.classList.add('text-red-700', 'dark:text-white');

    fill.style.transition = `width ${HOLD_DURATION}ms linear`;
    fill.style.width = '100%';
    fill.classList.remove('opacity-20'); 
    fill.classList.add('opacity-100');

    deleteHoldTimer = setTimeout(() => {
        isDeleteReady = true;
        text.innerText = "Delete!";
        btn.classList.add('scale-105');
    }, HOLD_DURATION);
}

function handleHoldEnd(e) {
    if (isDeleteReady) {
        deleteItem();
        resetDeleteButton(); 
    } else {
        handleHoldCancel();
    }
}

function handleHoldCancel() {
    clearTimeout(deleteHoldTimer);
    isDeleteReady = false;
    resetDeleteButton();
}

function resetDeleteButton() {
    const btn = document.getElementById('btn-delete');
    const fill = document.getElementById('btn-delete-fill');
    const text = document.getElementById('btn-delete-text');

    clearTimeout(deleteHoldTimer);

    if (fill) {
        fill.style.transition = 'width 0.2s ease-out';
        fill.style.width = '0%';
        fill.classList.remove('opacity-100');
        fill.classList.add('opacity-20');
    }

    if (text) {
        text.innerText = "Delete";
        text.classList.remove('text-red-700', 'dark:text-white');
    }
    
    if (btn) btn.classList.remove('scale-105');
}

// --- Deletion Logic ---

window.deleteItem = function() {
    const type = document.getElementById('edit-type').value;
    const id = document.getElementById('edit-id').value;
    
    const btnText = document.getElementById('btn-delete-text');
    if(btnText) btnText.innerText = "Deleting...";

    fetch('/api/delete-item/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ type: type, id: id })
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            closeEditModal();
            removeItemFromDom(type, id);
            showToast('Deleted successfully');
        } else {
            showToast('Error deleting item', 'error');
            resetDeleteButton();
        }
    })
    .catch(() => {
        showToast('Network error', 'error');
        resetDeleteButton();
    });
}

function removeItemFromDom(type, id) {
    if (type === 'section') {
        const el = document.querySelector(`.draggable-section[data-id="${id}"]`);
        if (el) {
            el.remove();
            checkSectionEmptyState();
        }
    } else if (type === 'link') {
        const el = document.querySelector(`.draggable-link[data-id="${id}"]`);
        if (el) {
            const container = el.closest('.section-links');
            el.remove();
            if (container) checkLinkLimit(container);
        }
    }
}

// --- Saving Logic ---

function saveItemDetails() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Protocol Check
    if (data.type === 'link' && data.url) {
        if (!/^https?:\/\//i.test(data.url)) {
            data.url = 'https://' + data.url;
        }
    }

    fetch('/api/save-item-details/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            closeEditModal();
            updateUiItem(data);
            showToast('Saved successfully!');
        } else {
            showToast('Error saving item', 'error');
        }
    })
    .catch(() => showToast('Network error', 'error'));
}

function saveNewLink() {
    const sectionId = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    let url = document.getElementById('edit-url').value;

    // Protocol Check
    if (url && !/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    fetch('/api/add-link/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ section_id: sectionId, name: name, url: url })
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            closeEditModal();
            appendNewLink(sectionId, response.link);
            showToast('Link added successfully!');
        } else {
            showToast(response.message || 'Error adding link', 'error');
        }
    })
    .catch(() => showToast('Network error', 'error'));
}

function saveNewSection() {
    const name = document.getElementById('edit-name').value;

    fetch('/api/add-section/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ name: name })
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            closeEditModal();
            appendNewSection(response.section);
            showToast('Section created successfully!');
        } else {
            showToast(response.message || 'Error adding section', 'error');
        }
    })
    .catch(() => showToast('Network error', 'error'));
}

function appendNewLink(sectionId, linkData) {
    const container = document.querySelector(`.section-links[data-section-id="${sectionId}"]`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = "draggable-link relative rounded-md group/link transition-all duration-200 border border-transparent";
    div.setAttribute('data-id', linkData.id);
    
    div.innerHTML = `
        <a href="${linkData.url}" target="_blank"
           class="edit-mode-disable flex items-center gap-2 px-3 py-1.5 
                  text-gray-600 dark:text-gray-300 
                  hover:bg-primary-50 dark:hover:bg-primary-900/20 
                  hover:text-primary-700 dark:hover:text-primary-300
                  rounded-md transition-colors"
           data-edit-target="name">
           <span class="text-primary-400 opacity-0 -ml-2 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all duration-200 text-xs font-bold">›</span>
           <span class="truncate font-medium text-sm overflow-ellipsis">${linkData.name}</span>
        </a>
        <div class="absolute inset-0 hidden edit-mode-overlay cursor-grab active:cursor-grabbing z-10 bg-white/10"></div>
    `;

    const btnContainer = document.getElementById(`add-btn-container-${sectionId}`);
    if (btnContainer) {
        container.insertBefore(div, btnContainer);
    } else {
        container.appendChild(div);
    }
    
    checkLinkLimit(container);
}

function appendNewSection(sectionData) {
    const grid = document.getElementById('grid-container');
    const addButton = document.querySelector('.add-section-btn'); 

    const sectionEl = document.createElement('section');
    
    sectionEl.className = `
           draggable-section 
           bg-white dark:bg-gray-800 
           container px-5 pt-4 pb-1 flex flex-col gap-3 rounded-xl
           text-neutral-900 dark:text-neutral-200 w-full relative group
           select-none h-[30rem]
           border-t-4 border-primary-500 dark:border-primary-400
           shadow-xl shadow-primary-100/50 dark:shadow-none
           transition-all duration-300 hover:shadow-2xl hover:shadow-primary-200/50 dark:hover:shadow-black/30
    `;
    sectionEl.setAttribute('data-id', sectionData.id);

    sectionEl.innerHTML = `
        <div class="flex justify-between items-center section-header pb-2 border-b border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing">
            <h2 class="text-xl font-bold truncate pointer-events-none text-gray-800 dark:text-gray-100 tracking-tight" data-edit-target="name">
                ${sectionData.name}
            </h2>
            <a href="#" onclick="openAllLinksInSection(this); return false;" 
               class="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 edit-mode-hidden transition-colors p-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            <div class="hidden edit-mode-visible text-primary-500 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
        </div>

        <div class="flex flex-col gap-1 flex-grow overflow-hidden">
            <div class="flex flex-col gap-1.5 min-h-[10px] section-links flex-grow overflow-y-auto overflow-x-visible custom-scrollbar p-1" data-section-id="${sectionData.id}">
                <div id="add-btn-container-${sectionData.id}" class="group/add">
                    <button onclick="openAddLinkModal('${sectionData.id}')"
                            class="static-add-btn w-full text-left hidden edit-mode-visible cursor-pointer items-center gap-2 px-3 py-1.5 rounded-md border border-transparent text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all">
                        <span class="flex items-center justify-center w-4 h-4 -ml-0.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                        </span>
                        <span class="text-sm font-bold opacity-80 group-hover/add:opacity-100">Add Link</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    if (addButton) {
        grid.insertBefore(sectionEl, addButton);
    } else {
        grid.appendChild(sectionEl);
    }
    
    const newLinkContainer = sectionEl.querySelector('.section-links');
    initSingleLinkSortable(newLinkContainer);

    checkSectionEmptyState();
}

function updateUiItem(data) {
    if (data.type === 'section') {
        const section = document.querySelector(`.draggable-section[data-id="${data.id}"]`);
        if (section) {
            const titleEl = section.querySelector('h2');
            if(titleEl) titleEl.innerText = data.name;
        }
    } else if (data.type === 'link') {
        const linkWrapper = document.querySelector(`.draggable-link[data-id="${data.id}"]`);
        if (linkWrapper) {
            const anchor = linkWrapper.querySelector('a');
            if (anchor) {
                const textSpan = anchor.querySelector('.truncate');
                if(textSpan) textSpan.innerText = data.name;
                
                anchor.href = data.url;
            }
        }
    }
}

// NOTE: showToast function is now in _base.html to be global
window.closeEditModal = closeEditModal;