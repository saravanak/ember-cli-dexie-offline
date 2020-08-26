import dexieAdapters from 'dummy/adapters/dexie-adapters';

export function initialize(application) {
  Object.keys(dexieAdapters).forEach((key) => {
    application.register(`dexie-adapter:${key}`, dexieAdapters[key]);
  });
}
