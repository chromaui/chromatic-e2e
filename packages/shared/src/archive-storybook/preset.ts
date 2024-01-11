import { readFileSync } from 'fs';
import type { StoryIndexer, Parameters } from '@storybook/types';
import { toId } from '@storybook/csf';

export const storyIndexers = (indexers: StoryIndexer[]): StoryIndexer[] => {
  const jsonIndexer: StoryIndexer['indexer'] = async (fileName, { makeTitle }) => {
    const json = JSON.parse(readFileSync(fileName, 'utf8'));

    const title = makeTitle(json.title);
    return {
      meta: { title },
      stories: json.stories.map(
        ({ name, parameters }: { name: string; parameters: Parameters }) => ({
          id: toId(title, name),
          name,
          parameters,
        })
      ),
    };
  };

  return [
    {
      test: /(stories|story)\.json$/,
      indexer: jsonIndexer,
    },
    ...(indexers || []),
  ];
};
