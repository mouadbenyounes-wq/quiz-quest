// Portail d'accès léger avant le lancement officiel.
// ⚠️ Ce n'est pas une vraie sécurité : le site est statique (GitHub Pages),
// donc un visiteur qui inspecte le code peut retrouver la logique. Ça sert
// uniquement à décourager les visiteurs occasionnels avant le lancement.

(function () {
  const STORAGE_KEY = 'quizquest_unlocked';
  const PASSWORD_HASH = '0578c5bee26da7acb4cbda2114a92f533d7d433b890e8c94a2654815e3c90269';

  const gate = document.getElementById('access-gate');
  if (!gate) return;

  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    gate.remove();
    return;
  }

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const form = document.getElementById('access-gate-form');
  const input = document.getElementById('access-gate-input');
  const error = document.getElementById('access-gate-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(input.value);
    if (hash === PASSWORD_HASH) {
      localStorage.setItem(STORAGE_KEY, 'true');
      gate.remove();
    } else {
      error.hidden = false;
      gate.querySelector('.access-gate-panel').classList.remove('shake');
      // force reflow pour rejouer l'animation
      void gate.querySelector('.access-gate-panel').offsetWidth;
      gate.querySelector('.access-gate-panel').classList.add('shake');
      input.value = '';
      input.focus();
    }
  });
})();
