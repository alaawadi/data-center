(function () {
  'use strict';

  function mountCountryCodePicker(countryCodePicker) {
    if (!countryCodePicker) return;
    var countryCodeInput = countryCodePicker.querySelector('select');
    var countryCodeTrigger = countryCodePicker.querySelector('.country-code-trigger');
    var countryCodeMenu = countryCodePicker.querySelector('.country-code-menu');
    var countryCodeSearch = countryCodePicker.querySelector('.country-code-search');
    var countryCodeOptions = countryCodePicker.querySelector('.country-code-options');
    var countryCodeEmpty = countryCodePicker.querySelector('.country-code-empty');
    var countryFlag = countryCodePicker.querySelector('.country-code-current-flag');
    var countryPrefix = countryCodePicker.querySelector('.country-code-current-prefix');
    if (!countryCodeInput || !countryCodeTrigger || !countryCodeMenu ||
        !countryCodeOptions || !countryCodeEmpty || !countryFlag || !countryPrefix) return;

    function updateCountryCodePicker() {
      var selectedOption = countryCodeInput.options[countryCodeInput.selectedIndex];
      if (!selectedOption || !selectedOption.value) return;
      var parts = selectedOption.textContent.trim().split(/\s+/);
      countryFlag.textContent = parts.shift() || '';
      countryPrefix.textContent = parts.shift() || selectedOption.value;
      countryCodeTrigger.setAttribute('aria-label', 'مقدمة الدولة ' + countryPrefix.textContent);
      countryCodeOptions.querySelectorAll('.country-code-option').forEach(function (option) {
        option.setAttribute(
          'aria-selected',
          option.dataset.countryCode === selectedOption.value ? 'true' : 'false'
        );
      });
    }

    function normalizeCodeSearch(value) {
      return String(value || '')
        .replace(/[٠-٩]/g, function (digit) { return String(digit.charCodeAt(0) - 0x660); })
        .replace(/[۰-۹]/g, function (digit) { return String(digit.charCodeAt(0) - 0x6f0); })
        .replace(/\D/g, '');
    }

    function filterCountryCodes() {
      var query = countryCodeSearch ? normalizeCodeSearch(countryCodeSearch.value) : '';
      var visibleCount = 0;
      countryCodeOptions.querySelectorAll('.country-code-option').forEach(function (option) {
        var matches = !query || normalizeCodeSearch(option.dataset.countryCode).indexOf(query) === 0;
        option.hidden = !matches;
        if (matches) visibleCount++;
      });
      countryCodeEmpty.hidden = visibleCount > 0;
    }

    Array.prototype.forEach.call(countryCodeInput.options, function (option) {
      if (!option.value) return;
      var parts = option.textContent.trim().split(/\s+/);
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'country-code-option';
      row.dataset.countryCode = option.value;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', option.selected ? 'true' : 'false');
      var flag = document.createElement('span');
      flag.className = 'country-code-option-flag';
      flag.setAttribute('aria-hidden', 'true');
      flag.textContent = parts.shift() || '';
      var prefix = document.createElement('span');
      prefix.className = 'country-code-option-prefix';
      prefix.textContent = parts.shift() || option.value;
      row.append(flag, prefix);
      countryCodeOptions.appendChild(row);
    });

    function closeCountryCodePicker(returnFocus) {
      countryCodePicker.classList.remove('is-open');
      countryCodeMenu.hidden = true;
      countryCodeTrigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) countryCodeTrigger.focus();
    }

    countryCodeTrigger.addEventListener('click', function () {
      var open = countryCodeMenu.hidden;
      countryCodeMenu.hidden = !open;
      countryCodePicker.classList.toggle('is-open', open);
      countryCodeTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        if (countryCodeSearch) countryCodeSearch.value = '';
        filterCountryCodes();
        if (countryCodeSearch) {
          countryCodeSearch.focus();
        } else {
          var firstVisible = countryCodeOptions.querySelector('.country-code-option:not([hidden])');
          if (firstVisible) firstVisible.focus();
        }
      }
    });
    if (countryCodeSearch) countryCodeSearch.addEventListener('input', filterCountryCodes);
    countryCodeOptions.addEventListener('click', function (event) {
      var option = event.target.closest('[data-country-code]');
      if (!option) return;
      countryCodeInput.value = option.dataset.countryCode;
      countryCodeInput.dispatchEvent(new Event('change', { bubbles: true }));
      updateCountryCodePicker();
      closeCountryCodePicker(true);
    });
    if (countryCodeSearch) {
      countryCodeSearch.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          var visibleOptions = Array.prototype.filter.call(
            countryCodeOptions.querySelectorAll('.country-code-option'),
            function (option) { return !option.hidden; }
          );
          if (visibleOptions.length) visibleOptions[0].click();
          return;
        }
        if (event.key === 'ArrowDown') {
          var firstVisible = countryCodeOptions.querySelector('.country-code-option:not([hidden])');
          if (firstVisible) {
            event.preventDefault();
            firstVisible.focus();
          }
        }
      });
    }
    countryCodeOptions.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !countryCodeMenu.hidden) {
        event.preventDefault();
        closeCountryCodePicker(true);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        var visibleOptions = Array.prototype.filter.call(
          countryCodeOptions.querySelectorAll('.country-code-option'),
          function (option) { return !option.hidden; }
        );
        var currentIndex = visibleOptions.indexOf(event.target);
        var nextIndex = currentIndex + (event.key === 'ArrowDown' ? 1 : -1);
        event.preventDefault();
        if (nextIndex >= 0 && nextIndex < visibleOptions.length) visibleOptions[nextIndex].focus();
        else if (event.key === 'ArrowUp') {
          if (countryCodeSearch) countryCodeSearch.focus();
          else countryCodeTrigger.focus();
        }
      }
    });
    countryCodePicker.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !countryCodeMenu.hidden) {
        event.preventDefault();
        closeCountryCodePicker(true);
      }
    });
    document.addEventListener('click', function (event) {
      if (!countryCodePicker.contains(event.target) && !countryCodeMenu.hidden) {
        closeCountryCodePicker(false);
      }
    });
    countryCodeInput.addEventListener('change', updateCountryCodePicker);
    updateCountryCodePicker();
    countryCodePicker.classList.add('is-enhanced');
    countryCodeInput.tabIndex = -1;
    countryCodeInput.setAttribute('aria-hidden', 'true');
  }

  window.mountCountryCodePicker = mountCountryCodePicker;
})();
