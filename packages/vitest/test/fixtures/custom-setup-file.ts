import { afterEach } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '<div>DOM cleaned up by setup file</div>';
});
