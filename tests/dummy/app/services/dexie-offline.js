import DexieOfflineService from 'ember-cli-dexie-offline/services/dexie-offline';
import { tracked } from '@glimmer/tracking';
import { singularize } from 'ember-inflector';
import { isArray, A } from '@ember/array';

export default class extends DexieOfflineService {
  @tracked isSyncing = false;
  @tracked recentOrders = A([]);

  async syncOfflineCachedModels() {
    try {
      this.isSyncing = true;
      const syncedOrders = await this.db.order
        .where('attributes.status')
        .equals('offline_cached')
        .toArray();
      const products = await this.store.findAll('product');
      for (let syncedOrder of syncedOrders) {
        await this.db._recentOrders.delete(syncedOrder.id);
        syncedOrder.id = null;
        const createdOrder = this.store.createRecord(
          singularize(syncedOrder.type),
          syncedOrder.attributes
        );
        createdOrder.product = products.find(
          (p) => p.id == syncedOrder.relationships.product.data.id
        );
        await createdOrder.save();
        await this.db._recentOrders.put({ id: createdOrder.id });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.db.order
        .where('attributes.status')
        .equals('offline_cached')
        .delete();
      this.isSyncing = false;
    }
  }

  async postBuildSchema(schema) {
    schema._recentOrders = 'id';
    schema._slides = 'id';
  }

  async clearExistingData() {
    await super.clearExistingData();
  }

  async primeStore() {
    const recentOrderIds = await this.db._recentOrders
      .toCollection()
      .primaryKeys();
    try {
      if (recentOrderIds.length > 0) {
        this.recentOrders = await this.store.query('order', {
          filter: {
            id: recentOrderIds.join(',')
          }
        });
      } else {
        this.recentOrders = A();
      }
    } catch (e) {
      console.log(e);
    } finally {
      const loadedOrderIds = this.recentOrders.mapBy('id');
      const missingOrderIds = A(recentOrderIds).reject((id) =>
        loadedOrderIds.includes(id)
      );
      this.db._recentOrders.bulkDelete(missingOrderIds);
    }
    this.recentOrders = A(this.recentOrders.toArray());
  }

  async clearRecentOrders() {
    await this.db._recentOrders.clear();
    await this.primeStore();
  }
}
