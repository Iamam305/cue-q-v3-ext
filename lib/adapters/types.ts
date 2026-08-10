export interface AIChatAdapter {
  matches(): boolean;
  findComposer(): HTMLElement | null;
  insertText(element: HTMLElement, text: string): void;
}
