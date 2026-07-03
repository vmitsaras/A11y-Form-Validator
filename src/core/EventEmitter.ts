export class EventEmitter {
  readonly target: EventTarget;

  constructor(target: EventTarget) {
    this.target = target;
  }

  emit(name: string, detail: Record<string, unknown> = {}): void {
    this.target.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        detail
      })
    );
  }

  on(name: string, handler: EventListener): () => void {
    this.target.addEventListener(name, handler);
    return () => this.off(name, handler);
  }

  off(name: string, handler: EventListener): void {
    this.target.removeEventListener(name, handler);
  }
}
