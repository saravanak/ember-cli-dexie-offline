import Adapter from 'ember-data/adapter';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';
import { isBlank } from '@ember/utils';
import { isArray } from '@ember/array';

export default Adapter.extend({
  dexie: service('dexie-offline'),
  db: reads('dexie.db'),
  store: reads('dexie.store'),
  defaultLimit: reads('dexie.limit'),

  init() {
    this._super(...arguments);
    console.log('dexie adapter root: dexier service is', this.dexie, 'db is ', this.dexie.db);
  },

  findAll: async function (store, type) {
    const { db } = this;
    return {
      data: await db[type.modelName.camelize()].toArray()
    };
  },

  query: async function (store, type, query) {
    const { db, defaultLimit } = this;
    if (isBlank(query) || Object.keys(query).length == 0) {
      return this.findAll(...arguments);
    }
    const prevPage = isNaN(query.page) || query.page <= 0 ? 0 : query.page - 1;
    const limit = isNaN(query.limit) || query.limit <= 0 ? defaultLimit : query.limit;
    const whereClause = db[type.modelName.camelize()];
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
    return {
      data: await relation.offset(offset).limit(limit).toArray(),
      meta: {
        current_page: query.page,
        from: offset + 1,
        to: Math.min(noOfRecords, offset + 1 + limit),
        total: noOfRecords,
        last_page: totalPages,
        per_page: limit
      }
    };
  },

  async findRecord(store, type, id) {
    const { db } = this;
    return {
      data: await db[type.modelName.camelize()].get(id)
    };
  },

  async findMany(store, type, ids) {
    const { db } = this;
    return {
      data: await db[type.modelName.camelize()].bulkGet(ids)
    };
  }
});
