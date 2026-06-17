// js/perfil.js
import { db, doc, getDoc, updateDoc, handleFirestoreError } from './firebase-config.js';

async function carregarPerfil() {
    if (!window.usuarioLogado) {
        // Aguarda carregar o usuário se necessário
        window.addEventListener('permissionsLoaded', carregarPerfil);
        return;
    }

    const userId = window.usuarioLogado.id;
    console.log("Carregando perfil para ID:", userId);
    
    try {
        const docRef = doc(db, 'staffs', String(userId));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Preenche todos os campos automaticamente
            Object.keys(data).forEach(key => {
                const el = document.getElementById(key);
                if (el) el.value = data[key] || '';
            });
            // CPF e outros campos que podem vir do MySQL no login
            if (!data.cpf && window.usuarioLogado.cpf) document.getElementById('cpf').value = window.usuarioLogado.cpf;
        } else {
            console.error("Staff não encontrado no Firestore para ID:", userId);
            // Fallback para dados da sessão se disponíveis
            document.getElementById('nome_abreviado').value = window.usuarioLogado.nome || '';
        }
    } catch (error) {
        handleFirestoreError(error, 'GET', `staffs/${userId}`);
    }
}

function habilitarEdicao() {
    const temPoderAdmin = window.permissoesUsuario.includes('all') || window.permissoesUsuario.includes('cadastro-staffs.html');
    
    const inputs = document.querySelectorAll('#perfilForm input, #perfilForm select, #perfilForm textarea');
    
    inputs.forEach(input => {
        if (input.id === 'cpf') return;

        const isRestrito = input.hasAttribute('data-admin-only');
        
        if (isRestrito) {
            if (temPoderAdmin) {
                input.disabled = false;
            }
        } else {
            input.disabled = false;
        }
    });

    document.getElementById('perfilForm').classList.add('editable');
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnSave').style.display = 'block';
}

async function salvarPerfil(e) {
    e.preventDefault();
    const userId = window.usuarioLogado.id;
    
    const dados = {};
    const inputs = document.querySelectorAll('#perfilForm input, #perfilForm select, #perfilForm textarea');
    inputs.forEach(input => {
        if (input.id) dados[input.id] = input.value;
    });

    try {
        const docRef = doc(db, 'staffs', String(userId));
        await updateDoc(docRef, dados);
        alert("Perfil atualizado com sucesso no Firestore!");
        location.reload();
    } catch (error) {
        handleFirestoreError(error, 'UPDATE', `staffs/${userId}`);
        alert("Erro ao atualizar perfil. Verifique os logs.");
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarPerfil();
    document.getElementById('perfilForm').addEventListener('submit', salvarPerfil);
    window.habilitarEdicao = habilitarEdicao;
});
