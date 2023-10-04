import { createResourceArchive, type ResourceArchive } from '../resource-archive/index';

export function expectArchiveContains(
  archive: ResourceArchive,
  paths: string[],
  pathToResponseInfo: any,
  baseUrl: string
) {
  expect(Object.keys(archive)).toHaveLength(paths.length);

  for (const path of paths) {
    expectArchiveContainsPath(archive, path, pathToResponseInfo, baseUrl);
  }
}

function expectArchiveContainsPath(
  archive: ResourceArchive,
  path: string,
  pathToResponseInfo: any,
  baseUrl: string
) {
  const pathUrl = new URL(path, baseUrl);
  const { pathname } = pathUrl;
  if (!(pathname in pathToResponseInfo)) throw new Error(`Cannot check path ${path}`);

  // Expect path as given to be in the archive
  expect(Object.keys(archive)).toContain(pathUrl.toString());

  const expectedContent = pathToResponseInfo[pathname as keyof typeof pathToResponseInfo].content;
  // Expect the content to match the archive's content, unless it's dynamic
  if (typeof expectedContent !== 'function') {
    const expectedBase64 = Buffer.from(expectedContent).toString('base64');
    const response = archive[pathUrl.toString()];
    if ('error' in response) {
      throw new Error(`Response to ${path} should not be an error`);
    }
    expect(response.body.toString('base64')).toEqual(expectedBase64);
  }
}
