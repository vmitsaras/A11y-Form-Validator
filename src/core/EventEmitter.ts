export type EventHandler<Detail> = (event: CustomEvent<Detail>) => void;

export class EventEmitter<EventMap extends object = Record<string, unknown>> {
  readonly target: EventTarget;

  constructor(target: EventTarget) {
    this.target = target;
  }

  emit<Name extends keyof EventMap & string>(name: Name, detail: EventMap[Name]): void {
    this.target.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        detail
      })
    );
  }

  on<Name extends keyof EventMap & string>(name: Name, handler: EventHandler<EventMap[Name]>): () => void {
    this.target.addEventListener(name, handler as EventListener);
    return () => this.off(name, handler);
  }

  off<Name extends keyof EventMap & string>(name: Name, handler: EventHandler<EventMap[Name]>): void {
    this.target.removeEventListener(name, handler as EventListener);
  }
}
