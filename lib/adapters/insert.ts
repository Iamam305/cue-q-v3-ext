/** Set text on a native textarea/input and notify React-style listeners. */
export function insertIntoNativeInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  const setter = descriptor?.set;
  if (setter) {
    setter.call(element, text);
  } else {
    element.value = text;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Insert text into a contenteditable / ProseMirror editor. */
export function insertIntoContentEditable(
  element: HTMLElement,
  text: string,
): void {
  element.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);

  // Prefer execCommand so ProseMirror / Quill pick up the change.
  const inserted = document.execCommand('insertText', false, text);
  if (!inserted) {
    element.textContent = text;
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text,
      }),
    );
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function insertTextIntoComposer(
  element: HTMLElement,
  text: string,
): void {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    insertIntoNativeInput(element, text);
    return;
  }

  if (element.isContentEditable || element.getAttribute('contenteditable')) {
    insertIntoContentEditable(element, text);
    return;
  }

  // Fallback: nested contenteditable
  const nested = element.querySelector<HTMLElement>(
    '[contenteditable="true"]',
  );
  if (nested) {
    insertIntoContentEditable(nested, text);
    return;
  }

  const textarea = element.querySelector<HTMLTextAreaElement>('textarea');
  if (textarea) {
    insertIntoNativeInput(textarea, text);
  }
}
