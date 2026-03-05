const FinFamiliaApp = function() {
    this.currentUser = null;
    this.currentFamily = null;
    this.currentPage = 'dashboard';
    this.globalFilters = {
        member: 'all',
        period: 'month',
        startDate: null,
        endDate: null,
        category: 'all',
        description: '',
        type: 'all'
    };
    
    this.init();
};

FinFamiliaApp.prototype.init = async function() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (session) {
        this.currentUser = session.user;
        await this.loadUserFamily();
    }

    this.render();
    this.setupAuthListener();
};

FinFamiliaApp.prototype.setupAuthListener = function() {
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            this.currentUser = session.user;
            await this.loadUserFamily();
            this.render();
        } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.currentFamily = null;
            this.render();
        }
    });
};

FinFamiliaApp.prototype.loadUserFamily = async function() {
    const { data: member } = await window.supabaseClient
        .from('family_members')
        .select('family_id')
        .eq('user_id', this.currentUser.id)
        .single();
    
    if (member) {
        const { data: family } = await window.supabaseClient
            .from('families')
            .select('*')
            .eq('id', member.family_id)
            .single();
        this.currentFamily = family;
    }
};

FinFamiliaApp.prototype.setPage = function(page) {
    this.currentPage = page;
    this.render();
};

FinFamiliaApp.prototype.updateFilters = function(newFilters) {
    this.globalFilters = { ...this.globalFilters, ...newFilters };
    this.render();
};

FinFamiliaApp.prototype.render = function() {
    const app = document.getElementById('app');
    
    if (!this.currentUser) {
        app.innerHTML = Auth.render();
        Auth.init(this);
    } else if (!this.currentFamily) {
        app.innerHTML = this.renderFamilySetup();
        this.initFamilySetup();
    } else {
        app.innerHTML = `
            <div class="app-container">
                ${Sidebar.render(this.currentPage)}
                <main class="main-content">
                    ${this.renderPage()}
                </main>
            </div>
        `;
        this.initPage();
    }
};

FinFamiliaApp.prototype.renderFamilySetup = function() {
    return `
        <div class="family-setup">
            <div class="setup-card">
                <h2>Bem-vindo ao FinFamília!</h2>
                <p>Para começar, você precisa criar ou entrar em uma família.</p>
                
                <div class="setup-tabs">
                    <button class="tab-btn active" onclick="app.showTab('create')">Criar Família</button>
                    <button class="tab-btn" onclick="app.showTab('join')">Entrar com Código</button>
                </div>
                
                <div id="create-tab" class="tab-content active">
                    <form id="create-family-form">
                        <div class="form-group">
                            <label>Nome da Família</label>
                            <input type="text" id="family-name" required placeholder="Ex: Família Silva">
                        </div>
                        <button type="submit" class="btn-primary">Criar Família</button>
                    </form>
                </div>
                
                <div id="join-tab" class="tab-content">
                    <form id="join-family-form">
                        <div class="form-group">
                            <label>Código de Convite</label>
                            <input type="text" id="invite-code" required placeholder="Ex: ABC123XYZ">
                        </div>
                        <button type="submit" class="btn-primary">Entrar na Família</button>
                    </form>
                </div>
            </div>
        </div>
    `;
};

FinFamiliaApp.prototype.showTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
};

FinFamiliaApp.prototype.initFamilySetup = function() {
    const self = this;
    
    document.getElementById('create-family-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('family-name').value;
        const inviteCode = Math.random().toString(36).substring(2, 11).toUpperCase();
        
        const { data: family, error } = await window.supabaseClient
            .from('families')
            .insert([{ name, invite_code: inviteCode }])
            .select()
            .single();

        if (family) {
            await window.supabaseClient.from('family_members').insert([{
                family_id: family.id,
                user_id: self.currentUser.id,
                role: 'admin'
            }]);
            
            self.currentFamily = family;
            self.render();
        }
    });

    document.getElementById('join-family-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const code = document.getElementById('invite-code').value.toUpperCase();
        
        const { data: family } = await window.supabaseClient
            .from('families')
            .select('*')
            .eq('invite_code', code)
            .single();

        if (family) {
            await window.supabaseClient.from('family_members').insert([{
                family_id: family.id,
                user_id: self.currentUser.id,
                role: 'member'
            }]);

            self.currentFamily = family;
            self.render();
        } else {
            alert('Código de convite inválido!');
        }
    });
};

FinFamiliaApp.prototype.renderPage = function() {
    switch(this.currentPage) {
        case 'dashboard':
            return Dashboard.render();
        case 'transactions':
            return Transactions.render();
        case 'savings':
            return Savings.render();
        case 'debts':
            return Debts.render();
        case 'settings':
            return this.renderSettings();
        default:
            return Dashboard.render();
    }
};

FinFamiliaApp.prototype.initPage = function() {
    const self = this;
    Sidebar.init(this);
    
    switch(this.currentPage) {
        case 'dashboard':
            Dashboard.init(this);
            break;
        case 'transactions':
            Transactions.init(this);
            break;
        case 'savings':
            Savings.init(this);
            break;
        case 'debts':
            Debts.init(this);
            break;
    }
};

FinFamiliaApp.prototype.renderSettings = function() {
    return `
        <div class="page-header">
            <h1>Configurações</h1>
        </div>
        <div class="settings-container">
            <div class="settings-card">
                <h3>Informações da Família</h3>
                <p><strong>Nome:</strong> ${this.currentFamily?.name}</p>
                <p><strong>Código de Convite:</strong> <span class="invite-code">${this.currentFamily?.invite_code}</span></p>
                <button class="btn-secondary" onclick="navigator.clipboard.writeText('${this.currentFamily?.invite_code}')">
                    Copiar Código
                </button>
            </div>
            <div class="settings-card">
                <h3>Conta</h3>
                <button class="btn-danger" onclick="app.logout()">Sair</button>
            </div>
        </div>
    `;
};

FinFamiliaApp.prototype.logout = async function() {
    await window.supabaseClient.auth.signOut();
};

window.app = new FinFamiliaApp();
