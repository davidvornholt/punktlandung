// Podman beendet einen Container zehn Sekunden, nachdem es ihn zum Anhalten
// aufgefordert hat.
export const drainTimeoutMs = 5000;

/**
 * Nimmt keine Verbindungen mehr an und gibt laufenden Anfragen bis zu drainMs
 * Zeit, bevor die übrigen geschlossen werden.
 */
export const shutdown = async (
  server: Pick<Bun.Server<undefined>, 'stop'>,
  drainMs: number,
): Promise<void> => {
  const drained = await Promise.race([
    server.stop().then(() => true),
    Bun.sleep(drainMs).then(() => false),
  ]);
  if (!drained) {
    await server.stop(true);
  }
};
