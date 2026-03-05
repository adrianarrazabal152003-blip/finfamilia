const Transactions = {
    currentFilters: {
        type: 'all',
        category: 'all',
        dateFrom: '',
        dateTo: '',
        search: ''
    },

    render() {
        return `
            <div class="page-header">
                <h1>Transações</h1>
                <button class="btn-primary" onclick="Transactions.openModal()">
                    ➕ Nova Transação
                </button>
            </div>
            
            ${this.renderFilters()}
            
            <div class="transactions-list" id="transactions-list">
                <div class="loading">Carregando transações...</div>
            </div>
            
            ${this.renderModal()}
            ${this.renderDeleteModal()}
        `;
    },

    renderFilters() {
        return `
            <div class="filters-bar">
                <div class="filter-group">
                    <label>Tipo</label>
                    <select id="filter-type" onchange="Transactions.applyFilter('type', this.value)">
                        <option value="all">Todos</option>
                        <option value="income">Receita</option>
                        <option value="expense">Despesa</option>
                        <option value="savings">Guardar</option>
                        <option value="debt">Dívida</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Categoria</label>
                    <select id="filter-category" onchange="Transactions.applyFilter('category', this.value)">
                        <option value="all">Todas</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>De</label>
                    <input type="date" id="filter-date-from" onchange="Transactions.applyFilter('dateFrom', this.value)">
                </div>
                <div class="filter-group">
                    <label>Até</label>
                    <input type="date" id="filter-date-to" onchange="Transactions.applyFilter('dateTo', this.value)">
                </div>
                <div class="filter-group">
                    <label>Buscar</label>
                    <input type="text" id="filter-search" placeholder="Descrição..." 
                           oninput="Transactions.applyFilter('search', this.value)">
                </div>
                <button class="btn-secondary" onclick="Transactions.clearFilters()">Limpar</button>
            </div>
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
                            <label>Tipo *</label>
                            <select id="trans-type" required onchange="Transactions.onTypeChange()">
                                <option value="">Selecione...</option>
                                <option value="income">Receita</option>
                                <option value="expense">Despesa</option>
                                <option value="savings">Guardar (Reserva)</option>
                                <option value="debt">Dívida (Pagamento)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="debt-select-group" style="display:none">
                            <label>Selecionar Dívida *</label>
                            <select id="trans-debt">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Valor (R$) *</label>
                            <input type="number" id="trans-amount" step="0.01" min="0.01" required placeholder="0,00">
                        </div>
                        
                        <div class="form-group">
                            <label>Descrição *</label>
                            <input type="text" id="trans-description" required placeholder="Ex: Supermercado">
                        </div>
                        
                        <div class="form-group" id="category-group">
                            <label>Categoria *</label>
                            <select id="trans-category" required>
                                <option value="">Selecione primeiro o tipo...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Data *</label>
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

    renderDeleteModal() {
        return `
            <div id="delete-trans-modal" class="modal">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3>⚠️ Confirmar Exclusão</h3>
                    </div>
                    <p>Tem certeza que deseja excluir esta transação?</p>
                    <p id="delete-trans-info" style="font-weight: bold; color: #ef4444;"></p>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="Transactions.closeDeleteModal()">Cancelar</button>
                        <button type="button" class="btn-danger" onclick="Transactions.confirmDelete()">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init(app) {
        this.app = app;
        this.deleteId = null;
        this.currentFilters = {
            type: 'all',
            category: 'all',
            dateFrom: '',
            dateTo: '',
            search: ''
        };
        
        await this.loadCategoriesForFilter();
        await this.loadTransactions();
        this.setupForm();
    },

    async loadCategoriesForFilter() {
        const { data: categories } = await window.supabaseClient
            .from('categories')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .order('name');

        const select = document.getElementById('filter-category');
        if (select && categories) {
            select.innerHTML = '<option value="all">Todas</option>' +
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    },

    async loadTransactions() {
        const list = document.getElementById('transactions-list');
        list.innerHTML = '<div class="loading">Carregando...</div>';

        try {
            let query = window.supabaseClient
                .from('transactions')
                .select('*')
                .eq('family_id', this.app.currentFamily.id)
                .order('date', { ascending: false });

            // Aplicar filtros
            if (this.currentFilters.type !== 'all') {
                query = query.eq('type', this.currentFilters.type);
            }
            
            if (this.currentFilters.category !== 'all') {
                query = query.eq('category_id', this.currentFilters.category);
            }
            
            if (this.currentFilters.dateFrom) {
                query = query.gte('date', this.currentFilters.dateFrom);
            }
            
            if (this.currentFilters.dateTo) {
                query = query.lte('date', this.currentFilters.dateTo);
            }
            
            if (this.currentFilters.search) {
                query = query.ilike('description', `%${this.currentFilters.search}%`);
            }

            const { data: transactions, error } = await query;

            if (error) throw error;

            if (!transactions || transactions.length === 0) {
                list.innerHTML = '<div class="empty-state">Nenhuma transação encontrada</div>';
                return;
            }

            // Buscar categorias para mostrar nomes
            const { data: categories } = await window.supabaseClient
                .from('categories')
                .select('id, name')
                .eq('family_id', this.app.currentFamily.id);

            const categoryMap = {};
            categories?.forEach(c => categoryMap[c.id] = c.name);

            list.innerHTML = transactions.map(t => `
                <div class="transaction-item ${t.type}">
                    <div class="transaction-icon">${this.getIcon(t.type)}</div>
                    <div class="transaction-info">
                        <div class="transaction-description">${t.description || 'Sem descrição'}</div>
                        <div class="transaction-meta">
                            ${categoryMap[t.category_id] || 'Sem categoria'} • 
                            ${new Date(t.date).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'} 
                        ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                    </div>
                    <button class="btn-icon btn-danger" onclick="Transactions.askDelete('${t.id}', '${t.description}', ${t.amount})" title="Excluir">
                        🗑️
                    </button>
                </div>
            `).join('');

        } catch (err) {
            console.error('Erro ao carregar transações:', err);
            list.innerHTML = '<div class="error-state">Erro ao carregar transações. Tente novamente.</div>';
        }
    },

    getIcon(type) {
        const icons = { income: '💰', expense: '💸', savings: '🎯', debt: '💳' };
        return icons[type] || '💰';
    },

    applyFilter(key, value) {
        this.currentFilters[key] = value;
        this.loadTransactions();
    },

    clearFilters() {
        this.currentFilters = {
            type: 'all',
            category: 'all',
            dateFrom: '',
            dateTo: '',
            search: ''
        };
        
        document.getElementById('filter-type').value = 'all';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-search').value = '';
        
        this.loadTransactions();
    },

    askDelete(id, description, amount) {
        this.deleteId = id;
        const info = document.getElementById('delete-trans-info');
        if (info) {
            info.textContent = `"${description}" - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}`;
        }
        document.getElementById('delete-trans-modal').style.display = 'flex';
    },

    async confirmDelete() {
        if (!this.deleteId) return;
        
        try {
            const { error } = await window.supabaseClient
                .from('transactions')
                .delete()
                .eq('id', this.deleteId)
                .eq('family_id', this.app.currentFamily.id); // Segurança extra

            if (error) throw error;
            
            this.closeDeleteModal();
            this.loadTransactions();
            alert('Transação excluída com sucesso!');
            
        } catch (err) {
            console.error('Erro ao excluir:', err);
            alert('Erro ao excluir transação. Tente novamente.');
        }
    },

    closeDeleteModal() {
        document.getElementById('delete-trans-modal').style.display = 'none';
        this.deleteId = null;
    },

    async onTypeChange() {
        const type = document.getElementById('trans-type').value;
        const debtGroup = document.getElementById('debt-select-group');
        const categoryGroup = document.getElementById('category-group');
        const categorySelect = document.getElementById('trans-category');
        
        if (!type) {
            categorySelect.innerHTML = '<option value="">Selecione primeiro o tipo...</option>';
            return;
        }
        
        if (type === 'debt') {
            debtGroup.style.display = 'block';
            categoryGroup.style.display = 'none';
            await this.loadDebtsSelect();
        } else {
            debtGroup.style.display = 'none';
            categoryGroup.style.display = 'block';
            await this.loadCategoriesForModal(type);
        }
    },

    async loadDebtsSelect() {
        const { data: debts } = await window.supabaseClient
            .from('debts')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .eq('status', 'active');

        const select = document.getElementById('trans-debt');
        select.innerHTML = debts?.length 
            ? debts.map(d => `<option value="${d.id}">${d.description} - R$ ${d.total_amount}</option>`).join('')
            : '<option value="">Nenhuma dívida ativa</option>';
    },

    async loadCategoriesForModal(type) {
        const { data: categories } = await window.supabaseClient
            .from('categories')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .eq('type', type)
            .order('name');

        const select = document.getElementById('trans-category');
        select.innerHTML = categories?.length
            ? '<option value="">Selecione...</option>' + 
              categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
            : '<option value="">Nenhuma categoria disponível</option>';
    },

    setupForm() {
        const dateInput = document.getElementById('trans-date');
        if (dateInput) dateInput.valueAsDate = new Date();

        document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const type = document.getElementById('trans-type').value;
            const amount = parseFloat(document.getElementById('trans-amount').value);
            const description = document.getElementById('trans-description').value;
            const date = document.getElementById('trans-date').value;
            
            if (!type || !amount || !description || !date) {
                alert('Preencha todos os campos obrigatórios!');
                return;
            }

            let categoryId = document.getElementById('trans-category').value;
            let debtId = null;
            
            try {
                if (type === 'debt') {
                    debtId = document.getElementById('trans-debt').value;
                    if (!debtId) {
                        alert('Selecione uma dívida!');
                        return;
                    }
                    
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
                }

                const { error } = await window.supabaseClient.from('transactions').insert([{
                    family_id: this.app.currentFamily.id,
                    user_id: this.app.currentUser.id,
                    type,
                    amount,
                    description,
                    category_id: categoryId || null,
                    date,
                    debt_id: debtId
                }]);

                if (error) throw error;

                this.closeModal();
                this.loadTransactions();
                alert('Transação salva com sucesso!');
                
            } catch (err) {
                console.error('Erro ao salvar:', err);
                alert('Erro ao salvar transação. Tente novamente.');
            }
        });
    },

    openModal() {
        document.getElementById('transaction-modal').style.display = 'flex';
        document.getElementById('transaction-form')?.reset();
        document.getElementById('trans-date').valueAsDate = new Date();
        this.onTypeChange();
    },

    closeModal() {
        document.getElementById('transaction-modal').style.display = 'none';
    }
};
