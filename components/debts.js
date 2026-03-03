import { supabase } from '../supabase-client.js';

export const Debts = {
    render() {
        return `
            <div class="page-header">
                <h1>Controle de Dívidas</h1>
                <button class="btn-primary" onclick="Debts.openModal()">
                    ➕ Nova Dívida
                </button>
            </div>
            
            <div class="debts-list" id="debts-list">
                Carregando...
            </div>
            
            ${this.renderModal()}
            ${this.renderDeleteModal()}
        `;
    },

    renderModal() {
        return `
            <div id="debt-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Nova Dívida</h3>
                        <button class="btn-close" onclick="Debts.closeModal()">×</button>
                    </div>
                    <form id="debt-form">
                        <div class="form-group">
                            <label>Nome/Descrição</label>
                            <input type="text" id="debt-description" required placeholder="Ex: Cartão de Crédito">
                        </div>
                        <div class="form-group">
                            <label>Valor Total (R$)</label>
                            <input type="number" id="debt-total" step="0.01" required placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label>Data de Vencimento</label>
                            <input type="date" id="debt-due-date">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="Debts.closeModal()">Cancelar</button>
                            <button type="submit" class="btn-primary">Criar Dívida</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    renderDeleteModal() {
        return `
            <div id="delete-debt-modal" class="modal">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3>⚠️ Confirmar Exclusão</h3>
                    </div>
                    <p>Tem certeza que deseja excluir esta dívida?</p>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="Debts.closeDeleteModal()">Cancelar</button>
                        <button type="button" class="btn-danger" onclick="Debts.confirmDelete()">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init(app) {
        this.app = app;
        this.deleteId = null;
        await this.loadDebts();
        this.setupForm();
    },

    async loadDebts() {
        const { data: debts } = await supabase
            .from('debts')
            .select('*, debt_payments(amount)')
            .eq('family_id', this.app.currentFamily.id)
            .order('created_at', { ascending: false });

        const list = document.getElementById('debts-list');
        
        if (!debts?.length) {
            list.innerHTML = '<div class="empty-state">Nenhuma dívida cadastrada</div>';
            return;
        }

        list.innerHTML = debts.map(d => {
            const total = parseFloat(d.total_amount);
            const paid = d.debt_payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
            const remaining = total - paid;
            const percent = total > 0 ? (paid / total) * 100 : 0;
            
            return `
                <div class="debt-card ${d.status}">
                    <div class="debt-header">
                        <div>
                            <h4>${d.description}</h4>
                            <span class="debt-status ${d.status}">${d.status === 'paid' ? '✅ Quitada' : '⏳ Em aberto'}</span>
                        </div>
                        <button class="btn-icon btn-danger" onclick="Debts.askDelete('${d.id}')" title="Excluir">
                            ❌
                        </button>
                    </div>
                    <div class="debt-progress">
                        <div class="progress-bar">
                            <div class="progress-fill ${percent >= 100 ? 'complete' : ''}" style="width: ${Math.min(percent, 100)}%"></div>
                        </div>
                        <div class="debt-stats">
                            <div>
                                <small>Total</small>
                                <div>${this.formatCurrency(total)}</div>
                            </div>
                            <div>
                                <small>Pago</small>
                                <div class="text-success">${this.formatCurrency(paid)}</div>
                            </div>
                            <div>
                                <small>Restante</small>
                                <div class="text-danger">${this.formatCurrency(remaining)}</div>
                            </div>
                        </div>
                        <div class="debt-percent">${percent.toFixed(1)}% pago</div>
                    </div>
                    ${d.due_date ? `<div class="debt-due">Vencimento: ${new Date(d.due_date).toLocaleDateString('pt-BR')}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

    setupForm() {
        document.getElementById('debt-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const { error } = await supabase.from('debts').insert([{
                family_id: this.app.currentFamily.id,
                description: document.getElementById('debt-description').value,
                total_amount: document.getElementById('debt-total').value,
                due_date: document.getElementById('debt-due-date').value || null,
                status: 'active'
            }]);
            
            if (!error) {
                this.closeModal();
                this.loadDebts();
            }
        });
    },

    askDelete(id) {
        this.deleteId = id;
        document.getElementById('delete-debt-modal').style.display = 'flex';
    },

    async confirmDelete() {
        if (!this.deleteId) return;
        
        await supabase.from('debt_payments').delete().eq('debt_id', this.deleteId);
        await supabase.from('debts').delete().eq('id', this.deleteId);
        
        this.closeDeleteModal();
        this.loadDebts();
    },

    openModal() {
        document.getElementById('debt-modal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('debt-modal').style.display = 'none';
        document.getElementById('debt-form')?.reset();
    },

    closeDeleteModal() {
        document.getElementById('delete-debt-modal').style.display = 'none';
        this.deleteId = null;
    }
};