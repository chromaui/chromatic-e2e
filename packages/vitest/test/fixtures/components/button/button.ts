export default function Button({ label }: { label: string }) {
  const button = document.createElement('button');
  button.textContent = label;
  return button;
}
