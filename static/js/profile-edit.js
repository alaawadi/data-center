(function () {
  'use strict';

  var input = document.getElementById('id_headline');
  var data = document.getElementById('freelancer-category-options');
  if (!input || !data || !window.createFreelancerCategoryAutocomplete) return;

  window.createFreelancerCategoryAutocomplete(input, JSON.parse(data.textContent));
})();
