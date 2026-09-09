import { SETTINGS_CHANGED_EVENT, getSettingsChangedDetail } from './settingsEvents';

export type ModalType = 'settings' | 'styles' | 'export' | 'torusMenuEditor' | 'playneedleEditor' | 'colorPicker' | 'rollDialog' | 'shaderSelector';

export interface ModalPermission {
  id: ModalType;
  canOpen: (state: ModalManagerState) => { allowed: boolean; reason?: string };
}

export interface ModalManagerState {
  openModals: ModalInstance[];
  settings: {
    allowMultipleMenus: boolean;
    allowDuplicateMenus: boolean;
    allowEditsWhenMenuOpen: boolean;
  };
}

export interface ModalInstance {
  id: number;
  type: ModalType;
}

interface ModalRegistration extends ModalInstance {
  close?: () => void;
}

interface ModalRequest {
  allowed: boolean;
  reason?: string;
  id?: number;
}

class ModalManager {
  private state: ModalManagerState = {
    openModals: [],
    settings: {
      allowMultipleMenus: true,
      allowDuplicateMenus: false,
      allowEditsWhenMenuOpen: true,
    }
  };
  
  private permissions: Map<ModalType, ModalPermission> = new Map();
  private listeners: Set<(state: ModalManagerState) => void> = new Set();
  private instances: ModalRegistration[] = [];
  private nextInstanceId = 1;
  
  constructor() {
    // Initialize settings from localStorage so the manager reflects
    // persisted user preferences on app startup.
    try {
      const v = window.localStorage.getItem('juicecut.settings.allowMultipleMenus');
      if (v !== null) {
        this.state.settings.allowMultipleMenus = v === 'true';
      }
    } catch {}
    
    // Keep in sync with the rest of the app via the global settings-changed event.
    window.addEventListener(SETTINGS_CHANGED_EVENT, ((e: Event) => {
      const detail = getSettingsChangedDetail(e);
      if (!detail) return;
      const { key, value } = detail;
      if (key in this.state.settings && typeof value === 'boolean') {
        this.state.settings[key as keyof ModalManagerState['settings']] = value;
        this.notifyListeners();
      }
    }) as EventListener);

    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (this.closeTop()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }
  
  // Subscribe to state changes
  subscribe(listener: (state: ModalManagerState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Get current state
  getState(): ModalManagerState {
    return this.state;
  }
  
  // Register permission rules for a modal type (call once during init)
  registerPermission(permission: ModalPermission) {
    this.permissions.set(permission.id, permission);
  }
  
  // Update settings
  updateSettings(key: keyof ModalManagerState['settings'], value: boolean) {
    this.state.settings[key] = value;
    this.notifyListeners();
  }
  
  // Request to open a modal - returns whether it's allowed and optional reason
  requestOpen(modalType: ModalType): ModalRequest {
    const permission = this.permissions.get(modalType);
    
    if (permission) {
      const result = permission.canOpen(this.state);
      if (!result.allowed) {
        return result;
      }
    }
    
    const id = this.nextInstanceId++;
    this.instances.push({ id, type: modalType });
    this.state.openModals = [...this.state.openModals, { id, type: modalType }];
    this.notifyListeners();
    return { allowed: true, id };
  }

  registerClose(id: number, close: () => void): void {
    const instance = this.instances.find(item => item.id === id);
    if (instance) instance.close = close;
  }

  unregister(id: number): void {
    this.removeInstance(id);
  }

  close(modalType: ModalType) {
    const instance = [...this.instances].reverse().find(item => item.type === modalType);
    if (instance) this.closeInstance(instance.id);
  }

  closeInstance(id: number): void {
    const instance = this.instances.find(item => item.id === id);
    if (!instance) return;
    this.removeInstance(id);
    instance.close?.();
  }

  closeTop(): boolean {
    const instance = this.instances[this.instances.length - 1];
    if (!instance) return false;
    this.closeInstance(instance.id);
    return true;
  }
  
  // Check if a specific modal is open
  isOpen(modalType: ModalType): boolean {
    return this.state.openModals.some(instance => instance.type === modalType);
  }
  
  // Check if any modal is open
  hasAnyOpen(): boolean {
    return this.state.openModals.length > 0;
  }
  
  // Get count of how many times a specific modal is open
  getOpenCount(modalType: ModalType): number {
    return this.instances.filter(instance => instance.type === modalType).length;
  }

  private removeInstance(id: number): void {
    const index = this.instances.findIndex(instance => instance.id === id);
    if (index === -1) return;
    this.instances.splice(index, 1);
    this.state.openModals = this.state.openModals.filter(instance => instance.id !== id);
    this.notifyListeners();
  }
  
  // Notify all listeners of state change
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Singleton instance
export const modalManager = new ModalManager();

// Export helper functions for global access
export const __canOpenModal = (): boolean => {
  return modalManager.getState().settings.allowMultipleMenus || !modalManager.hasAnyOpen();
};

export const __isAnyModalOpen = (): boolean => {
  return modalManager.hasAnyOpen();
};