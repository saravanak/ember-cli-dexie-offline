import dexieAdapters from 'dummy/adapters/dexie-adapters';

export function initialize(application) {
  Object.keys(dexieAdapters).forEach((key) => {
    console.log('registre', key, dexieAdapters[key]);
    application.register(`dexie-adapter:${key}`, dexieAdapters[key]);
  });
}

