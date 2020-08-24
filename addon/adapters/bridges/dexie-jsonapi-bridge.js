import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { isPresent } from '@ember/utils';
import { inject as service } from '@ember/service';
import { reads, not } from '@ember/object/computed';
import { debug } from '@ember/debug';

export default class extends JSONAPIAdapter{
  @service dexieOffline;

  @not('dexieOffline.isOnline') isOffline;
  @reads('dexieOffline.isOnline') isOnline;

  @reads('dexieOffline.bypassIndexedDBSaves') bypassIndexedDBSaves;

  async handleResponse(status, headers, payload) {
    const result = super.handleResponse(...arguments);
    try {
      if (this.isOnline) {
        console.log(result);
        await this.dexieOffline.updateResponse(result);
      }
    } catch (e) {
      debug(e);
      throw e;
    }
    return result;
  }

  async wrapOnlineOffline(wrapperFor, { args }, ){
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
        result = await  super[wrapperFor](...args);
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

  async findAll(store, type) {
    return this.wrapOnlineOffline('findAll', {args: arguments});
  }

  async findRecord(store, type) {
    return this.wrapOnlineOffline('findRecord', {args: arguments});
  }

  async query(store, type, query) {
    return this.wrapOnlineOffline('query', {args: arguments});
  }

  async queryRecord(store, type, query) {
    return this.wrapOnlineOffline('queryRecord', {args: arguments});
  }
}
