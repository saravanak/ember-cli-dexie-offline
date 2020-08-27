import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class OnlineStatusComponent extends Component {
  @tracked status;
  @tracked isOnline;

  @action init() {
    //Taken from MDN: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/Online_and_offline_events
    var status = document.getElementById('status');

    const me = this;

    function updateOnlineStatus() {
      var condition = navigator.onLine ? 'online' : 'offline';
      me.isOnline = navigator.onLine;
      me.status = condition.toUpperCase();
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(window.navigator.onLine);
  }

  @action refreshWindow(){
    location.reload();
  }
}
