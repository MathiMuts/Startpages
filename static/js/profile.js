document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    switchTab(urlParams.get('tab') || 'personal');
    initPageDeleteLogic();
    
    // --- Theme Selection Logic ---
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const themeId = btn.getAttribute('data-theme-id');
            // Convert string 'true'/'false' to boolean
            const isDark = btn.getAttribute('data-is-dark') === 'true';
            
            setTheme(themeId, isDark);
        });
    });

    // --- Existing Dark Mode Toggle (Header/Sidebar if present) ---
    const toggle = document.getElementById("profile-dark-mode-toggle");
    if (toggle) {
        toggle.addEventListener("click", () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            const dot = toggle.querySelector('span[aria-hidden="true"]');
            if(dot) {
                dot.classList.toggle('translate-x-0', !isDark);
                dot.classList.toggle('translate-x-6', isDark);
            }
        });
        // Set initial position
        if (document.documentElement.classList.contains('dark')) {
            const dot = toggle.querySelector('span[aria-hidden="true"]');
            if(dot) {
                dot.classList.remove('translate-x-0');
                dot.classList.add('translate-x-6');
            }
        }
    }
});

function getCsrfToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
}

function setTheme(themeId, isDark) {
    // 1. Update UI active state (Visual selection)
    document.querySelectorAll('.theme-btn').forEach(btn => {
        // Reset rings
        btn.classList.remove('ring-primary-600', 'dark:ring-primary-500');
        btn.classList.add('ring-transparent');
        
        // Remove existing checkmark overlay if present
        const svg = btn.querySelector('svg');
        if (svg && svg.parentElement && svg.parentElement.classList.contains('absolute')) {
            svg.parentElement.remove();
        }
    });

    // Activate clicked button
    const activeBtn = document.querySelector(`.theme-btn[data-theme-id="${themeId}"]`);
    if (activeBtn) {
        // Add rings
        activeBtn.classList.remove('ring-transparent');
        activeBtn.classList.add('ring-primary-600', 'dark:ring-primary-500');
        
        // Inject Checkmark HTML
        const checkmark = document.createElement('div');
        checkmark.className = "absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-white/10 backdrop-blur-[1px]";
        checkmark.innerHTML = `<svg class="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
        activeBtn.appendChild(checkmark);
    }

    // // 2. Apply Theme TODO: FIXME:
    // Dark/Light mode immediately
    // if (isDark) {
    //     document.documentElement.classList.add('dark');
    // } else {
    //     document.documentElement.classList.remove('dark');
    // }

    // 3. Save Preference via API
    fetch('/api/update-theme/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ theme_id: themeId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            if (typeof window.showToast === 'function') {
                window.showToast('Theme updated successfully!', 'success');
            }
        } else {
            if (typeof window.showToast === 'function') {
                window.showToast(data.message || 'Failed to update theme.', 'error');
            }
        }
    })
    .catch(err => {
        console.error('Error saving theme:', err);
        if (typeof window.showToast === 'function') {
            window.showToast('Could not save theme preference.', 'error');
        }
    });
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('bg-primary-100', 'text-primary-700', 'dark:bg-primary-900/50', 'dark:text-primary-300');
        el.classList.add('text-neutral-600', 'dark:text-gray-300');
    });

    const content = document.getElementById('tab-' + tabName);
    const btn = document.getElementById('tab-btn-' + tabName);
    if(content) content.classList.remove('hidden');
    if(btn) {
        btn.classList.remove('text-neutral-600', 'dark:text-gray-300');
        btn.classList.add('bg-primary-100', 'text-primary-700', 'dark:bg-primary-900/50', 'dark:text-primary-300');
    }
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({}, '', url);
};

window.openImportModal = () => document.getElementById('page-import-modal').classList.remove('hidden');
window.closeImportModal = () => document.getElementById('page-import-modal').classList.add('hidden');

window.openPageEditModal = (button) => {
    const id = button.getAttribute('data-id');
    const title = button.getAttribute('data-title');
    const isDefault = button.getAttribute('data-default') === 'true';
    document.getElementById('edit-page-title').value = title;
    document.getElementById('edit-page-default').checked = isDefault;
    document.getElementById('page-edit-form').action = `/profile/page/${id}/edit/`;
    document.getElementById('page-delete-form').action = `/profile/page/${id}/delete/`;
    document.getElementById('edit-page-export-btn').href = `/profile/page/${id}/export/`;
    
    // Reset delete button state
    const textSpan = document.getElementById('btn-delete-page-text');
    const fillBar = document.getElementById('btn-delete-page-fill');
    if(textSpan) textSpan.innerText = "Delete";
    if(fillBar) { fillBar.style.width = '0%'; fillBar.style.transition = 'none'; }
    
    document.getElementById('page-edit-modal').classList.remove('hidden');
};

window.closePageEditModal = () => document.getElementById('page-edit-modal').classList.add('hidden');

function initPageDeleteLogic() {
    const btn = document.getElementById('btn-delete-page');
    if(!btn) return;
    
    let timer;
    let isReadyToDelete = false;
    const fillBar = document.getElementById('btn-delete-page-fill');
    const textSpan = document.getElementById('btn-delete-page-text');
    const holdDuration = 1500; 

    const start = (e) => {
        if (e.type === 'mousedown' && e.sourceEvent && e.sourceEvent.type === 'touchstart') return;
        
        isReadyToDelete = false;
        textSpan.innerText = "Hold...";
        
        // 1. Reset
        fillBar.style.transition = 'none';
        fillBar.style.width = '0%';
        fillBar.style.opacity = '1'; 
        
        // 2. Reflow
        void fillBar.offsetWidth;
        
        // 3. Animate
        fillBar.style.transition = `width ${holdDuration}ms linear`;
        fillBar.style.width = '100%';
        
        timer = setTimeout(() => {
            isReadyToDelete = true;
            textSpan.innerText = "Delete!";
        }, holdDuration);
    };
    
    const end = (e) => {
        clearTimeout(timer);
        
        // Check abort
        const isAborted = e.type === 'mouseleave' || e.type === 'touchcancel';
        
        if (isReadyToDelete && !isAborted) {
             textSpan.innerText = "Deleting...";
             document.getElementById('page-delete-form').submit();
        } else {
             textSpan.innerText = "Delete";
        }
        
        fillBar.style.transition = 'width 200ms ease-out, opacity 200ms ease-out';
        fillBar.style.width = '0%';
        fillBar.style.opacity = '';
        isReadyToDelete = false;
    };
    
    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', start, { passive: true });
    
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
    btn.addEventListener('touchend', end);
    btn.addEventListener('touchcancel', end);
}