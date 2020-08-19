import Dexie from 'dexie';
import Service from '@ember/service';
import DexieOfflineAdapter from 'ember-cli-dexie-offline/adapters/dexie-offline';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { assign } from '@ember/polyfills';
import { debug } from '@ember/debug';
import { inject as service } from '@ember/service';
import { underscore } from '@ember/string';
import { isArray } from '@ember/array';
import { all } from 'rsvp';
import { singularize } from 'ember-inflector';
import { reads, not } from '@ember/object/computed';
import { isBlank } from '@ember/utils';

const configKey = 'ember-cli-dexie-offline';

export default Service.extend({
  isOnline: false,
  isOffline: not('isOnline'),

  bypassIndexedDBSaves: false,
  store: service(),

  resigeredModels: computed(function () {
    let config = getOwner(this).resolveRegistration('config:environment')[
      configKey
    ];
    return (config && config.resigeredModels) || [];
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
    const me = this;

    this._onlineCallback = this.onlineCallback.bind(this);
    this._offlineCallback = this.offlineCallback.bind(this);

    window.addEventListener('online', this._onlineCallback);
    window.addEventListener('offline',  this._offlineCallback);

    this.set('isOnline', navigator.onLine);

    let config = getOwner(this).resolveRegistration('config:environment')[
      configKey
    ];

    this.setProperties({
      syncedForThisRun: false,
      preInitializeQueue: [],
      bypassIndexedDBSaves: false,
      ...assign(
        {
          registeredModels: [],
          limit: 15,
          managerDbName: 'dexie-offline',
          dbListTableName: 'tenants'
        },
        {
          registeredModels: config.registeredModels,
          limit: config.limit,
          managerDbName: config.managerDbName,
          dbListTableName: config.dbListTableName
        }
      )
    });

    const { managerDbName, dbListTableName } = this;

    this.set('managerDb', new Dexie(managerDbName));
    this.managerDb.version(1).stores({
      [dbListTableName]: '++id'
    });
    this.managerDb.open();
  },

  async willDestroy() {
    if(this.db) {
      await this.db.delete();
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
    db[type.modelName.camelize()].put(data, data.id);
  },

  async updateSingleModel(modelPayload) {
    if (this.ignorableModels.includes(modelPayload.type)) {
      return;
    }
    const modelName = singularize(modelPayload.type);

    if (modelName) {
      await this.save(this.store.modelFor(modelName), modelPayload);
    }
  },

  async updateResponse(response) {
    if (this.bypassIndexedDBSaves || isBlank(response)) {
      return;
    }
    if (isArray(response.data)) {
      await all(
        response.data
          .map((record) => {
            if (record && record.type) {
              return this.updateSingleModel(record);
            }
            return null;
          })
          .compact()
      );
    } else if (response.data && response.data.type) {
      await this.updateSingleModel(response.data);
    }
    if (isArray(response.included)) {
      await all(
        response.included
          .map((record) => {
            if (record && record.type) {
              return this.updateSingleModel(record);
            }
            return null;
          })
          .compact()
      );
    }
  },

  dexieAdapterFor(type) {
    const modelAdapter = getOwner(this).lookup(
      `dexie-adapter:${type.modelName.camelize()}`
    );
    return modelAdapter ? modelAdapter : this.dexieOfflineAdapter;
  },

  isSyncingIndexedDB: false,
  //Just so that this can be overridden, and the host needs async init sequence
  async syncIndexedDB(){
    //We only do this once.
    //Prefer truncating the DB using teh API after forms have been copied over.

    try {
      if (this.syncedForThisRun || this.isSyncingIndexedDB) {
        return;
      }

      this.set('isSyncingIndexedDB', true);
      if (this.isOffline) {
        this.set('syncedForThisRun', true);
        return;
      }

      await this.syncOfflineCachedModels();

      const { db, preInitializeQueue } = this;
      for (let { modelName, data } of preInitializeQueue) {
        db[modelName.camelize()].put(data, data.id);
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
    const modelName = record.type.camelize();
    const type = this.store.modelFor(singularize(modelName));

    type.eachAttribute((name, meta) => {
      if (meta.type === 'boolean') {
        record.attributes[name] = record.attributes[name] == 'true';
      }
    });
  },

  async buildSchema() {
    const schema = {};
    this.registeredModels.forEach((model) => {
      const type = this.store.modelFor(model);
      const attrs = [''];
      if(type.additionalKeys && isArray(type.additionalKeys) ) {
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
          attrs.pushObject(indexName);
        }
      });
      schema[model.camelize()] = attrs.join(',');
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
    const ownerInjection = getOwner(this).ownerInjection();
    const dbNameMeta = await this.generateDbNameForCurrentSession();

    await this.initDb(dbNameMeta.id);

    const { db } = this;
    const dexieOfflineAdapter = DexieOfflineAdapter.create({}, ownerInjection);

    this.setProperties({
      dexieOfflineAdapter,
      dbNameMeta
    });
    await this.syncIndexedDB();
  },

  //overridables

  //To bypass certain heavy models that you don't want to be cached.
  ignorableModels: [],

  async generateDbNameForCurrentSession() {
    return 'dexie-offline-db';
  },

  dexieIsOnline() { },

  async syncOfflineCachedModels() {},

  async postBuildSchema(schema) { }
});
