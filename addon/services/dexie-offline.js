import Dexie from 'dexie';
import Service from '@ember/service';
import DexieOfflineAdapter from 'ember-cli-dexie-offline/adapters/dexie-offline';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { assign } from '@ember/polyfills';
import { debug } from '@ember/debug';
import { inject as service } from '@ember/service';
import { underscore, camelize } from '@ember/string';
import { isArray, A } from '@ember/array';
import { all } from 'rsvp';
import { singularize } from 'ember-inflector';
import { not } from '@ember/object/computed';
import { isPresent, isBlank } from '@ember/utils';
import EmberObject from '@ember/object';

const configKey = 'ember-cli-dexie-offline';

const StorageEstimateHolder = EmberObject.extend({
 free: computed('usage', 'quota', function() {
   return this.quota - this.usage;
 })
})

export default Service.extend({
  isOnline: false,
  isOffline: not('isOnline'),

  bypassIndexedDBSaves: false,
  store: service(),

  config: computed(function () {
    return (
      getOwner(this).resolveRegistration('config:environment')[configKey] || {}
    );
  }),

  onlineCallback() {
    this.dexieIsOnline();
    this.set('isOnline', true);
  },

  offlineCallback() {
    this.set('isOnline', false);
  },

  init() {
    this._super(...arguments);

    //To bypass certain heavy models that you don't want to be cached.
    this.ignorableModels = [];
    this._onlineCallback = this.onlineCallback.bind(this);
    this._offlineCallback = this.offlineCallback.bind(this);

    window.addEventListener('online', this._onlineCallback);
    window.addEventListener('offline', this._offlineCallback);

    this.set('isOnline', navigator.onLine);

    const { config } = this;

    const configured = {};
    Object.keys(config)
      .filter((k) => isPresent(config[k]))
      .forEach((k) => {
        configured[k] = config[k];
      });

    this.setProperties({
      syncedForThisRun: false,
      preInitializeQueue: A([]),
      ...assign(
        {
          registeredModels: [],
          limit: 15,
          managerDbName: 'dexie-offline',
          dbListTableName: 'tenants'
        },
        configured
      )
    });
  },

  async initializeDexieManagerInstance() {
    const shouldManageOffline = await this.shouldManageOffline();

    this.setProperties({ bypassIndexedDBSaves: !shouldManageOffline});
    if(this.bypassIndexedDBSaves) {
      return;
    }

    const { managerDbName, dbListTableName } = this;

    this.set('managerDb', new Dexie(managerDbName));
    const managerSchema ={
      [dbListTableName]: '++id'
    }
    this.managerDb.version(1).stores(managerSchema);
    await this.postBuildManagerSchema(1);
    this.managerDb.open();
  },

  async postBuildManagerSchema() { },

  async willDestroy() {
    if (this.db) {
      this.db.close();
    }
    window.removeEventListener('online', this._onlineCallback);
    window.removeEventListener('offline', this._offlineCallback);
  },

  async save(type, data) {
    if (this.bypassIndexedDBSaves) {
      return;
    }
    if (!this.syncedForThisRun || this.isSyncingIndexedDB) {
      this.preInitializeQueue.pushObject({
        modelName: type.modelName,
        data
      });
      return;
    }
    return this.saveToDexie(type, data);
  },

  async saveToDexie(type, data) {
    if(this.bypassIndexedDBSaves) {
      return;
    }
    const { db } = this;

    /* NB:
     * Booleans are not indexed by dexie.
     * so we need to convert them to numbers and then back to the true/false format (see deserialize here)
     */
    type.eachAttribute((name, meta) => {
      if (meta.type === 'boolean') {
        data.attributes[underscore(name)] = data.attributes.name
          ? 'true'
          : 'false';
      }
    });
    const model = db[camelize(type.modelName)];
    if (model) {
      model.put(data, data.id);
    } else {
      debug('no model registered in dexie for ', type.modelName);
    }
  },

  async updateSingleModel(modelPayload) {
    if (this.ignorableModels.includes(modelPayload.type)) {
      return;
    }
    const modelName = singularize(modelPayload.type);

    if (modelName) {
      return this.save(this.store.modelFor(modelName), modelPayload);
    }
  },

  async updateResponse(response) {
    if (this.bypassIndexedDBSaves || isBlank(response)) {
      return;
    }
    if (isArray(response.data)) {
      const updateResponses = response.data.map((record) => {
        let result = null;
        if (record && record.type) {
          result = this.updateSingleModel(record);
        }
        return result;
      });
      await all(A(updateResponses).compact());
    } else if (response.data && response.data.type) {
      await this.updateSingleModel(response.data);
    }
    if (isArray(response.included)) {
      const updateResponses = response.included.map((record) => {
        let result = null;
        if (record && record.type) {
          result = this.updateSingleModel(record);
        }
        return result;
      });
      await all(A(updateResponses).compact());
    }
  },

  dexieAdapterFor(type) {
    const modelAdapter = getOwner(this).lookup(
      `dexie-adapter:${camelize(type.modelName)}`
    );
    return modelAdapter ? modelAdapter : this.dexieOfflineAdapter;
  },

  isSyncingIndexedDB: false,
  //Just so that this can be overridden, and the host needs async init sequence
  async syncIndexedDB() {
    //We only do this once.
    //Prefer truncating the DB using teh API after forms have been copied over.

    try {
      if (this.syncedForThisRun || this.isSyncingIndexedDB) {
        return;
      }

      this.set('isSyncingIndexedDB', true);
      if (this.isOffline) {
        this.set('syncedForThisRun', true);
        await this.primeStore();
        return;
      }

      await this.syncOfflineCachedModels();
      await this.primeStore();
      await this.clearExistingData();

      const { db, preInitializeQueue } = this;
      for (let { modelName, data } of preInitializeQueue) {
        db[camelize(modelName)].put(data, data.id);
      }
    } catch (e) {
      debug('Error while initilazing indexeddb, bailing off', e);
      this.set('bypassIndexedDBSaves', true);
    } finally {
      this.setProperties({
        isSyncingIndexedDB: false,
        syncedForThisRun: true
      });
    }
  },

  deserialize(_, result) {
    const me = this;
    if (isArray(result.data)) {
      result.data.forEach((data) => me._deserializeRecord(data));
    } else {
      this._deserializeRecord(result.data);
    }

    if (isArray(result.included)) {
      result.included.forEach((included) =>
        me._deserializeRecord(included.data)
      );
    }

    return result;
  },

  _deserializeRecord(record) {
    if (isBlank(record)) {
      return record;
    }
    const modelName = camelize(record.type);
    const type = this.store.modelFor(singularize(modelName));

    type.eachAttribute((name, meta) => {
      if (meta.type === 'boolean') {
        record.attributes[underscore(name)] = record.attributes[name] == 'true';
      }
    });
  },

  async buildSchema() {
    const schema = {};
    this.registeredModels.forEach((model) => {
      const type = this.store.modelFor(model);
      const attrs = A(['id']);
      if (type.additionalKeys && isArray(type.additionalKeys)) {
        attrs.pushObjects(type.additionalKeys);
      }
      type.eachAttribute((name, meta) => {
        // https://dexie.org/docs/Version/Version.stores()
        /*
         * @attr('boolean', { dexieIndex: true}) isActive;
         *  ... {dexieIndex: { unique: true } email;
         */
        const { options } = meta;
        if (options.dexieIndex) {
          let indexName = options.dexieIndex.as || name;
          if (options.dexieIndex.unique) {
            indexName = `&${indexName}`;
          }
          attrs.pushObject(`attributes.${underscore(indexName)}`);
        }
      });
      schema[camelize(model)] = attrs.join(',');
    });
    await this.postBuildSchema(schema);
    return schema;
  },

  async initDb(dbName) {
    this.set('db', new Dexie(dbName));
    this.db.version(1).stores(await this.buildSchema());
    await this.db.open();
  },

  async initializeOfflineDb() {
    try{
      this.setProperties({
        isSyncingIndexedDB: false,
        syncedForThisRun: true
      });
      await this.initializeDexieManagerInstance();

      if(this.bypassIndexedDBSaves) {
        return;
      }

      const ownerInjection = getOwner(this).ownerInjection();
      const dbNameMeta = await this.generateDbNameForCurrentSession();

      await this.initDb(dbNameMeta.id);

      const dexieOfflineAdapter = DexieOfflineAdapter.create({}, ownerInjection);

      this.setProperties({
        dexieOfflineAdapter,
        dbNameMeta
      });
      await this.syncIndexedDB();
    } catch(e) {
      debug('Error while initilazing indexeddb, bailing off', e);
      this.set('bypassIndexedDBSaves', true);
    }
  },

  async getStorageEstimates() {
    if (navigator.storage && navigator.storage.estimate) {
      this.estimation = StorageEstimateHolder.create(await navigator.storage.estimate(), getOwner(this).ownerInjection());
    } else {
      this.estimation = null;
    }
  },

  //overridables

  //This is the opportunity to find if we have the right space limits and then
  //decide to handover to dexie to manage offline state.

  async shouldManageOffline() { return true; },

  async generateDbNameForCurrentSession() {
    return {
      id: 'dexie-offline-db'
    };
  },

  dexieIsOnline() {},

  async syncOfflineCachedModels() {},
  async primeStore() {},

  async clearExistingData() {
    for (let modelSlug of this.registeredModels) {
      const type = this.store.modelFor(modelSlug);
      const dexieAdapter = this.dexieAdapterFor(type);
      await dexieAdapter.clearCachedServerModels(type);
    }
  },

  async postBuildSchema(/*schema*/) {}
});
