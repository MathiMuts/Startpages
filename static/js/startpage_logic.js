document.addEventListener('DOMContentLoaded', () => {
    let isEditMode = false;
    let longPressTimer;
    const longPressDuration = 800; // ms
    const gridContainer = document.getElementById('grid-container');
    const scrollContainer = document.getElementById('main-scroll-container');

    // --- 1. EDIT MODE TOGGLE ---

    function toggleEditMode(enable) {
        isEditMode = enable;
        const body = document.body;
        const modeIndicator = document.getElementById('mode-indicator');

        if (enable) {
            body.classList.add('edit-mode-active');
            modeIndicator.textContent = "Edit Mode Active (Drag to reorder, Click to edit, Click background to exit)";
            modeIndicator.classList.add('text-indigo-500', 'font-bold');
            
            // Enable Sortable instances
            enableDragAndDrop();
        } else {
            body.classList.remove('edit-mode-active');
            modeIndicator.textContent = "Hold any item to Edit";
            modeIndicator.classList.remove('text-indigo-500', 'font-bold');
            
            // Disable/Destroy Sortable instances to restore normal interaction
            disableDragAndDrop();
        }
    }

    // Long Press Logic
    const handleStart = (e) => {
        if (isEditMode) return;
        // Only trigger on left click or touch
        if (e.type === 'mousedown' && e.button !== 0) return;

        // Check if target is inside a section
        if (e.target.closest('.draggable-section')) {
            longPressTimer = setTimeout(() => {
                toggleEditMode(true);
                // Vibration feedback for mobile
                if (navigator.vibrate) navigator.vibrate(50);
            }, longPressDuration);
        }
    };

    const handleEnd = () => {
        clearTimeout(longPressTimer);
    };

    // Attach listeners to grid
    gridContainer.addEventListener('mousedown', handleStart);
    gridContainer.addEventListener('touchstart', handleStart);
    gridContainer.addEventListener('mouseup', handleEnd);
    gridContainer.addEventListener('mouseleave', handleEnd);
    gridContainer.addEventListener('touchend', handleEnd);

    // Click outside to exit (attached to the main scroll container)
    scrollContainer.addEventListener('click', (e) => {
        if (isEditMode) {
            // If clicked on background (not a section or link or modal)
            if (!e.target.closest('.draggable-section') && !e.target.closest('#edit-modal')) {
                toggleEditMode(false);
            }
        }
    });


    // --- 2. DRAG AND DROP (SortableJS) ---

    let sectionSortable;
    let linkSortables = [];

    function enableDragAndDrop() {
        // 1. Sort Sections
        sectionSortable = new Sortable(gridContainer, {
            animation: 150,
            handle: '.section-header', // Drag by header
            delay: 0, 
            onEnd: function (evt) {
                saveSectionOrder();
            }
        });

        // 2. Sort Links (Nested)
        const linkContainers = document.querySelectorAll('.section-links');
        linkContainers.forEach(container => {
            const sortable = new Sortable(container, {
                group: 'shared-links', // Allow dragging between sections
                animation: 150,
                delay: 0,
                onEnd: function (evt) {
                    // We need the section ID where the item ended up
                    const targetSection = evt.to; 
                    saveLinkOrder(targetSection);
                    
                    // If moved to a different list, update origin list too just in case (though API handles by ID)
                    if (evt.to !== evt.from) {
                        saveLinkOrder(evt.from);
                    }
                }
            });
            linkSortables.push(sortable);
        });
    }

    function disableDragAndDrop() {
        if (sectionSortable) sectionSortable.destroy();
        linkSortables.forEach(s => s.destroy());
        linkSortables = [];
    }


    // --- 3. MODAL & CLICK TO EDIT ---

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    
    // Delegate click event for items in edit mode
    gridContainer.addEventListener('click', (e) => {
        if (!isEditMode) return;

        const section = e.target.closest('.draggable-section');
        const link = e.target.closest('.draggable-link');

        // Prioritize Link click
        if (link) {
            e.preventDefault();
            e.stopPropagation();
            openEditModal('link', link.dataset.id);
        } 
        // Then Section click (if clicked on header)
        else if (section && e.target.closest('.section-header')) {
            e.preventDefault();
            e.stopPropagation();
            openEditModal('section', section.dataset.id);
        }
    });

    window.openEditModal = async (type, id) => {
        const urlField = document.getElementById('url-field-group');
        
        // Reset Form
        editForm.reset();
        
        // Fetch Data
        try {
            const response = await fetch(`/startpages/api/get-item-details/?type=${type}&id=${id}`);
            const data = await response.json();
            
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-type').value = data.type;
            document.getElementById('edit-name').value = data.name;
            
            if (type === 'link') {
                urlField.classList.remove('hidden');
                document.getElementById('edit-url').value = data.url;
            } else {
                urlField.classList.add('hidden');
            }
            
            editModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error fetching details:', error);
        }
    };

    window.closeEditModal = () => {
        editModal.classList.add('hidden');
    };

    // Save Form
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(editForm);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/startpages/api/save-item-details/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeEditModal();
                // Refresh page to show changes (or update DOM manually for smoother XP)
                window.location.reload(); 
            }
        } catch (error) {
            console.error('Error saving:', error);
        }
    });


    // --- 4. API SAVING LOGIC ---

    async function saveSectionOrder() {
        // Get array of IDs based on DOM order
        const sections = Array.from(gridContainer.children)
                              .map(el => el.dataset.id)
                              .filter(id => id !== undefined);

        await fetch('/startpages/api/update-section-order/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ ids: sections })
        });
    }

    async function saveLinkOrder(sectionElement) {
        const sectionId = sectionElement.dataset.sectionId;
        const links = Array.from(sectionElement.children)
                           .map(el => el.dataset.id)
                           .filter(id => id !== undefined);

        await fetch('/startpages/api/update-link-order/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ 
                section_id: sectionId,
                link_ids: links 
            })
        });
    }

    // Helper: Get CSRF Token
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
});