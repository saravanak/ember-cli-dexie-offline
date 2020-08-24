import DexieJsonAPIBridge from 'ember-cli-dexie-offline/adapters/bridges/dexie-jsonapi-bridge';
import ENV from '../config/environment';
import { reads } from '@ember/object/computed';

export default class extends DexieJsonAPIBridge{
  host= ENV.APP.host;

  @reads('dexieOffline.bypassIndexedDBSaves') bypassIndexedDBSaves;
}

