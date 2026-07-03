import type { A11yFormValidator, ValidatorRenderer } from './A11yFormValidator.js';
import type { FieldController } from './FieldController.js';

export class ErrorRenderer implements ValidatorRenderer {
  readonly validator: A11yFormValidator;

  constructor(validator: A11yFormValidator) {
    this.validator = validator;
  }

  getNode(field: FieldController): HTMLElement | null {
    return this.validator.form.querySelector<HTMLElement>(`#${field.errorId}`);
  }

  shouldRenderInline(): boolean {
    return this.validator.options.errorMode !== 'native';
  }

  syncAnnouncementAttributes(errorNode: HTMLElement): void {
    if (this.validator.shouldAnnounceInlineErrors()) {
      errorNode.setAttribute('role', 'status');
      errorNode.setAttribute('aria-live', 'polite');
      errorNode.setAttribute('aria-atomic', 'true');
      return;
    }

    errorNode.removeAttribute('role');
    errorNode.removeAttribute('aria-live');
    errorNode.removeAttribute('aria-atomic');
  }

  setNativeMessage(field: FieldController, message: string): void {
    field.elements.forEach((element) => {
      element.setCustomValidity?.(message || '');
    });
  }

  getInsertionTarget(field: FieldController): Element {
    if (field.isGroupedChoice) {
      const fieldset = field.primaryElement.closest('fieldset');
      if (fieldset && this.validator.form.contains(fieldset)) {
        return fieldset;
      }
    }

    const label = field.primaryElement.closest('label');
    if (label && this.validator.form.contains(label)) {
      return label;
    }

    return field.primaryElement;
  }

  render(field: FieldController, message: string): void {
    this.setNativeMessage(field, message);
    const renderInline = this.shouldRenderInline();
    if (renderInline) {
      field.connectDescription(field.errorId);
    } else {
      field.disconnectDescription(field.errorId);
    }
    field.setAriaInvalid(true, renderInline ? field.errorId : '');
    field.setVisualState('invalid');

    if (!renderInline) {
      return;
    }

    let errorNode = this.getNode(field);
    if (!errorNode) {
      errorNode = this.validator.form.ownerDocument.createElement('div');
      errorNode.id = field.errorId;
      errorNode.className = 'a11y-form-validator__error';
      this.getInsertionTarget(field).insertAdjacentElement('afterend', errorNode);
    }

    this.syncAnnouncementAttributes(errorNode);
    errorNode.textContent = message;
  }

  clear(field: FieldController): void {
    const errorNode = this.getNode(field);
    if (errorNode) {
      errorNode.remove();
    }

    this.setNativeMessage(field, '');
    field.disconnectDescription(field.errorId);
    field.setAriaInvalid(false);
    field.setVisualState('valid');
  }

  destroy(): void {
    this.validator.fields.forEach((field) => this.clear(field));
  }
}
