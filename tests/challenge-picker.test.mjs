import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const code = readFileSync(new URL('../www/challenge-picker.js', import.meta.url), 'utf8');

function picker() {
  const documentEvents = {}, windowEvents = {};
  let document;
  class Element {
    constructor(parent = null) { this.parent = parent; this.handlers = {}; this.attrs = {}; this.dataset = {}; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    setAttribute(key, value) { this.attrs[key] = value; }
    contains(node) { return !!node && (node === this || this.contains(node.parent)); }
    focus() {
      const previous = document.activeElement;
      document.activeElement = this;
      if (previous && root.contains(previous)) root.handlers.focusout?.({ relatedTarget: this });
    }
    dispatchEvent(event) { this.handlers[event.type]?.(event); }
  }
  const root = new Element();
  const trigger = new Element(root), label = new Element(trigger), list = new Element(root);
  const options = [...html.matchAll(/role="option" tabindex="-1" data-value="([^"]+)" aria-selected="(true|false)">([^<]+)</g)].map(([, value, selected, text]) => {
    const option = new Element(list);
    option.dataset.value = value;
    option.attrs['aria-selected'] = selected;
    option.textContent = text;
    return option;
  });
  assert.equal(options.length, 3);
  trigger.value = options[0].dataset.value;
  trigger.attrs['aria-expanded'] = 'false';
  label.textContent = options[0].textContent;
  list.hidden = true;
  list.querySelectorAll = () => options;
  const elements = { 'challenge-picker': root, 'challenge-choice': trigger, 'challenge-value': label, 'challenge-list': list };
  document = { activeElement: trigger, getElementById: id => elements[id], addEventListener: (type, fn) => { documentEvents[type] = fn; } };
  vm.runInNewContext(code, { document, window: { addEventListener: (type, fn) => { windowEvents[type] = fn; } }, Event, Date });
  function key(key, extra = {}) {
    const event = { key, repeat: false, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
    root.handlers.keydown(event);
    return event;
  }
  return { trigger, label, list, options, document, documentEvents, windowEvents, key };
}

test('pointer selection updates the challenge consumed by the game and marks the selected option', () => {
  const p = picker();
  let changed = 0;
  p.trigger.addEventListener('change', () => changed++);
  p.trigger.handlers.click();
  assert.equal(p.list.hidden, false);
  assert.equal(p.trigger.attrs['aria-expanded'], 'true');
  p.options[1].handlers.click();
  assert.equal(p.trigger.value, 'sparks');
  assert.equal(p.label.textContent, 'COLLECT 20 SPARKS');
  assert.equal(p.list.hidden, true);
  assert.equal(p.document.activeElement, p.trigger);
  assert.equal(changed, 1);
  assert.deepEqual(p.options.map(option => option.attrs['aria-selected']), ['false', 'true', 'false']);
  p.trigger.handlers.click();
  assert.equal(p.document.activeElement, p.options[1]);
});

test('keyboard navigation, Space selection, and Escape cancellation do not trigger game controls', () => {
  const p = picker();
  assert.equal(p.key(' ').stopped, true);
  assert.equal(p.key(' ', { repeat: true }).prevented, true);
  assert.equal(p.list.hidden, false, 'Holding Space does not immediately select');
  p.key('ArrowUp');
  assert.equal(p.document.activeElement, p.options[2]);
  const selected = p.key(' ');
  assert.equal(selected.stopped && selected.prevented, true);
  assert.equal(p.trigger.value, 'perfects');
  p.key('Home');
  assert.equal(p.document.activeElement, p.options[0]);
  assert.equal(p.key('Escape').stopped, true);
  assert.equal(p.list.hidden, true);
  assert.equal(p.trigger.value, 'perfects', 'Browsing an option does not commit it');
  p.key('End');
  p.key('ArrowDown');
  assert.equal(p.document.activeElement, p.options[0]);
  p.key('Enter');
  assert.equal(p.trigger.value, 'survive');
});

test('Tab, outside pointer, focus loss, and window blur dismiss the menu', () => {
  const p = picker();
  p.trigger.handlers.click();
  assert.equal(p.key('Tab').prevented, false, 'Allow the browser to move to the next control');
  assert.equal(p.document.activeElement, p.trigger);
  assert.equal(p.list.hidden, true);
  p.trigger.handlers.click();
  p.documentEvents.pointerdown({ target: p.options[2] });
  assert.equal(p.list.hidden, false);
  p.documentEvents.pointerdown({ target: {} });
  assert.equal(p.list.hidden, true);
  p.trigger.handlers.click();
  p.windowEvents.blur();
  assert.equal(p.list.hidden, true);
  p.trigger.handlers.click();
  // A focusable element outside the picker receives focus.
  const outside = new p.trigger.constructor();
  outside.focus();
  assert.equal(p.list.hidden, true);
  assert.equal(p.trigger.value, 'survive');
});

test('typing a label finds an option without committing until Enter', () => {
  const p = picker();
  p.key('c');
  p.key('h');
  assert.equal(p.document.activeElement, p.options[2]);
  assert.equal(p.trigger.value, 'survive');
  p.key('Enter');
  assert.equal(p.trigger.value, 'perfects');
  assert.equal(p.key('r', { metaKey: true }).prevented, false, 'Browser shortcuts are preserved');
});
