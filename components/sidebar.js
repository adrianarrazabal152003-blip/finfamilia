const Sidebar = {
    render(currentPage) {
        const menuItems = [
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'transactions', icon: '💰', label: 'Transações' },
            { id: 'savings', icon: '🎯', label: 'Reservas' },
            { id: 'debts', icon: '💳', label: 'Dívidas' },
            { id: 'settings', icon: '⚙️', label: 'Configurações' }
        ];

        return `
            <aside class="sidebar">
                <div class="sidebar-header">
                    <h2>💜 FinFamília</h2>
                </div>
                <nav class="sidebar-nav">
                    ${menuItems.map(item => `
                        <button class="nav-item ${currentPage === item.id ? 'active' : ''}" 
                                onclick="app.setPage('${item.id}')">
                            <span class="nav-icon">${item.icon}</span>
                            <span class="nav-label">${item.label}</span>
                        </button>
                    `).join('')}
                </nav>
            </aside>
        `;
    },

    init(app) {
        const toggle = document.createElement('button');
        toggle.className = 'sidebar-toggle';
        toggle.innerHTML = '☰';
        toggle.onclick = () => document.querySelector('.sidebar').classList.toggle('open');
        document.body.appendChild(toggle);
    }
};
