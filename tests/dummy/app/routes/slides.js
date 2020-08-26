import Route from '@ember/routing/route';

export default class SlidesRoute extends Route {
  queryParams = {
    slides: {
      replace: true
    }
  };
}
