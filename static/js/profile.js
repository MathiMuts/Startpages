document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    switchTab(urlParams.get('tab') || 'personal');
    initPageDeleteLogic();
    
    // Profile Dark Mode Toggle
    const toggle = document.getElementById("profile-dark-mode-toggle");
    if (toggle) {
        toggle.addEventListener("click", () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            const dot = toggle.querySelector('span[aria-hidden="true"]');
            dot.classList.toggle('translate-x-0', !isDark);
            dot.classList.toggle('translate-x-6', isDark);
        });
        // Set initial position
        if (document.documentElement.classList.contains('dark')) {
            const dot = toggle.querySelector('span[aria-hidden="true"]');
            dot.classList.remove('translate-x-0');
            dot.classList.add('translate-x-6');
        }
    }
});

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