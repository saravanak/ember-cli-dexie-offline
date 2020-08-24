import Controller from '@ember/controller';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
  @service dexieOffline;

  @reads('dexieOffline.isSyncing') isSyncing;
}
