import { modalManager } from './modalManager';
import type { ModalType } from './modalManager';

const MULTIPLE_MENUS_DISABLED = '⚠ <br/>opening multiple menus is disabled';

const exclusiveMenuPermission = (allowDuplicateStyles = false): ModalPermission['canOpen'] => state => {
  if (state.settings.allowMultipleMenus) return { allowed: true };
  if (allowDuplicateStyles && state.settings.allowDuplicateMenus && state.openModals.some(modal => modal.type === 'styles')) {
    return { allowed: true };
  }
  if (state.openModals.length > 0) {
    return { allowed: false, reason: MULTIPLE_MENUS_DISABLED };
  }
  return { allowed: true };
};

const alwaysAllowed: ModalPermission['canOpen'] = () => ({ allowed: true });

// This exhaustive table is the single source of truth for modal permissions.
// Adding a ModalType without adding a policy here is a compile-time error.
const modalPolicies: Record<ModalType, ModalPermission['canOpen']> = {
  settings: exclusiveMenuPermission(),
  styles: exclusiveMenuPermission(true),
  export: exclusiveMenuPermission(),
  torusMenuEditor: exclusiveMenuPermission(),
  playneedleEditor: exclusiveMenuPermission(),
  colorPicker: alwaysAllowed,
  rollDialog: alwaysAllowed,
  shaderSelector: exclusiveMenuPermission(),
};

export function registerModalPermissions(): void {
  (Object.keys(modalPolicies) as ModalType[]).forEach(id => {
    modalManager.registerPermission({ id, canOpen: modalPolicies[id] });
  });
}

// Toast notifications are handled directly via Toast.show() from '../components/Toast'
