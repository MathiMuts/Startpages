document.addEventListener('DOMContentLoaded', () => {
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
            onEnd: function (evt) {
                const targetList = evt.to; 
                const sectionId = targetList.getAttribute('data-section-id');
                saveLinkOrder(sectionId, targetList);
            }
        });
        linkSortables.push(sortable);
    });
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
        // Let the browser handle focus/input.
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
        // Only if we are NOT clicking the modal wrapper (which handles its own closing via onclick)
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
        if(modeIndicator) modeIndicator.innerText = "Edit Mode Active (Drag to move, Click to edit, Click bg to exit)";
        
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
    });
}

// --- 5. Modal Logic & UI Updates ---

const modal = document.getElementById('edit-modal');
const form = document.getElementById('edit-form');
const urlGroup = document.getElementById('url-field-group');

function initModalLogic() {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveItemDetails();
    });
}

function openEditModal(type, id) {
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

function closeEditModal() {
    modal.classList.add('hidden');
}

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

// Update DOM without reload
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