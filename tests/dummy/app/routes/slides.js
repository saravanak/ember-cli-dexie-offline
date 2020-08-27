import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class SlidesRoute extends Route {
  queryParams = {
    slide: {
      replace: true,
      refreshModel: true
    }
  }

  @service dexieOffline;

  async beforeModel(transition) {
    console.log(transition.to.queryParams);
    const { slide } = transition.to.queryParams;
    if(slide) {
      await this.dexieOffline.db._slides.put({
        id: 1,
        slide
      })
    } else {
      const savedSlide = await this.dexieOffline.db._slides.get(1);
      if(savedSlide) {
        const slide = Number(savedSlide.slide) || 0 ;
        this.transitionTo({
          queryParams: {slide}
        })
      }
    }
  }
}
