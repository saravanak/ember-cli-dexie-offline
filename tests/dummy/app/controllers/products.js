import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';
import { alias } from '@ember/object/computed';

export default class ProductsController extends Controller {
  @service store;
  @service dexieOffline;

  @tracked products;
  @tracked error;
  @tracked selectedProduct = null;
  @tracked quantityForNextOrder = 1;
  @tracked orderCreationError = null;
  @alias('dexieOffline.recentOrders') recentOrders ;

  constructor() {
    super(...arguments);
    this.loadProducts();
  }

  async loadProducts() {
    try {
      this.error = null;
      this.products = await this.store.findAll('product', { reload: true });
    } catch (e) {
      this.products = null;
      this.error = e.message;
    }
  }

  @action onQuantityChange(e) {
    this.quantityForNextOrder = Number(e.target.value);
  }

  @action async createOrder(e) {
    e.preventDefault();
    const order = this.store.createRecord('order', {
      product: this.selectedProduct,
      quantity: this.quantityForNextOrder
    });
    this.orderCreationError = null;
    await order.save().catch((e) => {
      this.orderCreationError = e;
    });
    if (order.id) {
      this.dexieOffline.db._recentOrders.put({id: order.id});
      this.recentOrders.pushObject(...[order]);
    }
  }

  @action async refetchProducts() {
    this.loadProducts();
  }

  @action async clearRecentOrders () {
    this.dexieOffline.clearRecentOrders();
  }
}
