document.addEventListener('DOMContentLoaded', () => {
    initSortables();
    initInteractionListeners();
    initModalLogic();
});

let isEditMode = false;
let sectionSortable = null;
let linkSortables = [];
let longPressTimer;
let ignoreNextClick = false; // Flag to prevent modal opening immediately after long-press release

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

    // Section Sorting
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

    // Link Sorting
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

// --- 3. Interaction Logic (Long Press & Edit Mode) ---
function initInteractionListeners() {
    const appContainer = document.querySelector('body');

    // Long Press Detection
    appContainer.addEventListener('mousedown', handleStartPress);
    appContainer.addEventListener('touchstart', handleStartPress, { passive: true });

    appContainer.addEventListener('mouseup', handleCancelPress);
    appContainer.addEventListener('mouseleave', handleCancelPress);
    appContainer.addEventListener('touchend', handleCancelPress);
    appContainer.addEventListener('touchmove', handleCancelPress);

    // Consolidated Click Handler
    appContainer.addEventListener('click', (e) => {
        // 1. If this click came from the Long Press release, ignore it
        if (ignoreNextClick) {
            ignoreNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 2. If NOT in edit mode, let normal interactions (like following links) happen
        if (!isEditMode) return;

        // 3. We are in Edit Mode. Check what was clicked.
        const sectionEl = e.target.closest('.draggable-section');
        const linkEl = e.target.closest('.draggable-link');
        const isModal = e.target.closest('#edit-modal');
        // Check if click is inside the modal content box (to prevent closing when clicking input fields)
        const isModalContent = e.target.closest('.relative.transform.overflow-hidden'); 

        // A. Clicked a Section Header -> Edit Section
        if (sectionEl && e.target.closest('.section-header')) {
            e.preventDefault();
            openEditModal('section', sectionEl.getAttribute('data-id'));
            return;
        } 
        
        // B. Clicked a Link -> Edit Link
        if (linkEl) {
            e.preventDefault();
            openEditModal('link', linkEl.getAttribute('data-id'));
            return;
        }

        // C. Clicked Background (not item, not modal) -> Exit Edit Mode
        if (!isModal && !isModalContent) {
            toggleEditMode(false);
        }
    });
}

function handleStartPress(e) {
    if (isEditMode) return; 
    
    // Only trigger on actual items
    if (!e.target.closest('.draggable-section') && !e.target.closest('.draggable-link')) return;

    longPressTimer = setTimeout(() => {
        toggleEditMode(true);
        ignoreNextClick = true; // Set flag to swallow the immediate 'mouseup->click' event
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

// --- 4. API Calls (Persistence) ---

function saveSectionOrder() {
    const grid = document.getElementById('grid-container');
    const sections = grid.querySelectorAll('.draggable-section');
    const ids = Array.from(sections).map(sec => sec.getAttribute('data-id'));

    fetch('/api/update-section-order/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ ids: ids })
    }).then(res => {
        if (!res.ok) console.error("Failed to save section order");
    });
}

function saveLinkOrder(sectionId, container) {
    const links = container.querySelectorAll('.draggable-link');
    const ids = Array.from(links).map(link => link.getAttribute('data-id'));

    fetch('/api/update-link-order/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({
            section_id: sectionId,
            link_ids: ids
        })
    }).then(res => {
        if (!res.ok) console.error("Failed to save link order");
    });
}

// --- 5. Modal Logic ---

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
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify(data)
    }).then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            closeEditModal();
            location.reload(); 
        }
    });
}

window.closeEditModal = closeEditModal;