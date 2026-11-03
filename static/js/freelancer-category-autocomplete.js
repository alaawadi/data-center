(function () {
  'use strict';

  var nextListId = 0;

  window.createFreelancerCategoryAutocomplete = function (input, categories) {
    if (!input || !Array.isArray(categories)) return;

    categories = categories.filter(function (category) {
      return typeof category === 'string' && category.trim();
    });

    var selectedValue = categories.indexOf(input.value) >= 0 ? input.value : '';
    input.value = selectedValue;

    var wrapper = document.createElement('div');
    wrapper.className = 'freelancer-category-combobox';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var list = document.createElement('div');
    list.className = 'freelancer-category-suggestions';
    list.id = 'freelancer-category-list-' + (++nextListId);
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrapper.appendChild(list);

    var feedback = document.createElement('p');
    feedback.className = 'hint freelancer-category-feedback';
    feedback.setAttribute('aria-live', 'polite');
    feedback.setAttribute('role', 'status');
    wrapper.appendChild(feedback);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('autocomplete', 'off');

    var activeIndex = -1;
    var isValid = true;

    function closeList() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function validate(matches) {
      var value = input.value.trim();
      var message = '';
      var feedbackClass = '';
      isValid = !value || (selectedValue && value === selectedValue);

      if (value && !isValid) {
        message = matches.length
          ? 'اختر فئة من الاقتراحات لإكمال الاختيار.'
          : 'لا توجد فئة مطابقة. اختر من الفئات المتاحة.';
        feedbackClass = 'error';
      } else if (value) {
        message = 'تم اختيار الفئة: ' + selectedValue;
        feedbackClass = 'ok';
      }

      input.setAttribute('aria-invalid', isValid ? 'false' : 'true');
      input.setCustomValidity(isValid ? '' : message);
      feedback.textContent = message;
      feedback.classList.toggle('error', feedbackClass === 'error');
      feedback.classList.toggle('ok', feedbackClass === 'ok');
      input.dispatchEvent(new CustomEvent('freelancer-category-validation', {
        bubbles: true,
        detail: { valid: isValid, message: message }
      }));
    }

    function choose(category) {
      input.value = category;
      selectedValue = category;
      validate([category]);
      closeList();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setActive(index) {
      var options = list.querySelectorAll('[role="option"]');
      if (!options.length) return;
      activeIndex = (index + options.length) % options.length;
      options.forEach(function (option, optionIndex) {
        var active = optionIndex === activeIndex;
        option.setAttribute('aria-selected', active ? 'true' : 'false');
        if (active) {
          input.setAttribute('aria-activedescendant', option.id);
          option.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function renderList() {
      var query = input.value.trim().toLocaleLowerCase();
      var matches = categories.filter(function (category) {
        return !query || category.toLocaleLowerCase().indexOf(query) >= 0;
      });
      list.replaceChildren();
      activeIndex = -1;

      matches.forEach(function (category, index) {
        var option = document.createElement('button');
        option.type = 'button';
        option.className = 'freelancer-category-option';
        option.id = list.id + '-option-' + index;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.textContent = category;
        option.addEventListener('mousedown', function (event) {
          event.preventDefault();
        });
        option.addEventListener('click', function () {
          choose(category);
        });
        list.appendChild(option);
      });

      list.hidden = matches.length === 0;
      input.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
      validate(matches);
    }

    input.addEventListener('focus', renderList);
    input.addEventListener('input', function () {
      selectedValue = '';
      renderList();
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (list.hidden) renderList();
        if (!list.hidden) {
          event.preventDefault();
          setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
        }
      } else if (event.key === 'Enter' && !list.hidden && activeIndex >= 0) {
        event.preventDefault();
        choose(list.querySelectorAll('[role="option"]')[activeIndex].textContent);
      } else if (event.key === 'Escape') {
        closeList();
      }
    });
    input.addEventListener('blur', function () {
      window.setTimeout(closeList, 120);
    });
    input.form && input.form.addEventListener('submit', function (event) {
      if (!isValid) {
        event.preventDefault();
        input.reportValidity();
      }
    });

    validate([]);
    return {
      isValid: function () { return isValid; }
    };
  };
})();
