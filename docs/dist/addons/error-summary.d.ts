import { C as ValidatorAddon, L as FieldController, t as A11yFormValidator } from "../A11yFormValidator.js";

//#region src/addons/error-summary.d.ts
interface ErrorSummaryAddonOptions {
  titleId?: string;
}
interface SummaryEntry {
  field: FieldController | null;
  message: string;
  key?: string;
}
interface ErrorSummaryAddon extends ValidatorAddon {
  validator: A11yFormValidator | null;
  options: ErrorSummaryAddonOptions;
  container: HTMLElement | null;
  title: HTMLHeadingElement | null;
  list: HTMLUListElement | null;
  unsubscribeAfterValidate?: () => void;
  unsubscribeDestroy?: () => void;
  getErrors(): SummaryEntry[];
  update(): void;
  hasErrors(): boolean;
  focus(): void;
  destroy(): void;
}
declare function createErrorSummaryAddon(options?: ErrorSummaryAddonOptions): ErrorSummaryAddon;
//#endregion
export { ErrorSummaryAddon, ErrorSummaryAddonOptions, SummaryEntry, createErrorSummaryAddon, createErrorSummaryAddon as default };
//# sourceMappingURL=error-summary.d.ts.map