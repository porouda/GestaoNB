// js/auth-check.js

(async function() {
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path === "/" || 
                        path === "" || 
                        path.endsWith("/index.html") || 
                        path.endsWith("/index.php") || 
                        path.endsWith("/login.html");
    
    if (isLoginPage) return;

    try {
        const response = await fetch('/api/check-session-node');
        if (!response.ok) throw new Error("Not authorized");
        
        const result = await response.json();

        if (result.status === 'authorized') {
            document.documentElement.style.display = 'block';
            window.usuarioLogado = result.user;
            window.permissoesUsuario = result.user.permissions || [];
            window.authReady = true;
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('permissionsLoaded'));
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error("Erro na verificação:", error);
        window.location.href = 'login.html';
    }
})();
