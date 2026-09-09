import { modalManager } from './modalManager';
import type { ModalType } from './modalManager';

// Register all modal permission rules here
// This is where all the complex if-else logic lives centralized

export function registerModalPermissions() {
  // Settings modal
  modalManager.registerPermission({
    id: 'settings',
    canOpen: (state) => {
      // If allow multiple menus is true, always allow
      if (state.settings.allowMultipleMenus) {
        return { allowed: true };
      }
      
      // If any modal is open, block it
      if (state.openModals.length > 0) {
        return { 
          allowed: false, 
          reason: '⚠ <br/>opening multiple menus is disabled' 
        };
      }
      
      return { allowed: true };
    }
  });
  
  // Styles modal
  modalManager.registerPermission({
    id: 'styles',
    canOpen: (state) => {
      // If allow multiple menus is true, always allow
      if (state.settings.allowMultipleMenus) {
        return { allowed: true };
      }
      
      // If allowing duplicate menus and one is already open, still allow
      if (state.settings.allowDuplicateMenus && state.openModals.some(modal => modal.type === 'styles')) {
        return { allowed: true };
      }
      
      // If any modal is open, block it
      if (state.openModals.length > 0) {
        return { 
          allowed: false, 
          reason: '⚠ <br/>opening multiple menus is disabled' 
        };
      }
      
      return { allowed: true };
    }
  });
  
  // Export modal
  modalManager.registerPermission({
    id: 'export',
    canOpen: (state) => {
      if (state.settings.allowMultipleMenus) {
        return { allowed: true };
      }
      
      if (state.openModals.length > 0) {
        return { 
          allowed: false, 
          reason: '⚠ <br/>opening multiple menus is disabled' 
        };
      }
      
      return { allowed: true };
    }
  });
  
  // Torus Menu Editor - similar logic
  modalManager.registerPermission({
    id: 'torusMenuEditor',
    canOpen: (state) => {
      if (state.settings.allowMultipleMenus) {
        return { allowed: true };
      }
      
      if (state.openModals.length > 0) {
        return { 
          allowed: false, 
          reason: '⚠ <br/>opening multiple menus is disabled' 
        };
      }
      
      return { allowed: true };
    }
  });
  
  // Playneedle Editor - similar logic
  modalManager.registerPermission({
    id: 'playneedleEditor',
    canOpen: (state) => {
      if (state.settings.allowMultipleMenus) {
        return { allowed: true };
      }
      
      if (state.openModals.length > 0) {
        return { 
          allowed: false, 
          reason: '⚠ <br/>opening multiple menus is disabled' 
        };
      }
      
      return { allowed: true };
    }
  });
  
  // Color Picker - should be allowed even when menus are open (it's inline)
  modalManager.registerPermission({
    id: 'colorPicker',
    canOpen: (state) => {
      return { allowed: true };
    }
  });
  
  // Roll Dialog - should be allowed (it's initiated from timeline)
  modalManager.registerPermission({
    id: 'rollDialog',
    canOpen: (state) => {
      return { allowed: true };
    }
  });
}

// Toast notifications are handled directly via Toast.show() from '../components/Toast'
