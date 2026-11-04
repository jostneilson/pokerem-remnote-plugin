/**
 * Stand-in for @remnote/plugin-sdk used only by the host simulator (tools/hostsim).
 * Each widget runs in an iframe with RemNote's real sandbox flags, so anything that depends on
 * origin (Web Locks, localStorage, CORS) fails here the same way it fails in the installed plugin.
 */
import { useEffect, useRef } from 'react';
import { render } from 'react-dom';

export const AppEvents = {
  QueueCompleteCard: 'QueueCompleteCard',
  StorageSyncedChange: 'StorageSyncedChange',
  MessageBroadcast: 'messaging.broadcast',
} as const;
export const WidgetLocation = {
  RightSidebar: 'RightSidebar',
  QueueToolbar: 'QueueToolbar',
  FloatingWidget: 'FloatingWidget',
} as const;
export type EventCallbackFn = (...args: unknown[]) => void;
export type RNPlugin = any;
export type ReactRNPlugin = any;

let rpcId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const listeners = new Set<(data: any) => void>();

window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.rpcReply != null) {
    const p = pending.get(d.rpcReply);
    if (!p) return;
    pending.delete(d.rpcReply);
    if (d.error) p.reject(new Error(d.error));
    else p.resolve(d.value);
    return;
  }
  if (d.dom) {
    let value: unknown = null;
    if (d.dom === 'text') value = (document.body.querySelector(':scope > div') as HTMLElement | null)?.innerText ?? '';
    if (d.dom === 'buttons') value = [...document.querySelectorAll('button')].map((b) => ({ text: (b as HTMLButtonElement).innerText.trim(), label: b.getAttribute('aria-label'), disabled: (b as HTMLButtonElement).disabled }));
    if (d.dom === 'click') {
      const all = [...document.querySelectorAll('button, summary')] as HTMLElement[];
      const needle = String(d.text).toLowerCase();
      const hit = all.find((b) => (b.innerText.trim().toLowerCase() === needle || (b.getAttribute('aria-label') ?? '').toLowerCase() === needle) && !(b as HTMLButtonElement).disabled)
        ?? all.find((b) => (b.innerText.toLowerCase().includes(needle) || (b.getAttribute('aria-label') ?? '').toLowerCase().includes(needle)) && !(b as HTMLButtonElement).disabled);
      if (hit) { hit.click(); value = hit.innerText.trim() || hit.getAttribute('aria-label'); }
    }
    if (d.dom === 'overflow') value = { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
    if (d.dom === 'images') value = [...document.images].map((i) => ({ src: i.src.slice(-50), ok: i.complete && i.naturalWidth > 0 }));
    parent.postMessage({ domReply: d.id, value }, '*');
    return;
  }
  for (const l of listeners) l(d);
});

window.addEventListener('error', (e) => parent.postMessage({ log: 'error', text: String(e.message) }, '*'));
window.addEventListener('unhandledrejection', (e) => parent.postMessage({ log: 'rejection', text: String((e as PromiseRejectionEvent).reason) }, '*'));
const realError = console.error.bind(console);
console.error = (...a: unknown[]) => { parent.postMessage({ log: 'console.error', text: a.map(String).join(' ') }, '*'); realError(...a); };

function rpc(method: string, ...args: unknown[]): Promise<any> {
  const id = ++rpcId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    parent.postMessage({ rpc: id, method, args }, '*');
  });
}

const eventListeners = new Set<{ event: string; cb: EventCallbackFn }>();
listeners.add((d) => {
  if (d.evt === 'queue') for (const l of eventListeners) if (l.event === AppEvents.QueueCompleteCard) l.cb(d.payload);
  // Like RemNote: broadcast listeners get `{ message }`. The key is ignored here (every listener hears every message).
  if (d.evt === 'broadcast') for (const l of eventListeners) if (l.event === AppEvents.MessageBroadcast) l.cb({ message: d.message });
});

const noopNamespace = () => new Proxy({}, { get: () => async () => undefined });
const plugin: any = {
  rootURL: `${(window as any).HOSTSIM_ROOT ?? ''}/`,
  storage: {
    getSynced: (k: string) => rpc('getSynced', k),
    setSynced: (k: string, v: unknown) => rpc('setSynced', k, v),
    getSession: (k: string) => rpc('getSession', k),
    setSession: (k: string, v: unknown) => rpc('setSession', k, v),
  },
  settings: {
    getSetting: (k: string) => rpc('getSetting', k),
    registerBooleanSetting: (d: any) => rpc('registerSetting', d.id, d.defaultValue),
    registerDropdownSetting: (d: any) => rpc('registerSetting', d.id, d.defaultValue),
  },
  messaging: { broadcast: (m: unknown) => rpc('broadcast', m) },
  app: {
    toast: (t: string) => rpc('toast', t),
    registerCommand: async () => undefined,
    registerWidget: (name: string) => rpc('registerWidget', name),
    unregisterWidget: async () => undefined,
  },
  event: {
    addListener: (event: string, _key: unknown, cb: EventCallbackFn) => { eventListeners.add({ event, cb }); },
    removeListener: (event: string, _key: unknown, cb: EventCallbackFn) => {
      for (const l of eventListeners) if (l.event === event && l.cb === cb) eventListeners.delete(l);
    },
  },
  window: noopNamespace(),
  widget: noopNamespace(),
};

export function usePlugin() {
  return plugin;
}

export function useAPIEventListener(event: string, key: unknown, cb: EventCallbackFn) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const l = (d: any) => {
      if (event === AppEvents.StorageSyncedChange && d.evt === 'storage' && d.key === key) ref.current();
      if (event === AppEvents.QueueCompleteCard && d.evt === 'queue') ref.current(d.payload);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, [event, key]);
}

export function useOnMessageBroadcast(channel: string, cb: (m: unknown) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const l = (d: any) => {
      if (d.evt === 'broadcast' && d.message?.channel === channel) ref.current(d.message);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, [channel]);
}

export function renderWidget(Component: any) {
  const root = document.createElement('div');
  root.style.height = '100%';
  document.body.appendChild(root);
  render(<Component />, root);
}

export function declareIndexPlugin(onActivate: (p: any) => unknown) {
  void Promise.resolve(onActivate(plugin)).then(() => parent.postMessage({ log: 'info', text: 'index activated' }, '*'));
}
