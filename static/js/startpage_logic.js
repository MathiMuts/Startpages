document.addEventListener('DOMContentLoaded', () => {
    // Initialize Logic
    document.querySelectorAll('.section-links').forEach(container => {
        checkLinkLimit(container);
    });

    checkSectionEmptyState();
    initSortables();
    initInteractionListeners();
    initModalLogic();
});

// State Variables
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
            // Animation Physics
            animation: 400, // Duration of the translation
            easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Smooth ease-out effect
            
            // Grid Behavior
            swapThreshold: 0.5, // Swap when 50% overlapping (better for grids)
            direction: 'horizontal', // Helps logic in wrapping grids
            
            // Interaction
            disabled: true, 
            draggable: ".draggable-section",
            handle: '.section-header', // Drag via header only
            
            // Classes
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            
            // Filter
            filter: ".add-section-btn",
            preventOnFilter: false,
            
            onStart: function() { 
                document.body.classList.add('dragging-active'); 
                // Fix for mobile scrolling while dragging
                document.body.style.overflow = 'hidden';
            },
            onEnd: function (evt) { 
                document.body.classList.remove('dragging-active');
                document.body.style.overflow = '';
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
        animation: 200,
        easing: "cubic-bezier(1, 0, 0, 1)",
        disabled: !isEditMode, 
        fallbackOnBody: true, // Helps with z-index issues inside overflow containers
        swapThreshold: 0.65,
        ghostClass: 'sortable-ghost',
        
        onMove: function (evt) {
            // Prevent dropping into a full section
            return evt.from === evt.to || !evt.to.classList.contains('section-full');
        },
        onStart: function() { document.body.classList.add('dragging-active'); },
        onEnd: function (evt) {
            document.body.classList.remove('dragging-active');
            checkLinkLimit(evt.from);
            if (evt.from !== evt.to) checkLinkLimit(evt.to);
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
    const appContainer = document.body;

    const startHandler = (e) => {
        clickStartTime = Date.now();
        handleStartPress(e);
    };

    appContainer.addEventListener('mousedown', startHandler);
    appContainer.addEventListener('touchstart', startHandler, { passive: true });
    
    // Cancel events
    ['mouseup', 'mouseleave', 'touchend', 'touchmove'].forEach(evt => {
        appContainer.addEventListener(evt, handleCancelPress);
    });

    appContainer.addEventListener('click', (e) => {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (e.target.closest('.static-add-btn') || e.target.closest('.add-section-btn')) return;
        
        if (!isEditMode) return;

        const duration = Date.now() - clickStartTime;
        if (duration > 200) return; 

        const sectionEl = e.target.closest('.draggable-section');
        const linkEl = e.target.closest('.draggable-link');
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

        if (!e.target.closest('#edit-modal') && !e.target.closest('button')) {
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

// --- 4. API Calls & Saving ---

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
    }).then(res => { if (!res.ok) res.json().then(data => showToast(data.message, 'error')); });
}

// --- 5. Modal Logic & UI Updates ---

window.sanitizeColorInput = function(input) {
    const colorPreview = document.getElementById('color-preview'); 
    let val = input.value;
    
    if (val.length === 0) {
        if(colorPreview) {
            colorPreview.style.removeProperty('background-color');
            colorPreview.classList.add('bg-primary-500');
        }
        return;
    }

    val = val.toUpperCase();
    if (!val.startsWith('#')) val = '#' + val;
    val = val.replace(/[^#0-9A-F]/g, '');
    if (val.length > 7) val = val.substring(0, 7);
    
    input.value = val;

    if(colorPreview) {
        const hexRegex = /^#([0-9A-F]{3}|[0-9A-F]{6})$/;
        if (hexRegex.test(val)) {
            colorPreview.classList.remove('bg-primary-500');
            colorPreview.style.backgroundColor = val;
        } else {
            colorPreview.style.removeProperty('background-color');
            colorPreview.classList.add('bg-primary-500');
        }
    }
}

function initModalLogic() {
    const form = document.getElementById('edit-form');
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('edit-type').value;
            if (type === 'new_link') saveNewLink();
            else if (type === 'new_section') saveNewSection();
            else saveItemDetails();
        });
    }
    initDeleteButtonLogic();
}

window.openEditModal = function(type, id) {
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('btn-delete');
    const cancelBtn = document.getElementById('btn-cancel');
    const urlGroup = document.getElementById('url-field-group');
    const colorGroup = document.getElementById('color-field-group');
    
    modalTitle.innerText = type === 'section' ? 'Edit Section' : 'Edit Link';
    
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
                colorGroup.style.visibility = 'visible';
                document.getElementById('edit-url').value = data.url;
                document.getElementById('edit-url').required = true;
                
                const colorInput = document.getElementById('edit-color');
                colorInput.value = data.color || ''; 
                sanitizeColorInput(colorInput);
                
            } else {
                urlGroup.style.display = 'none';
                colorGroup.style.visibility = 'hidden';
                document.getElementById('edit-url').required = false;
            }

            modal.classList.remove('hidden');
        })
        .catch(err => console.error(err));
}

window.openAddLinkModal = function(sectionId) {
    const modal = document.getElementById('edit-modal');
    const colorInput = document.getElementById('edit-color'); 
    
    document.getElementById('modal-title').innerText = 'Add New Link';
    document.getElementById('edit-id').value = sectionId;
    document.getElementById('edit-type').value = 'new_link';
    
    document.getElementById('btn-delete').classList.add('hidden');
    document.getElementById('btn-cancel').classList.remove('hidden');

    document.getElementById('edit-name').value = '';
    document.getElementById('edit-url').value = '';
    document.getElementById('edit-url').required = true;
    
    colorInput.value = '';
    sanitizeColorInput(colorInput); 
    
    document.getElementById('url-field-group').style.display = 'block';
    document.getElementById('color-field-group').style.visibility = 'visible';
    
    modal.classList.remove('hidden');
    toggleEditMode(true);
}

window.openAddSectionModal = function() {
    const modal = document.getElementById('edit-modal');
    
    document.getElementById('modal-title').innerText = 'Add New Section';
    document.getElementById('edit-type').value = 'new_section';
    document.getElementById('edit-id').value = ''; 
    
    document.getElementById('btn-delete').classList.add('hidden');
    document.getElementById('btn-cancel').classList.remove('hidden');

    document.getElementById('edit-name').value = '';
    
    document.getElementById('url-field-group').style.display = 'none';
    document.getElementById('color-field-group').style.visibility = 'hidden';
    document.getElementById('edit-url').required = false;
    
    modal.classList.remove('hidden');
    toggleEditMode(true);
}

window.closeEditModal = function() {
    const modal = document.getElementById('edit-modal');
    if(modal) modal.classList.add('hidden');
    resetDeleteButton();
}

// --- HOLD TO DELETE LOGIC ---
let deleteHoldTimer = null;
let isDeleteReady = false;
const HOLD_DURATION = 1500; 

function initDeleteButtonLogic() {
    const btn = document.getElementById('btn-delete');
    if(!btn) return;

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

// --- Deletion & Saving ---

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
        if (el) { el.remove(); checkSectionEmptyState(); }
    } else if (type === 'link') {
        const el = document.querySelector(`.draggable-link[data-id="${id}"]`);
        if (el) {
            const container = el.closest('.section-links');
            el.remove();
            if (container) checkLinkLimit(container);
        }
    }
}

function saveItemDetails() {
    const form = document.getElementById('edit-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (data.type === 'link' && data.url) {
        if (!/^https?:\/\//i.test(data.url)) data.url = 'https://' + data.url;
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
    const color = document.getElementById('edit-color').value;

    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;

    fetch('/api/add-link/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ section_id: sectionId, name: name, url: url, color: color })
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
    .catch((err) => {
        console.error(err);
        showToast('Network error', 'error');
    });
}

// --- DOM Manipulation for New/Updated Items ---

function appendNewLink(sectionId, linkData) {
    const container = document.querySelector(`.section-links[data-section-id="${sectionId}"]`);
    if (!container) return;

    const dotClass = linkData.color ? '' : 'bg-primary-500';
    const textClass = linkData.color ? '' : 'text-primary-500';
    const dotStyle = linkData.color ? `style="background-color: ${linkData.color};"` : '';
    const textStyle = linkData.color ? `style="color: ${linkData.color};"` : '';

    const div = document.createElement('div');
    div.className = "draggable-link relative rounded-md group/link transition-colors duration-200 border border-transparent";
    div.setAttribute('data-id', linkData.id);
    
    div.innerHTML = `
        <a href="${linkData.url}" target="_blank"
           class="edit-mode-disable flex items-center gap-3 px-3 py-2
                  text-gray-600 dark:text-gray-300 
                  hover:bg-primary-50 dark:hover:bg-primary-900/20 
                  hover:text-gray-900 dark:hover:text-white
                  rounded-md transition-colors"
           data-edit-target="name">
           
           <div class="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
               <span class="link-dot absolute w-2 h-2 rounded-full transition-all duration-200 ease-out 
                            group-hover/link:opacity-0 group-hover/link:scale-0 
                            ${dotClass}"
                     ${dotStyle}></span>
               
               <svg class="link-arrow absolute w-4 h-4 transition-all duration-200 ease-out 
                           opacity-0 scale-0 -rotate-45 group-hover/link:rotate-0 
                           group-hover/link:opacity-100 group-hover/link:scale-100 
                           ${textClass}"
                    ${textStyle}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
               </svg>
           </div>
           
           <span class="truncate font-medium text-sm overflow-ellipsis leading-tight pt-0.5">${linkData.name}</span>
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
    const addBtn = grid.querySelector('.add-section-btn');
    
    const section = document.createElement('section');
    section.className = "draggable-section bg-white dark:bg-gray-800 container px-5 pt-4 pb-1 flex flex-col gap-3 rounded-xl text-neutral-900 dark:text-neutral-200 w-full relative group select-none h-[30rem] border-t-4 border-primary-500 dark:border-primary-400 shadow-xl shadow-primary-100/50 dark:shadow-none transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary-200/50 dark:hover:shadow-black/30";
    section.setAttribute('data-id', sectionData.id);

    section.innerHTML = `
    <div class="flex justify-between items-center section-header pb-2 border-b border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing">
        <h2 class="text-xl font-bold truncate pointer-events-none text-gray-800 dark:text-gray-100 tracking-tight" data-edit-target="name">
            ${sectionData.name}
        </h2>
        <a href="#" onclick="openAllLinksInSection(this); return false;" class="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 edit-mode-hidden transition-colors p-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30" title="Open all links">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
           </svg>
        </a>
        <div class="hidden edit-mode-visible text-primary-500 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        </div>
    </div>
    <div class="flex flex-col gap-1 flex-grow overflow-hidden">
        <div class="flex flex-col gap-1.5 min-h-[10px] section-links flex-grow overflow-y-auto overflow-x-visible custom-scrollbar p-1" data-section-id="${sectionData.id}">
            <div id="add-btn-container-${sectionData.id}" class="group/add mt-1">
                <button onclick="openAddLinkModal('${sectionData.id}')"
                        class="static-add-btn w-full text-left cursor-pointer flex items-center gap-3 px-3 py-2 rounded-md border border-transparent text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all flex"
                        title="Add Link">
                    <span class="flex items-center justify-center w-4 h-4">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    </span>
                    <span class="text-sm font-bold opacity-80 group-hover/add:opacity-100 pt-0.5">Add Link</span>
                </button>
            </div>
        </div>
    </div>
    `;

    if (addBtn) {
        grid.insertBefore(section, addBtn);
    } else {
        grid.appendChild(section);
    }

    const newLinkContainer = section.querySelector('.section-links');
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

                const dot = anchor.querySelector('.link-dot');
                const arrow = anchor.querySelector('.link-arrow');
                const pencil = anchor.querySelector('.link-pencil'); 
                
                if (data.color) {
                    if(dot) {
                        dot.style.backgroundColor = data.color;
                        dot.classList.remove('bg-primary-500');
                    }
                    [arrow, pencil].forEach(el => {
                        if(el) {
                            el.style.color = data.color;
                            el.classList.remove('text-primary-500');
                        }
                    });
                } else {
                    if(dot) {
                        dot.style.removeProperty('background-color');
                        dot.classList.add('bg-primary-500');
                    }
                    [arrow, pencil].forEach(el => {
                        if(el) {
                            el.style.removeProperty('color');
                            el.classList.add('text-primary-500');
                        }
                    });
                }
            }
        }
    }
}