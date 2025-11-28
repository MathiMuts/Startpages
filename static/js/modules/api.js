function getCsrfToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
}

const headers = () => ({
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken()
});

export const API = {
    updateSectionOrder: (ids) => {
        return fetch('/api/update-section-order/', {
            method: 'POST', headers: headers(), body: JSON.stringify({ ids })
        });
    },
    updateLinkOrder: (sectionId, linkIds) => {
        return fetch('/api/update-link-order/', {
            method: 'POST', headers: headers(), body: JSON.stringify({ section_id: sectionId, link_ids: linkIds })
        });
    },
    getItem: (type, id) => {
        return fetch(`/api/get-item-details/?type=${type}&id=${id}`).then(res => res.json());
    },
    saveItem: (data) => {
        return fetch('/api/save-item-details/', {
            method: 'POST', headers: headers(), body: JSON.stringify(data)
        }).then(res => res.json());
    },
    addLink: (data) => {
        return fetch('/api/add-link/', {
            method: 'POST', headers: headers(), body: JSON.stringify(data)
        }).then(res => res.json());
    },
    addSection: (name) => {
        return fetch('/api/add-section/', {
            method: 'POST', headers: headers(), body: JSON.stringify({ name })
        }).then(res => res.json());
    },
    deleteItem: (type, id) => {
        return fetch('/api/delete-item/', {
            method: 'POST', headers: headers(), body: JSON.stringify({ type, id })
        }).then(res => res.json());
    }
};