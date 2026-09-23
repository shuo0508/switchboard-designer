// Shared confirmation dialog handling.
// returnValue is reset before every showModal(): closing with Esc does not overwrite
// returnValue, so a stale "apply" from a previous dialog must never trigger onApply.
export function openConfirmation(dialog, onApply) {
  dialog.returnValue = '';
  dialog.addEventListener('close', () => {
    const applied = dialog.returnValue === 'apply';
    dialog.returnValue = '';
    if (applied) onApply();
  }, { once: true });
  dialog.showModal();
}
