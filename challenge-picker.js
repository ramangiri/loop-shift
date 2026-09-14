(() => {
  const root = document.getElementById('challenge-picker');
  const trigger = document.getElementById('challenge-choice');
  const label = document.getElementById('challenge-value');
  const list = document.getElementById('challenge-list');
  const options = [...list.querySelectorAll('[role="option"]')];
  let search = '', searchTime = 0;
  const selectedIndex = () => Math.max(0, options.findIndex(option => option.dataset.value === trigger.value));

  function close(restoreFocus = false) {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    search = '';
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  function open(index = selectedIndex()) {
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    options[index].focus({ preventScroll: true });
  }

  function choose(index) {
    trigger.value = options[index].dataset.value;
    label.textContent = options[index].textContent;
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
    close(true);
    trigger.dispatchEvent(new Event('change', { bubbles: true }));
  }

  trigger.addEventListener('click', () => list.hidden ? open() : close(true));
  options.forEach((option, index) => option.addEventListener('click', () => choose(index)));

  root.addEventListener('keydown', event => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Tab') {
      // Restore the trigger in the tab sequence before the browser moves on.
      if (!list.hidden) close(true);
      return;
    }
    if (event.key === 'Escape') {
      if (!list.hidden) { event.preventDefault(); event.stopPropagation(); close(true); }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation(); // Space selects an option; it must not start a round.
      if ((event.key === 'Enter' || event.key === ' ') && event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        if (list.hidden) open();
        else if (index >= 0) choose(index);
        else close(true);
      } else if (event.key === 'Home') open(0);
      else if (event.key === 'End') open(options.length - 1);
      else if (list.hidden) open();
      else open((index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      search = now - searchTime < 600 ? search + event.key.toUpperCase() : event.key.toUpperCase();
      searchTime = now;
      const match = options.findIndex(option => option.textContent.trim().startsWith(search));
      if (match >= 0) open(match);
    }
  });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) close(); });
  document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) close(); });
  window.addEventListener('blur', () => close());
})();
