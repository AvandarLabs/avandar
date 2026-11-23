/** Filesystem identity of an artifact exclusively created by this process. */
export type OwnedProjectArtifact = Readonly<{
  filename: string;
  device: number;
  inode: number;
}>;
