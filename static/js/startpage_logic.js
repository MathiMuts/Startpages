document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize logic to mark full sections immediately on load
    document.querySelectorAll('.section-links').forEach(container => {
        checkLinkLimit(container);
    });

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
            animation: 150,
            disabled: true, 
            handle: '.section-header', 
            onEnd: function (evt) {
                saveSectionOrder();
            }
        });
    }

    linkContainers.forEach(container => {
        const sortable = new Sortable(container, {
            group: 'links', 
            animation: 150,
            disabled: true, 
            fallbackOnBody: true,
            swapThreshold: 0.65,
            ghostClass: 'sortable-ghost',
            
            // --- BLOCK DROPPING IF FULL ---
            onMove: function (evt) {
                if (evt.from === evt.to) return true;

                // If target list is marked as full, block entry
                if (evt.to.classList.contains('section-full')) {
                    return false; 
                }
                
                return true;
            },

            // Track Dragging State for CSS
            onStart: function() {
                document.body.classList.add('dragging-active');
            },
            onEnd: function (evt) {
                document.body.classList.remove('dragging-active');
                
                const targetList = evt.to; 
                const sectionId = targetList.getAttribute('data-section-id');
                
                // Update State (Button visibility + Full Class)
                checkLinkLimit(evt.from);
                if (evt.from !== evt.to) {
                    checkLinkLimit(evt.to);
                }

                saveLinkOrder(sectionId, targetList);
            }
        });
        linkSortables.push(sortable);
    });
}

// Logic to check limits and update UI classes
function checkLinkLimit(container) {
    if (!container) return;
    const sectionId = container.getAttribute('data-section-id');
    const count = container.querySelectorAll('.draggable-link').length;
    
    const addBtn = document.querySelector(`#add-btn-container-${sectionId} .static-add-btn`);
    
    // 1. Handle visibility limit (Max 10)
    // If full, hide EVERYTHING (button) regardless of drag state
    if (count >= 10) {
        if (addBtn) addBtn.style.setProperty('display', 'none', 'important');
        container.classList.add('section-full');
    } else {
        // If not full, remove inline styles so CSS classes (dragging-active) can take over
        if (addBtn) addBtn.style.removeProperty('display');
        container.classList.remove('section-full');
    }
}

// --- 3. Interaction Logic ---
function initInteractionListeners() {
    const appContainer = document.querySelector('body');

    // Start press: Track time for Short Click vs Long Hold logic
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
        // 1. Prevent 'mouseup' from a long press entering edit mode from triggering a click immediately
        if (ignoreNextClick) {
            ignoreNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Add Button Click (Handled via onclick attribute, but ensure propagation stops if needed)
        if (e.target.closest('.static-add-btn')) {
            return;
        }

        if (!isEditMode) return;

        // 2. Logic: If click duration > 200ms, it was a drag, NOT a click. Do not open modal.
        const duration = Date.now() - clickStartTime;
        if (duration > 200) {
            return; 
        }

        const sectionEl = e.target.closest('.draggable-section');
        const linkEl = e.target.closest('.draggable-link');
        
        // Modal Check:
        const isModal = e.target.closest('#edit-modal');
        const isModalCard = e.target.closest('#edit-modal-card'); 

        // CRITICAL: If we are interacting with the modal card, DO NOTHING.
        if (isModalCard) {
            return;
        }

        // CASE A: Clicked on a Link -> Edit Link
        if (linkEl) {
            e.preventDefault();
            e.stopPropagation(); 
            openEditModal('link', linkEl.getAttribute('data-id'));
            return;
        }

        // CASE B: Clicked ANYWHERE on a Section (that isn't a link) -> Edit Section
        if (sectionEl) {
            e.preventDefault();
            openEditModal('section', sectionEl.getAttribute('data-id'));
            return;
        } 

        // CASE C: Exit Edit Mode if background clicked
        if (!isModal) {
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

function initModalLogic() {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.getElementById('edit-type').value;
        if (type === 'new_link') {
            saveNewLink();
        } else {
            saveItemDetails();
        }
    });
}

// Open modal for editing existing items
function openEditModal(type, id) {
    modalTitle.innerText = type === 'section' ? 'Edit Section' : 'Edit Link';
    
    fetch(`/api/get-item-details/?type=${type}&id=${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-type').value = data.type;
            document.getElementById('edit-name').value = data.name;

            if (type === 'link') {
                urlGroup.style.display = 'block';
                document.getElementById('edit-url').value = data.url;
            } else {
                urlGroup.style.display = 'none';
            }

            modal.classList.remove('hidden');
        })
        .catch(err => console.error(err));
}

// Open modal for adding a new link
window.openAddLinkModal = function(sectionId) {
    modalTitle.innerText = 'Add New Link';
    document.getElementById('edit-id').value = sectionId; // Store section ID here for reference
    document.getElementById('edit-type').value = 'new_link';
    
    document.getElementById('edit-name').value = '';
    document.getElementById('edit-url').value = '';
    urlGroup.style.display = 'block';
    
    modal.classList.remove('hidden');
    // Ensure edit mode stays active visually just in case
    toggleEditMode(true);
}

function closeEditModal() {
    modal.classList.add('hidden');
}

// Save existing item (Edit)
function saveItemDetails() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

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

// Create new link (Add)
function saveNewLink() {
    const sectionId = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const url = document.getElementById('edit-url').value;

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

function appendNewLink(sectionId, linkData) {
    const container = document.querySelector(`.section-links[data-section-id="${sectionId}"]`);
    if (!container) return;

    const div = document.createElement('div');
    // Match the classes from _section.html (ensure consistent gap/visuals + border-transparent)
    div.className = "draggable-link relative px-3 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-600 group-hover:bg-opacity-50 transition-colors duration-150 border border-transparent";
    div.setAttribute('data-id', linkData.id);
    
    div.innerHTML = `
        <a href="${linkData.url}" target="_blank"
           class="edit-mode-disable block text-neutral-700 dark:text-neutral-400 hover:underline truncate"
           data-edit-target="name">
           ${linkData.name}
        </a>
        <div class="absolute inset-0 hidden edit-mode-overlay cursor-grab active:cursor-grabbing z-10"></div>
    `;

    container.appendChild(div);
    checkLinkLimit(container);
}

// Update DOM without reload (Edit)
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
                anchor.innerText = data.name;
                anchor.href = data.url;
            }
        }
    }
}

// --- 6. Toast Notification System ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2`;
    toast.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}"></path></svg>
        <span class="font-medium text-sm">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.closeEditModal = closeEditModal;