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
    document.getElementById('page-edit-modal').classList.remove('hidden');
};

window.closePageEditModal = () => document.getElementById('page-edit-modal').classList.add('hidden');

function initPageDeleteLogic() {
    const btn = document.getElementById('btn-delete-page');
    if(!btn) return;
    let timer;
    const start = () => {
        document.getElementById('btn-delete-page-text').innerText = "Hold...";
        document.getElementById('btn-delete-page-fill').style.width = '100%';
        timer = setTimeout(() => document.getElementById('page-delete-form').submit(), 5000);
    };
    const end = () => {
        clearTimeout(timer);
        document.getElementById('btn-delete-page-fill').style.width = '0%';
        document.getElementById('btn-delete-page-text').innerText = "Delete";
    };
    
    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
    btn.addEventListener('touchend', end);
}