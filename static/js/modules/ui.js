export const UI = {
    sanitizeColorInput: (input) => {
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
    },

    checkLinkLimit: (container) => {
        if (!container) return;
        const sectionId = container.getAttribute('data-section-id');
        const count = container.querySelectorAll('.draggable-link').length;
        
        const btnContainer = document.getElementById(`add-btn-container-${sectionId}`);
        const addBtn = btnContainer ? btnContainer.querySelector('.static-add-btn') : null;

        // 1. Mark container state for CSS targeting
        if (count >= 9) {
            container.classList.add('near-full');
        } else {
            container.classList.remove('near-full');
        }
        
        if (btnContainer && addBtn) {
            if (count >= 10) {
                // Section is Full (10+)
                btnContainer.classList.add('hidden'); 
                container.classList.add('section-full');
            } else {
                // Section has space (<10)
                btnContainer.classList.remove('hidden');
                container.classList.remove('section-full');

                // Cleanup inline styles from previous interactions
                addBtn.style.removeProperty('display');

                // Toggle visibility based on empty state
                if (count === 0) {
                    addBtn.classList.remove('hidden', 'edit-mode-visible');
                    addBtn.classList.add('flex');
                } else {
                    addBtn.classList.add('hidden', 'edit-mode-visible');
                    addBtn.classList.remove('flex');
                }
            }
        }
    },

    checkSectionEmptyState: () => {
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
    },

    appendNewLink: (sectionId, linkData) => {
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
               class="edit-mode-disable flex items-center gap-3 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
               data-edit-target="name">
               <div class="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
                   <span class="link-dot absolute w-2 h-2 rounded-full transition-all duration-200 ease-out group-hover/link:opacity-0 group-hover/link:scale-0 ${dotClass}" ${dotStyle}></span>
                   <svg class="link-arrow absolute w-4 h-4 transition-all duration-200 ease-out opacity-0 scale-0 -rotate-45 group-hover/link:rotate-0 group-hover/link:opacity-100 group-hover/link:scale-100 ${textClass}" ${textStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                   </svg>
               </div>
               <span class="truncate font-medium text-sm overflow-ellipsis leading-tight pt-0.5">${linkData.name}</span>
            </a>
            <div class="absolute inset-0 hidden edit-mode-overlay cursor-grab active:cursor-grabbing z-10 bg-white/10"></div>
        `;
        container.appendChild(div);
        UI.checkLinkLimit(container);
    },

    appendNewSection: (sectionData) => {
        const grid = document.getElementById('grid-container');
        const addBtn = grid.querySelector('.add-section-btn');
        const section = document.createElement('section');
        section.className = "draggable-section bg-white dark:bg-gray-800 container px-5 pt-4 pb-1 flex flex-col gap-3 rounded-xl text-neutral-900 dark:text-neutral-200 w-full relative group select-none h-[30rem] border-t-4 border-primary-500 dark:border-primary-400 shadow-xl shadow-primary-100/50 dark:shadow-none transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary-200/50 dark:hover:shadow-black/30";
        section.setAttribute('data-id', sectionData.id);

        section.innerHTML = `
        <div class="flex justify-between items-center section-header pb-2 border-b border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing">
            <h2 class="text-xl font-bold truncate pointer-events-none text-gray-800 dark:text-gray-100 tracking-tight" data-edit-target="name">${sectionData.name}</h2>
            <a href="#" onclick="openAllLinksInSection(this); return false;" class="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 edit-mode-hidden transition-colors p-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            <div class="hidden edit-mode-visible text-primary-500 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
        </div>
        <div class="flex flex-col gap-1 flex-grow overflow-hidden">
            <div class="flex flex-col gap-1.5 min-h-0 section-links flex-grow overflow-y-auto overflow-x-visible custom-scrollbar px-1 [&::-webkit-scrollbar]:hidden" data-section-id="${sectionData.id}"></div>
            <div id="add-btn-container-${sectionData.id}" class="group/add px-1 pb-1">
                <button onclick="openAddLinkModal('${sectionData.id}')" class="static-add-btn w-full text-left cursor-pointer items-center gap-3 px-3 py-1.5 mb-4 rounded-md border border-transparent text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all flex" title="Add Link">
                    <span class="flex items-center justify-center w-4 h-4"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></span>
                    <span class="text-sm font-bold opacity-80 group-hover/add:opacity-100 pt-0.5">Add Link</span>
                </button>
            </div>
        </div>
        `;
        
        if (addBtn) grid.insertBefore(section, addBtn);
        else grid.appendChild(section);
        
        UI.checkSectionEmptyState();
        return section.querySelector('.section-links');
    },

    removeItemFromDom: (type, id) => {
        if (type === 'section') {
            const el = document.querySelector(`.draggable-section[data-id="${id}"]`);
            if (el) { el.remove(); UI.checkSectionEmptyState(); }
        } else if (type === 'link') {
            const el = document.querySelector(`.draggable-link[data-id="${id}"]`);
            if (el) {
                const container = el.closest('.section-links');
                el.remove();
                if (container) UI.checkLinkLimit(container);
            }
        }
    },

    updateUiItem: (data) => {
        if (data.type === 'section') {
            const section = document.querySelector(`.draggable-section[data-id="${data.id}"]`);
            if (section) section.querySelector('h2').innerText = data.name;
        } else if (data.type === 'link') {
            const linkWrapper = document.querySelector(`.draggable-link[data-id="${data.id}"]`);
            if (linkWrapper) {
                const anchor = linkWrapper.querySelector('a');
                if (anchor) {
                    anchor.querySelector('.truncate').innerText = data.name;
                    anchor.href = data.url;
                    const dot = anchor.querySelector('.link-dot');
                    const arrow = anchor.querySelector('.link-arrow');
                    
                    if (data.color) {
                        if(dot) { dot.style.backgroundColor = data.color; dot.classList.remove('bg-primary-500'); }
                        if(arrow) { arrow.style.color = data.color; arrow.classList.remove('text-primary-500'); }
                    } else {
                        if(dot) { dot.style.removeProperty('background-color'); dot.classList.add('bg-primary-500'); }
                        if(arrow) { arrow.style.removeProperty('color'); arrow.classList.add('text-primary-500'); }
                    }
                }
            }
        }
    }
};