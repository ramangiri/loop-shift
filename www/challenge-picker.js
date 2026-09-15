(() => {
  const root = document.getElementById('challenge-picker');
  const value = document.getElementById('challenge-choice');
  const buttons = [...root.querySelectorAll('[data-value]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    value.value = button.dataset.value;
    buttons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  }));
})();
