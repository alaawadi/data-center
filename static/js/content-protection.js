(function () {
  'use strict';

  ['copy', 'cut', 'contextmenu'].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      event.preventDefault();
    });
  });
})();
