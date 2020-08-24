import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { isArray, A } from '@ember/array';

export default class ProductsController extends Controller {
  @service store;

  @tracked products;
  @tracked error;
  @tracked selectedProduct = null;
  @tracked quantityForNextOrder = 1;
  @tracked orderCreationError = null;
  @tracked recentOrders = null

  constructor(){
    super(...arguments);
    this.loadProducts();
    this.recentOrders = A([]);
  }

  async loadProducts() {
    try {
      this.error = null;
      this.products = await this.store.findAll('product', {reload: true})
    } catch (e) {
      console.log(e);
      this.products = null;
      this.error = 'We are offline'
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
    await order.save().catch(e => {
      this.orderCreationError = e;
    });
    if(order.id) {
      this.recentOrders.pushObject(order);
    }
  }

  @action async refetchProducts() {
    this.loadProducts();
  }
}
