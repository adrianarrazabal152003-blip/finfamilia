const Dashboard = {
    charts: {},
    
    render() {
        return `
            <div class="page-header">
                <h1>Dashboard</h1>
                <button class="btn-primary" onclick="app.setPage('transactions')">
                    ➕ Nova Transação
                </button>
            </div>
            
            ${this.renderFilters()}
            
            <div class="cards-grid">
                <div class="card card-income">
                    <div class="card-label">Total Receita</div>
                    <div class="card-value" id="total-income">R$ 0,00</div>
                </div>
                <div class="card card-expense">
                    <div class="card-label">Total Despesa</div>
                    <div class="card-value" id="total-expense">R$ 0,00</div>
                </div>
                <div class="card card-balance">
                    <div class="card-label">Saldo Atual</div>
                    <div class="card-value" id="current-balance">R$ 0,00</div>
                </div>
                <div class="card card-debt">
                    <div class="card-label">Total Dívidas</div>
                    <div class="card-value" id="total-debts">R$ 0,00</div>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Receita vs Despesa</h3>
                    <canvas id="chart-income-expense"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Despesas por Categoria</h3>
                    <canvas id="chart-categories"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Top 10 Despesas por Descrição</h3>
                    <canvas id="chart-descriptions"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Controle de Dívidas</h3>
                    <canvas id="chart-debts"></canvas>
                </div>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div class="filters-bar">
                <div class="filter-group">
                    <label>Membro</label>
                    <select id="filter-member" onchange="Dashboard.updateFilter('member', this.value)">
                        <option value="all">Todos</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Período</label>
                    <select id="filter-period" onchange="Dashboard.updateFilter('period', this.value)">
                        <option value="today">Hoje</option>
                        <option value="week">Esta Semana</option>
                        <option value="month" selected>Este Mês</option>
                        <option value="year">Este Ano</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                <div class="filter-group custom-date" style="display:none">
                    <label>De</label>
                    <input type="date" id="filter-start" onchange="Dashboard.updateFilter('startDate', this.value)">
                </div>
                <div class="filter-group custom-date" style="display:none">
                    <label>Até</label>
                    <input type="date" id="filter-end" onchange="Dashboard.updateFilter('endDate', this.value)">
                </div>
                <div class="filter-group">
                    <label>Categoria</label>
                    <select id="filter-category" onchange="Dashboard.updateFilter('category', this.value)">
                        <option value="all">Todas</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Descrição</label>
                    <input type="text" id="filter-description" placeholder="Buscar..." 
                           oninput="Dashboard.updateFilter('description', this.value)">
                </div>
                <div class="filter-group">
                    <label>Tipo</label>
                    <select id="filter-type" onchange="Dashboard.updateFilter('type', this.value)">
                        <option value="all">Todos</option>
                        <option value="income">Receita</option>
                        <option value="expense">Despesa</option>
                        <option value="savings">Guardar</option>
                        <option value="debt">Dívida</option>
                    </select>
                </div>
            </div>
        `;
    },

    async init(app) {
        this.app = app;
        await this.loadFilters();
        await this.loadData();
        this.setupRealtime();
        
        document.getElementById('filter-period')?.addEventListener('change', (e) => {
            const customDates = document.querySelectorAll('.custom-date');
            customDates.forEach(el => el.style.display = e.target.value === 'custom' ? 'block' : 'none');
        });
    },

    async loadFilters() {
        const { data: members } = await window.supabaseClient
            .from('family_members')
            .select('user_id')
            .eq('family_id', this.app.currentFamily.id);

        const memberSelect = document.getElementById('filter-member');
        members?.forEach(m => {
            const option = document.createElement('option');
            option.value = m.user_id;
            option.textContent = 'Membro ' + m.user_id.substring(0,8);
            memberSelect.appendChild(option);
        });

        const { data: categories } = await window.supabaseClient
            .from('categories')
            .select('*')
            .eq('family_id', this.app.currentFamily.id);

        const categorySelect = document.getElementById('filter-category');
        categories?.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            categorySelect.appendChild(option);
        });
    },

    getDateRange() {
        const period = this.app.globalFilters.period;
        const now = new Date();
        let start, end;

        switch(period) {
            case 'today':
                start = new Date(now.setHours(0,0,0,0));
                end = new Date(now.setHours(23,59,59,999));
                break;
            case 'week':
                const day = now.getDay();
                start = new Date(now.setDate(now.getDate() - day));
                start.setHours(0,0,0,0);
                end = new Date(now.setDate(start.getDate() + 6));
                end.setHours(23,59,59,999);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'custom':
                start = this.app.globalFilters.startDate ? new Date(this.app.globalFilters.startDate) : null;
                end = this.app.globalFilters.endDate ? new Date(this.app.globalFilters.endDate) : null;
                break;
        }

        return { start, end };
    },

    async loadData() {
        const { start, end } = this.getDateRange();
        let query = window.supabaseClient
            .from('transactions')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .order('date', { ascending: false });

        if (start && end) {
            query = query.gte('date', start.toISOString()).lte('date', end.toISOString());
        }

        if (this.app.globalFilters.member !== 'all') {
            query = query.eq('user_id', this.app.globalFilters.member);
        }

        if (this.app.globalFilters.category !== 'all') {
            query = query.eq('category_id', this.app.globalFilters.category);
        }

        if (this.app.globalFilters.type !== 'all') {
            query = query.eq('type', this.app.globalFilters.type);
        }

        if (this.app.globalFilters.description) {
            query = query.ilike('description', `%${this.app.globalFilters.description}%`);
        }

        const { data: transactions } = await query;

        const totals = this.calculateTotals(transactions || []);
        this.updateCards(totals);
        this.updateCharts(transactions || []);
    },

    calculateTotals(transactions) {
        return transactions.reduce((acc, t) => {
            const amount = parseFloat(t.amount);
            switch(t.type) {
                case 'income': acc.income += amount; break;
                case 'expense': acc.expense += amount; break;
                case 'savings': acc.savings += amount; break;
                case 'debt': acc.debt += amount; break;
            }
            return acc;
        }, { income: 0, expense: 0, savings: 0, debt: 0 });
    },

    updateCards(totals) {
        document.getElementById('total-income').textContent = this.formatCurrency(totals.income);
        document.getElementById('total-expense').textContent = this.formatCurrency(totals.expense);
        document.getElementById('current-balance').textContent = this.formatCurrency(totals.income - totals.expense);
        document.getElementById('total-debts').textContent = this.formatCurrency(totals.debt);
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

async updateCharts(transactions) {
    this.updateIncomeExpenseChart(transactions);
    await this.updateCategoryChart(transactions);
    this.updateDescriptionChart(transactions);
    await this.updateDebtsChart();
},

    updateIncomeExpenseChart(transactions) {
        const ctx = document.getElementById('chart-income-expense');
        if (!ctx) return;

        const data = transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += parseFloat(t.amount);
            if (t.type === 'expense') acc.expense += parseFloat(t.amount);
            return acc;
        }, { income: 0, expense: 0 });

        if (this.charts.incomeExpense) this.charts.incomeExpense.destroy();

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Receita', 'Despesa'],
                datasets: [{
                    label: 'Valor',
                    data: [data.income, data.expense],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    updateCategoryChart(transactions) {
        const ctx = document.getElementById('chart-categories');
        if (!ctx) return;

        const expenses = transactions.filter(t => t.type === 'expense');
        const byCategory = expenses.reduce((acc, t) => {
            const cat = t.category_id || 'Sem Categoria';
            acc[cat] = (acc[cat] || 0) + parseFloat(t.amount);
            return acc;
        }, {});

        if (this.charts.categories) this.charts.categories.destroy();

        this.charts.categories = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(byCategory),
                datasets: [{
                    data: Object.values(byCategory),
                    backgroundColor: this.generateColors(Object.keys(byCategory).length)
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right' } }
            }
        });
    },

    updateDescriptionChart(transactions) {
        const ctx = document.getElementById('chart-descriptions');
        if (!ctx) return;

        const expenses = transactions.filter(t => t.type === 'expense');
        const byDescription = expenses.reduce((acc, t) => {
            const desc = t.description || 'Sem Descrição';
            acc[desc] = (acc[desc] || 0) + parseFloat(t.amount);
            return acc;
        }, {});

        const sorted = Object.entries(byDescription).sort((a, b) => b[1] - a[1]);
        const top10 = sorted.slice(0, 10);
        const others = sorted.slice(10).reduce((sum, [, val]) => sum + val, 0);

        const labels = top10.map(([desc]) => desc);
        const data = top10.map(([, val]) => val);
        
        if (others > 0) {
            labels.push('Outros');
            data.push(others);
        }

        if (this.charts.descriptions) this.charts.descriptions.destroy();

        this.charts.descriptions = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Valor',
                    data,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    },

    async updateDebtsChart() {
        const ctx = document.getElementById('chart-debts');
        if (!ctx) return;

        const { data: debts } = await window.supabaseClient
            .from('debts')
            .select('*')
            .eq('family_id', this.app.currentFamily.id)
            .eq('status', 'active')
            .order('total_amount', { ascending: false });

        if (!debts?.length) return;

        const labels = debts.map(d => d.description);
        const totalAmounts = debts.map(d => parseFloat(d.total_amount));
        const paidAmounts = debts.map(d => 0);

        if (this.charts.debts) this.charts.debts.destroy();

        this.charts.debts = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Total',
                        data: totalAmounts,
                        backgroundColor: '#ef4444',
                        borderRadius: 6
                    },
                    {
                        label: 'Pago',
                        data: paidAmounts,
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: { x: { beginAtZero: true, stacked: false } }
            }
        });
    },

    generateColors(count) {
        const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];
        return Array(count).fill(0).map((_, i) => colors[i % colors.length]);
    },

    setupRealtime() {
        const channels = ['transactions', 'debts', 'savings_goals'];
        
        channels.forEach(table => {
            window.supabaseClient.channel(`${table}-changes`)
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table, filter: `family_id=eq.${this.app.currentFamily.id}` },
                    () => this.loadData()
                )
                .subscribe();
        });
    },

    updateFilter(key, value) {
        this.app.updateFilters({ [key]: value });
    }
};

