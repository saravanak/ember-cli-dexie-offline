import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class OnlineStatusComponent extends Component {
  @action init() {
    //Taken from MDN: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/Online_and_offline_events
    var status = document.getElementById('status');

    function updateOnlineStatus() {
      var condition = navigator.onLine ? 'online' : 'offline';
      console.log('inside handler');

      status.className = condition;
      status.innerHTML = condition.toUpperCase();
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(window.navigator.onLine);
  }
}
