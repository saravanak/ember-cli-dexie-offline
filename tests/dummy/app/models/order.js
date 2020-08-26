import Model, { belongsTo, attr } from '@ember-data/model';

export default class OrderBookModel extends Model {
  @belongsTo product;
  @attr cost;
  @attr isBumper;
  @attr('boolean') isCreatedOffline;
  @attr({ dexieIndex: true }) status;
}
