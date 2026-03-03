const Transactions = {
    render() {
        return `
            <div class="page-header">
                <h1>Transações</h1>
                <button class="btn-primary" onclick="Transactions.openModal()">
                    ➕ Nova Transação
                </button>
            </div>
            
            <div class="transactions-list" id="transactions-list">
                Carregando...
            </div>
            
            ${this.renderModal()}
        `;
    },

    renderModal() {
        return `
            <div id="transaction-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Nova Transação</h3>
                        <button class="btn-close" onclick="Transactions.closeModal()">×</button>
                    </div>
                    <form id="transaction-form">
                        <div class="form-group">
                            <label>Tipo</label>
                            <select id="trans-type" required onchange="Transactions.onTypeChange()">
                                <option value="income">Receita</option>
                                <option value="expense">Despesa</option>
                                <option value="savings">Guardar (Reserva)</option>
                                <option value="debt">Dívida (Pagamento)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="debt-select-group" style="display:none">
                            <label>Selecionar Dívida</label>
                            <select id="trans-debt">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Valor</label>
                            <input type="number" id="trans-amount" step="0.01" required placeholder="0,00">
                        </div>
                        
                        <div class="form-group">
                            <label>Descrição</label>
                            <input type="text" id="trans-description" required placeholder="Descrição da transação">
                        </div>
                        
                        <div class="form-group" id="category-group">
                            <label>Categoria</label>
                            <select id="trans-category">
                                <option value="">Selecione...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Data</label>
                            <input type="date" id="trans-date" required>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="Transactions.closeModal()">Cancelar</button>
                            <button type="submit" class="btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    async init(app) {
        this.app = app;
        await this.loadTransactions();
        this.setupForm();
    },

    async loadTransactions() {
        const { data: transactions } = await window.supabaseClient
            .from('transactions')
            .select('*, categories(name), profiles(full_name)')
            .eq('family_id', this.app.currentFamily.id)
            .order('date', { ascending: false });

        const list = document.getElementById('transactions-list');
        
        if (!transactions?.length) {
            list.innerHTML = '<div class="empty-state">Nenhuma transação encontrada</div>';
            return;
        }

        list.innerHTML = transactions.map(t => `
            <div class="transaction-item ${t.type}">
                <div class="transaction-icon">${this.getIcon(t.type)}</div>
                <div class="transaction-info">
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-meta">
                        ${t.categories?.name || 'Sem categoria'} • ${new Date(t.date).toLocaleDateString('pt-BR')}
                        ${t.profiles?.full_name ? `• ${t.profiles.full_name}` : ''}
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                </div>
            </div>
        `).join('');
    },

    getIcon(type) {
        const icons = { income: '💰', expense: '💸', savings: '🎯', debt: '💳' };
        return icons[type] || '💰';
    },

    async onTypeChange() {
        const type = document.getElementById('trans-type').value;
        const debtGroup = document.getElementById('debt-select-group');
        const categoryGroup = document.getElementById('category-group');
        
        if (type === 'debt') {
            debtGroup.style.display = 'block';
            categoryGroup.style.display = 'none';
            await this.loadDebtsSelect();
        } else {
            debtGroup.style.display = 'none';
            categoryGroup.style.display = 'block';
            await this.loadCategories(type);
        }
    },

    async loadDebtsSelect() {
        const { data: debts } = await window.supabaseClient
            .from('debts')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .eq('status', 'active');

        const select = document.getElementById('trans-debt');
        select.innerHTML = debts?.map(d => 
            `<option value="${d.id}">${d.description} - R$ ${d.total_amount}</option>`
        ).join('') || '<option value="">Nenhuma dívida ativa</option>';
    },

    async loadCategories(type) {
        const { data: categories } = await window.supabaseClient
            .from('categories')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .eq('type', type);

        const select = document.getElementById('trans-category');
        select.innerHTML = '<option value="">Selecione...</option>' + 
            categories?.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    },

    setupForm() {
        document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const type = document.getElementById('trans-type').value;
            const amount = parseFloat(document.getElementById('trans-amount').value);
            const description = document.getElementById('trans-description').value;
            const date = document.getElementById('trans-date').value;
            
            let categoryId = document.getElementById('trans-category').value;
            let debtId = null;
            
            if (type === 'debt') {
                debtId = document.getElementById('trans-debt').value;
                
                let { data: debtCat } = await window.supabaseClient
                    .from('categories')
                    .select('id')
                    .eq('family_id', this.app.currentFamily.id)
                    .eq('name', 'Dívidas')
                    .single();
                
                if (!debtCat) {
                    const { data: newCat } = await window.supabaseClient
                        .from('categories')
                        .insert([{
                            family_id: this.app.currentFamily.id,
                            name: 'Dívidas',
                            type: 'expense'
                        }])
                        .select()
                        .single();
                    debtCat = newCat;
                }
                
                categoryId = debtCat.id;
                
                await window.supabaseClient.from('debt_payments').insert([{
                    debt_id: debtId,
                    amount: amount,
                    payment_date: date
                }]);
                
                const { data: debt } = await window.supabaseClient
                    .from('debts')
                    .select('*, debt_payments(amount)')
                    .eq('id', debtId)
                    .single();
                
                const totalPaid = debt.debt_payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
                
                if (totalPaid >= parseFloat(debt.total_amount)) {
                    await window.supabaseClient.from('debts').update({ status: 'paid' }).eq('id', debtId);
                }
            }
            
            await window.supabaseClient.from('transactions').insert([{
                family_id: this.app.currentFamily.id,
                user_id: this.app.currentUser.id,
                type,
                amount,
                description: type === 'debt' ? `Pagamento - ${description}` : description,
                category_id: categoryId || null,
                date,
                debt_id: debtId
            }]);
            
            this.closeModal();
            this.loadTransactions();
        });

        document.getElementById('trans-date').valueAsDate = new Date();
    },

    openModal() {
        document.getElementById('transaction-modal').style.display = 'flex';
        this.loadCategories('income');
    },

    closeModal() {
        document.getElementById('transaction-modal').style.display = 'none';
        document.getElementById('transaction-form')?.reset();
    }
};
