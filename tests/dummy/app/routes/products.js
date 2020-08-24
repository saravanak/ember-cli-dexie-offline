import Route from '@ember/routing/route';
import { action } from '@ember/object';

export default class ProductsRoute extends Route {
  @action
  error (e) {
    console.log('error');
  }

}
