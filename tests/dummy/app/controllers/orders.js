import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ProductsController extends Controller {
  @service store;

  @tracked orders;
  @tracked error;
  @tracked selectedProduct = null;
  @tracked quantityForNextOrder = 1;

  constructor() {
    super(...arguments);
    this.loadOrders();
  }

  async loadOrders() {
    try {
      this.error = null;
      this.orders = await this.store.findAll('order', { reload: true });
    } catch (e) {
      console.log(e);
      this.orders = null;
      this.error = 'We are offline';
    }
  }
}
