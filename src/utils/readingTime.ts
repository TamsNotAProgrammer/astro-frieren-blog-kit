import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return function (tree: any, file: any) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    if (!file) return;

    file.data = file.data || {};
    file.data.astro = file.data.astro || {};
    file.data.astro.frontmatter = file.data.astro.frontmatter || {};
    file.data.astro.frontmatter.minutesRead = readingTime.text;
    file.data.astro.frontmatter.wordCount = readingTime.words;
  };
}
