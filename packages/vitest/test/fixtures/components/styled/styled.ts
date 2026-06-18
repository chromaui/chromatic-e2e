import './styles.css';

export default function Styled({ label }: { label: string }) {
  const div = document.createElement('div');
  div.className = 'styled';
  div.textContent = label;
  return div;
}
