import Button from '../button/index';

// This package is not really used. We just import it to create
// module graph of "test file > extend-to-be-announced > aria-live-capture".
import 'extend-to-be-announced/vitest';

export default function Accordion({ content }: { content: string }) {
  const details = document.createElement('details');
  const span = document.createElement('span');
  span.textContent = content;
  details.appendChild(span);

  const button = Button({ label: 'Open' });
  button.onclick = () => {
    details.open = !details.open;
  };

  const summary = document.createElement('summary');
  summary.appendChild(button);

  details.open = false;
  details.appendChild(summary);
  return details;
}
