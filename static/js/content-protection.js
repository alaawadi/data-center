(function () {
  'use strict';

  ['copy', 'cut', 'contextmenu'].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      var target = event.target;
      var editableTarget = target instanceof Element
        ? target.closest('input, textarea, select, [contenteditable="true"]')
        : null;
      if (editableTarget) {
        return;
      }
      event.preventDefault();
    });
  });
})();
