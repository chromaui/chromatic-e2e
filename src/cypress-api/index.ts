import { writeTestResult } from '../write-archive';

export const archiveCypress = async (snapshot: any) => {
  await writeTestResult(
    null,
    {
      // @ts-ignore
      fromCypress: JSON.stringify(snapshot),
    },
    null,
    {}
  );
};
