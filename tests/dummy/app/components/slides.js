import Component from '@glimmer/component';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class SlidesComponent extends Component {
  @service router;

  @action initSlides() {
    this.deck = new Reveal({
      plugins: [Markdown]
    });
    this.deck.initialize({
      embedded: true
    });

    this.deck.on('slidechanged', (event) => {
      this.router.transitionTo({
        queryParams: {
          slide: event.indexh
        }
      });
    });
    this.deck.on('ready', () => {
      this.deck.slide(this.args.slide ? this.args.slide : 0, 0, 0);
    });
  }
}
