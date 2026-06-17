import { db, collection, getDocs, doc, getDoc, updateDoc, handleFirestoreError } from './firebase-config.js';

const paginasSistema = [
    'home',
    'cadastro-staffs',
    'consulta-staffs',
    'cadastro-treinamentos',
    'consulta-treinamentos',
    'estoque',
    'kanban',
    'checklist',
    'gestao-acessos',
    'perfil'
];

async function inicializar() {
    try {
        const select = document.getElementById('selectUsuario');
        if (!select) return;

        select.innerHTML = '<option value="">Carregando usuários...</option>';

        const querySnapshot = await getDocs(collection(db, 'staffs'));
        select.innerHTML = '<option value="">-- Selecione um Staff --</option>';
        
        querySnapshot.forEach((doc) => {
            const u = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${u.nome_abreviado || u.nome_completo} (${u.nivel_acesso || 'comum'})`;
            option.dataset.nivel = u.nivel_acesso || '';
            select.appendChild(option);
        });
    } catch (error) {
        handleFirestoreError(error, 'LIST', 'staffs');
    }
}

window.carregarPermissoesUsuario = async function() {
    const staffId = document.getElementById('selectUsuario').value;
    if (!staffId) {
        document.getElementById('areaPermissoes').style.display = 'none';
        return;
    }

    try {
        const docSnap = await getDoc(doc(db, 'staffs', staffId));
        const userData = docSnap.data();
        const perms = userData.permissoes || [];

        const grid = document.getElementById('gridPaginas');
        grid.innerHTML = '';

        paginasSistema.forEach(p => {
            const checked = perms.includes(p) ? 'checked' : '';
            grid.innerHTML += `
                <label class="page-card">
                    <input type="checkbox" class="chk-page" value="${p}" ${checked}>
                    <span>${p}</span>
                </label>
            `;
        });

        document.getElementById('areaPermissoes').style.display = 'block';
        document.getElementById('btnReset').style.display = 'block';
        document.getElementById('infoNivel').innerText = "Cargo: " + (userData.nivel_acesso || 'N/A');
    } catch (error) {
        handleFirestoreError(error, 'GET', `staffs/${staffId}`);
    }
}

window.salvarPermissoes = async function() {
    const staffId = document.getElementById('selectUsuario').value;
    const selecionadas = Array.from(document.querySelectorAll('.chk-page:checked')).map(c => c.value);

    try {
        await updateDoc(doc(db, 'staffs', staffId), {
            permissoes: selecionadas
        });
        alert("Permissões salvas!");
    } catch (error) {
        handleFirestoreError(error, 'UPDATE', `staffs/${staffId}`);
    }
}

window.resetarParaPadrao = async function() {
    const nivel = document.getElementById('selectUsuario').selectedOptions[0].dataset.nivel;
    if(!confirm(`Isso voltará para o padrão do cargo (${nivel}). Confirma?`)) return;

    let padrao = [];
    if (nivel === 'admin') {
        padrao = [...paginasSistema];
    } else {
        padrao = ['home', 'perfil', 'kanban']; // Exemplo de padrão
    }

    const staffId = document.getElementById('selectUsuario').value;
    try {
        await updateDoc(doc(db, 'staffs', staffId), {
            permissoes: padrao
        });
        await window.carregarPermissoesUsuario();
    } catch (error) {
        handleFirestoreError(error, 'UPDATE', `staffs/${staffId}`);
    }
}

document.addEventListener('DOMContentLoaded', inicializar);
