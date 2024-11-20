requirejs.config({
  basePath: 'fixtures/amd',
  paths: {
    lodash: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min',
  },
});

require(['lodash'], function (_) {
  const numbers = [1, 2, 3, 4, 5];
  const sum = _.sum(numbers);
  document.getElementById('output').textContent = `Sum of ${numbers.join('+')} = ${sum}`;
});
