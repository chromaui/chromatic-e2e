// storybook's csf sanitize function, plus sanitization of newlines
// https://github.com/storybookjs/storybook/blob/a0d1b3e62533fbf531b79ddfd1f5856fa5bf7384/code/core/src/csf/index.ts#L8-L16
export const sanitize = (string: string) => {
  return (
    string
      .toLowerCase()
      // eslint-disable-next-line no-useless-escape
      .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '-')
      .replace(/[\r\n]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  );
};

// Collapses CR/LF in a display title to a single space. Required for https://github.com/chromaui/chromatic-e2e/issues/369.
export const collapseNewlines = (title: string) => title.replace(/[\r\n]+/g, ' ').trim();
