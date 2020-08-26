import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class SlidesController extends Controller {
  queryParams = ['slide'];

  @tracked slide = 0;
}
