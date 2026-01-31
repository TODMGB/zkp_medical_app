import { nextTick, reactive, readonly } from 'vue';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type DialogMode = 'alert' | 'confirm' | 'prompt';

export interface ToastOptions {
  type?: ToastType;
  durationMs?: number;
}

export interface DialogOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
}

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface DialogViewState {
  open: boolean;
  mode: DialogMode;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  placeholder: string;
  input: string;
}

interface DialogRequest {
  mode: DialogMode;
  options: DialogOptions;
  resolve: (value: any) => void;
}

const state = reactive({
  toasts: [] as ToastItem[],
  dialog: {
    open: false,
    mode: 'alert' as DialogMode,
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    placeholder: '',
    input: '',
  } as DialogViewState,
});

let toastId = 0;
let activeDialog: DialogRequest | null = null;
const dialogQueue: DialogRequest[] = [];

function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message == null) return '';
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function enqueueDialog(req: DialogRequest) {
  dialogQueue.push(req);
  if (!activeDialog) {
    void presentNextDialog();
  }
}

async function presentNextDialog() {
  activeDialog = dialogQueue.shift() || null;
  if (!activeDialog) {
    state.dialog.open = false;
    return;
  }

  const { mode, options } = activeDialog;
  state.dialog.mode = mode;
  state.dialog.title = options.title || '';
  state.dialog.message = options.message || '';
  state.dialog.confirmText = options.confirmText || '确定';
  state.dialog.cancelText = options.cancelText || '取消';
  state.dialog.placeholder = options.placeholder || '';
  state.dialog.input = options.defaultValue || '';
  state.dialog.open = true;

  await nextTick();
}

function settleDialog(value: any) {
  const current = activeDialog;
  activeDialog = null;
  state.dialog.open = false;

  if (current) {
    current.resolve(value);
  }

  if (dialogQueue.length > 0) {
    void presentNextDialog();
  }
}

function toast(message: unknown, options: ToastOptions = {}) {
  const item: ToastItem = {
    id: ++toastId,
    type: options.type || 'info',
    message: normalizeMessage(message),
  };

  state.toasts.push(item);

  const duration = typeof options.durationMs === 'number' ? options.durationMs : 2000;
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(item.id);
    }, duration);
  }
}

function dismissToast(id: number) {
  const idx = state.toasts.findIndex(t => t.id === id);
  if (idx >= 0) {
    state.toasts.splice(idx, 1);
  }
}

function alertDialog(message: unknown, options: Omit<DialogOptions, 'message'> = {}) {
  return new Promise<void>(resolve => {
    enqueueDialog({
      mode: 'alert',
      options: {
        ...options,
        message: normalizeMessage(message),
      },
      resolve: () => resolve(),
    });
  });
}

function confirmDialog(message: unknown, options: Omit<DialogOptions, 'message'> = {}) {
  return new Promise<boolean>(resolve => {
    enqueueDialog({
      mode: 'confirm',
      options: {
        ...options,
        message: normalizeMessage(message),
      },
      resolve,
    });
  });
}

function promptDialog(options: DialogOptions) {
  return new Promise<string | null>(resolve => {
    enqueueDialog({
      mode: 'prompt',
      options,
      resolve,
    });
  });
}

function dialogConfirm() {
  if (!activeDialog) return;

  if (state.dialog.mode === 'prompt') {
    settleDialog(state.dialog.input);
    return;
  }

  if (state.dialog.mode === 'confirm') {
    settleDialog(true);
    return;
  }

  settleDialog(undefined);
}

function setDialogInput(value: string) {
  state.dialog.input = value;
}

function dialogCancel() {
  if (!activeDialog) return;

  if (state.dialog.mode === 'confirm') {
    settleDialog(false);
    return;
  }

  if (state.dialog.mode === 'prompt') {
    settleDialog(null);
    return;
  }

  settleDialog(undefined);
}

export const uiService = {
  state: readonly(state),
  toast,
  dismissToast,
  alert: alertDialog,
  confirm: confirmDialog,
  prompt: promptDialog,
  setDialogInput,
  dialogConfirm,
  dialogCancel,
};
