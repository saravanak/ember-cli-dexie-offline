import DexieOfflineService from 'ember-cli-dexie-offline/services/dexie-offline';
import { tracked } from '@glimmer/tracking';
import { camelize } from '@ember/string';
import { singularize } from 'ember-inflector';

export default class extends DexieOfflineService {
  @tracked isSyncing = false;

  async syncOfflineCachedModels (){
    try {
      this.isSyncing = true;
      const syncedModels = await this.db.order.where('attributes.status').equals('offline_cached').toArray();
      const products = await this.store.findAll('product');
      console.log(products);
      for(let syncedModel of syncedModels) {
        syncedModel.id = null;
        const createdModel = this.store.createRecord(singularize(syncedModel.type),
          syncedModel.attributes);
        createdModel.product = products.find(p => p.id == syncedModel.relationships.product.data.id);
        await createdModel.save();
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.db.order.where('attributes.status').equals('offline_cached').delete();
      this.isSyncing = false;
    }
  }
}
