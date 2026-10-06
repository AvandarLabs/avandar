/** Matches the host side of a `host:port->container/proto` publication. */
const PUBLISHED_HOST_PORT_PATTERN =
  /(?:0\.0\.0\.0|127\.0\.0\.1|\[::\]|\[::1\]):(\d+)->/g;

function _fromPsOutput(portsOutput: string): number[] {
  const hostPortMatches = [
    ...portsOutput.matchAll(PUBLISHED_HOST_PORT_PATTERN),
  ].map((match) => {
    return Number(match[1]);
  });
  return [...new Set(hostPortMatches)].sort((leftPort, rightPort) => {
    return leftPort - rightPort;
  });
}

/** Reads host TCP ports Docker has already published for running containers. */
export const DockerPublishedPorts = {
  /** Parses the `Ports` column from `docker ps` into unique host ports. */
  fromPsOutput: _fromPsOutput,
};
