export function renderCaseText(text: string) {
  return text.split('**').map((part, index) => (
    index % 2 === 0 ? part : <span className="dns-copy-emphasis" key={index}>{part}</span>
  ));
}
