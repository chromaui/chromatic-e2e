export default async function setup() {
  // @ts-expect-error -- untyped
  const { server } = await import('../../../../test-server/server');

  return function teardown() {
    server.close();
  };
}
