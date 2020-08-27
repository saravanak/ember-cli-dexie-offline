import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { inject as service } from '@ember/service';
import { reads, not } from '@ember/object/computed';
import { debug } from '@ember/debug';

export default class extends JSONAPIAdapter {
  @service dexieOffline;

  @not('dexieOffline.isOnline') isOffline;
  @reads('dexieOffline.isOnline') isOnline;

  @reads('dexieOffline.bypassIndexedDBSaves') bypassIndexedDBSaves;

  async handleResponse() {
    const result = super.handleResponse(...arguments);
    try {
      if (this.isOnline) {
        await this.dexieOffline.updateResponse(result);
      }
    } catch (e) {
      debug(e);
      throw e;
    }
    return result;
  }

  async wrapOnlineOffline(wrapperFor, { args }) {
    let result = null;
    //for now, we hardcode this.
    const type = args[1];
    try {
      if (this.isOffline && !this.bypassIndexedDBSaves) {
        const dexieOfflineAdapter = this.dexieOffline.dexieAdapterFor(type);
        result = await dexieOfflineAdapter[wrapperFor](...args);

        if (result) {
          result = this.dexieOffline.deserialize(type, result);
        }
      } else {
        result = await super[wrapperFor](...args);
      }
    } catch (e) {
      debug(`exception on ${wrapperFor} `, e);
      throw e;
    }
    return result;
  }

  async createRecord(store, type) {
    if (this.isOnline) {
      const result = await super.createRecord(...arguments);
      return result;
    } else {
      const dexieOfflineAdapter = this.dexieOffline.dexieAdapterFor(type);
      const result = await dexieOfflineAdapter.createRecord(...arguments);
      return result;
    }
  }

  async updateRecord(store, type) {
    if (this.dexieOffline.isOnline) {
      const result = await super.updateRecord(...arguments);
      return result;
    } else {
      const dexieOfflineAdapter = this.dexieOffline.dexieAdapterFor(type);
      const result = await dexieOfflineAdapter.updateRecord(...arguments);
      return result;
    }
  }

  async deleteRecord(store, type) {
    const dexieOfflineAdapter = this.dexieOffline.dexieAdapterFor(type);
    if (this.dexieOffline.isOnline) {
      const result = await super.deleteRecord(...arguments);
      if(!this.dexieOffline.bypassIndexedDBSaves) {
        await dexieOfflineAdapter.deleteRecord(...arguments);
      }
      return result;
    } else {
      const result = await dexieOfflineAdapter.deleteRecord(...arguments);
      return result;
    }
  }

  async findAll() {
    return this.wrapOnlineOffline('findAll', { args: arguments });
  }

  async findRecord() {
    return this.wrapOnlineOffline('findRecord', { args: arguments });
  }

  async findBelongsTo() {
    return this.wrapOnlineOffline('findBelongsTo', { args: arguments });
  }

  async query() {
    return this.wrapOnlineOffline('query', { args: arguments });
  }

  async queryRecord() {
    return this.wrapOnlineOffline('queryRecord', { args: arguments });
  }
}
