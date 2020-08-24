import DexieOfflineAdapter from 'ember-cli-dexie-offline/adapters/dexie-offline';

export default class extends DexieOfflineAdapter{
  async createRecord (store, type, snapshot) {
    const serialized = this.serializeDexieModel(...arguments);
    serialized.data.attributes.status = "offline_cached";
    this.dexie.save(type, serialized.data);
    return serialized;
  }

}
