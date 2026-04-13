import { test } from 'vitest';

test('mount some elements', () => {
  const heading = document.createElement('h2');
  heading.textContent = 'Heading';

  const button = document.createElement('button');
  button.textContent = 'Button';

  document.body.innerHTML = '';
  document.body.appendChild(heading);
  document.body.appendChild(button);
});
