type Listener = (count: number) => void;

const listeners = new Set<Listener>();

export function publishUnread(count: number) {
  for (const listener of listeners) listener(count);
}

export function subscribeUnread(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
