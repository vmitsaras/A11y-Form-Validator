import { C as ValidatorAddon, L as FieldController, t as A11yFormValidator } from "../A11yFormValidator.js";

//#region src/addons/character-count.d.ts
interface CharacterCountMessages {
  remaining: string;
  over: string;
  minimum: string;
}
interface CharacterCountAddonOptions {
  selector?: string;
  threshold?: number;
  messages?: Partial<CharacterCountMessages>;
}
interface CharacterCountEntry {
  field: FieldController;
  counter: HTMLElement;
  max: number | null;
  min: number | null;
}
interface CharacterCountAddon extends ValidatorAddon {
  validator: A11yFormValidator | null;
  options: Required<Omit<CharacterCountAddonOptions, 'messages'>> & {
    messages: CharacterCountMessages;
  };
  counters: Map<string, CharacterCountEntry>;
  onInput: EventListener | null;
  unsubscribeAfterValidate?: () => void;
  unsubscribeDestroy?: () => void;
  installCounters(): void;
  shouldShow(length: number, max: number | null): boolean;
  update(input: FieldController | string | HTMLElement): void;
  updateAll(): void;
  destroy(): void;
}
declare function createCharacterCountAddon(options?: CharacterCountAddonOptions): CharacterCountAddon;
//#endregion
export { CharacterCountAddon, CharacterCountAddonOptions, CharacterCountMessages, createCharacterCountAddon, createCharacterCountAddon as default };
//# sourceMappingURL=character-count.d.ts.map