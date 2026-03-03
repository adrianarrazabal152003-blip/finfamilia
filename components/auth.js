import { supabase } from '../supabase-client.js';

export const Auth = {
    render() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="logo">
                        <h1>💜 FinFamília</h1>
                        <p>Gestão financeira familiar inteligente</p>
                    </div>
                    
                    <div class="auth-tabs">
                        <button class="tab-btn active" onclick="Auth.showTab('login')">Login</button>
                        <button class="tab-btn" onclick="Auth.showTab('register')">Cadastro</button>
                    </div>
                    
                    <div id="login-tab" class="auth-tab-content active">
                        <form id="login-form">
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="login-email" required placeholder="seu@email.com">
                            </div>
                            <div class="form-group">
                                <label>Senha</label>
                                <input type="password" id="login-password" required placeholder="••••••••">
                            </div>
                            <button type="submit" class="btn-primary btn-full">Entrar</button>
                        </form>
                    </div>
                    
                    <div id="register-tab" class="auth-tab-content">
                        <form id="register-form">
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="register-email" required placeholder="seu@email.com">
                            </div>
                            <div class="form-group">
                                <label>Senha</label>
                                <input type="password" id="register-password" required minlength="6" placeholder="Mínimo 6 caracteres">
                            </div>
                            <button type="submit" class="btn-primary btn-full">Criar Conta</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    showTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-tab-content').forEach(content => content.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    },

    init(app) {
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) alert(error.message);
        });

        document.getElementById('register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            
            const { error } = await supabase.auth.signUp({ email, password });
            
            if (error) {
                alert(error.message);
            } else {
                alert('Conta criada! Verifique seu email.');
            }
        });
    }
};