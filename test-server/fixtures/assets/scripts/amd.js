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

  const inputElement = document.querySelector('input');
  const imgElement = document.querySelector('#uploadImg');
  inputElement.addEventListener('change', function () {
    const url = URL.createObjectURL(inputElement.files[0]);
    imgElement.src = url;
    const urlText = document.querySelector('#objectUrl');
    urlText.textContent = url;
  });
});
