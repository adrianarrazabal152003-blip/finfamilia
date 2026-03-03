const Savings = {
    render() {
        return `
            <div class="page-header">
                <h1>Reservas e Metas</h1>
                <button class="btn-primary" onclick="Savings.openModal()">
                    ➕ Nova Reserva
                </button>
            </div>
            
            <div class="savings-grid" id="savings-list">
                Carregando...
            </div>
            
            ${this.renderModal()}
            ${this.renderDeleteModal()}
        `;
    },

    renderModal() {
        return `
            <div id="savings-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Nova Meta de Economia</h3>
                        <button class="btn-close" onclick="Savings.closeModal()">×</button>
                    </div>
                    <form id="savings-form">
                        <div class="form-group">
                            <label>Nome da Meta</label>
                            <input type="text" id="savings-name" required placeholder="Ex: Viagem de férias">
                        </div>
                        <div class="form-group">
                            <label>Valor Meta (R$)</label>
                            <input type="number" id="savings-target" step="0.01" required placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label>Descrição (opcional)</label>
                            <textarea id="savings-description" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="Savings.closeModal()">Cancelar</button>
                            <button type="submit" class="btn-primary">Criar Meta</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    renderDeleteModal() {
        return `
            <div id="delete-savings-modal" class="modal">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3>⚠️ Confirmar Exclusão</h3>
                    </div>
                    <p>Tem certeza que deseja excluir esta reserva? Todos os depósitos serão removidos.</p>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="Savings.closeDeleteModal()">Cancelar</button>
                        <button type="button" class="btn-danger" onclick="Savings.confirmDelete()">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init(app) {
        this.app = app;
        this.deleteId = null;
        await this.loadSavings();
        this.setupForm();
    },

    async loadSavings() {
        const { data: goals } = await window.supabaseClient
            .from('savings_goals')
            .select('*, savings_entries(amount)')
            .eq('family_id', this.app.currentFamily.id)
            .order('created_at', { ascending: false });

        const grid = document.getElementById('savings-list');
        
        if (!goals?.length) {
            grid.innerHTML = '<div class="empty-state">Nenhuma meta de economia criada</div>';
            return;
        }

        grid.innerHTML = goals.map(g => {
            const saved = g.savings_entries?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
            const target = parseFloat(g.target_amount);
            const percent = Math.min((saved / target) * 100, 100);
            
            return `
                <div class="savings-card">
                    <div class="savings-header">
                        <h4>${g.name}</h4>
                        <button class="btn-icon btn-danger" onclick="Savings.askDelete('${g.id}')" title="Excluir">
                            ❌
                        </button>
                    </div>
                    <p class="savings-description">${g.description || ''}</p>
                    <div class="savings-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="savings-stats">
                            <span>${this.formatCurrency(saved)}</span>
                            <span>${this.formatCurrency(target)}</span>
                        </div>
                        <div class="savings-percent">${percent.toFixed(1)}%</div>
                    </div>
                    <button class="btn-secondary btn-small" onclick="Savings.openDepositModal('${g.id}')">
                        ➕ Adicionar Depósito
                    </button>
                </div>
            `;
        }).join('');
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

    setupForm() {
        document.getElementById('savings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const { error } = await window.supabaseClient.from('savings_goals').insert([{
                family_id: this.app.currentFamily.id,
                name: document.getElementById('savings-name').value,
                target_amount: document.getElementById('savings-target').value,
                description: document.getElementById('savings-description').value
            }]);
            
            if (!error) {
                this.closeModal();
                this.loadSavings();
            }
        });
    },

    askDelete(id) {
        this.deleteId = id;
        document.getElementById('delete-savings-modal').style.display = 'flex';
    },

    async confirmDelete() {
        if (!this.deleteId) return;
        
        await window.supabaseClient.from('savings_entries').delete().eq('savings_goal_id', this.deleteId);
        await window.supabaseClient.from('savings_goals').delete().eq('id', this.deleteId);
        
        this.closeDeleteModal();
        this.loadSavings();
    },

    openModal() {
        document.getElementById('savings-modal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('savings-modal').style.display = 'none';
        document.getElementById('savings-form')?.reset();
    },

    closeDeleteModal() {
        document.getElementById('delete-savings-modal').style.display = 'none';
        this.deleteId = null;
    },

    openDepositModal(goalId) {
        const amount = prompt('Valor do depósito:');
        if (amount && !isNaN(amount)) {
            window.supabaseClient.from('savings_entries').insert([{
                savings_goal_id: goalId,
                amount: parseFloat(amount),
                entry_date: new Date().toISOString()
            }]).then(() => this.loadSavings());
        }
    }
};
