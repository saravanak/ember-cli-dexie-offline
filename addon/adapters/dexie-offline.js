import Adapter from '@ember-data/adapter';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';
import { isBlank, isPresent } from '@ember/utils';
import { isArray } from '@ember/array';
import { camelize } from '@ember/string';
import { v4 as uuid } from 'uuid';

export default Adapter.extend({
  dexie: service('dexie-offline'),
  db: reads('dexie.db'),
  store: reads('dexie.store'),
  defaultLimit: reads('dexie.limit'),

  serializeDexieModel(store, type, snapshot) {
    const result = store.serializerFor(type.modelName).serialize(snapshot);
    result.data.id = uuid();
    return result;
  },

  findAll: async function (store, type) {
    const { db } = this;
    return {
      data: await db[camelize(type.modelName)].toArray()
    };
  },

  query: async function (store, type, query) {
    const { db, defaultLimit } = this;
    if (isBlank(query) || Object.keys(query).length == 0) {
      return this.findAll(...arguments);
    }
    const prevPage = isNaN(query.page) || query.page <= 0 ? 0 : query.page - 1;
    const limit =
      isNaN(query.limit) || query.limit <= 0 ? defaultLimit : query.limit;
    const whereClause = db[camelize(type.modelName)];
    let relation = whereClause.orderBy(':id');
    const noOfRecords = await whereClause.count();
    const totalPages = Math.ceil(noOfRecords / limit);
    const offset = prevPage * limit;

    if (isArray(query.whereClauses) && query.whereClauses.length > 0) {
      relation = relation.and((row) => {
        return query.whereClauses.every((clause) => clause(row));
      });
    }

    //Meta: current support for:
    // current_page: 1
    // last_page: 1
    // per_page: "15"
    // from: 1
    // to: 12
    // total: 12
    const data = await relation.offset(offset).limit(limit).toArray();
    const result = {
      data,
      meta: {
        current_page: query.page,
        from: offset + 1,
        to: Math.min(noOfRecords, offset + 1 + limit),
        total: noOfRecords,
        last_page: totalPages,
        per_page: limit
      }
    };

    return result;
  },

  async findRecord(store, type, id) {
    const { db } = this;
    return {
      data: await db[camelize(type.modelName)].get(id)
    };
  },

  async findMany(store, type, ids) {
    const { db } = this;
    return {
      data: await db[camelize(type.modelName)].bulkGet(ids)
    };
  },

  async findBelongsTo(store, snapshot, url) {
    const relation = url.split('/')[3];
    const { db } = this;
    const parentModel = await db[camelize(snapshot.modelName)].get(snapshot.id);

    const relationId = parentModel.relationships[relation].data.id;
    return {
      data: await db[camelize(relation)].get(relationId)
    };
  },

  async clearCachedServerModels(type) {
    const dexieTable = this.db[camelize(type.modelName)];
    if (isPresent(dexieTable)) {
      await dexieTable.clear();
    }
  },

  async deleteRecord(store, type, snapshot) {
    await this.db[camelize(type.modelName)].delete(snapshot.id);
  }
});
