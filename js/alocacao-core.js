import { db, auth, doc, setDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, handleFirestoreError } from './firebase-config.js';

// alocacao-core.js

export async function registrarLog(acao, descricao, registroId = null) {
    try {
        await addDoc(collection(db, 'logs'), {
            acao: acao,
            descricao: descricao,
            registro_id: registroId,
            usuario_id: auth.currentUser?.uid,
            usuario_nome: window.usuarioLogado?.nome || 'Sistema',
            data: serverTimestamp()
        });
    } catch (e) {
        console.error("Erro ao registrar log:", e);
    }
}

export function atualizarNumeracaoStaffs(treinamentoId) {
    const container = document.querySelector(`.staffs-allocated[data-treinamento-id="${treinamentoId}"]`);
    if (!container) return;

    const elementos = Array.from(container.children);
    elementos.forEach((el, i) => {
        let texto = el.textContent;
        texto = texto.replace(/^\d+\.\s*/, '').replace(/⚠️/g, '').trim();
        const nomeLimpo = texto;
        const motivo = el.getAttribute('data-motivo');
        const icone = (motivo && motivo.trim() !== "") ? ' ⚠️' : '';

        if (el.classList.contains('status-recusado')) {
            el.textContent = `${nomeLimpo}${icone}`;
        } else {
            el.textContent = `${i + 1}. ${nomeLimpo}${icone}`;
        }
    });
}

export function verificarDuplicidadeStaffsNoDia() {
    const alocados = document.querySelectorAll('.staffs-allocated .staff-item');
    const contagem = {};
    
    alocados.forEach(el => {
        const sid = el.getAttribute('data-staff-id');
        contagem[sid] = (contagem[sid] || 0) + 1;
    });

    alocados.forEach(el => {
        const sid = el.getAttribute('data-staff-id');
        if (contagem[sid] > 1) {
            el.classList.add('is-duplicate');
        } else {
            el.classList.remove('is-duplicate');
        }
    });
}
