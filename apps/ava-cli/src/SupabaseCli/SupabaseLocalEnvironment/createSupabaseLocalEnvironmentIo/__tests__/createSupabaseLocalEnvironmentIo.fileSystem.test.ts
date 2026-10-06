import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { promiseMap } from "@avandar/utils";
import { afterEach, describe, expect, it } from "vitest";

let temporaryDirectories: string[] = [];

type RelativePathAssertionOptions = {
  io: ReturnType<typeof createSupabaseLocalEnvironmentIo>;
  projectRoot: string;
  sourcePath: string;
  targetPath: string;
  directoryPath: string;
  removePath: string;
};

afterEach(async () => {
  const directoriesToRemove = temporaryDirectories;
  temporaryDirectories = [];
  await promiseMap(directoriesToRemove, async (directoryPath) => {
    await rm(directoryPath, { recursive: true, force: true });
  });
});

async function _expectRelativePathsToReject(
  options: Readonly<RelativePathAssertionOptions>,
): Promise<void> {
  const relativePathFromCurrentDirectory = (absolutePath: string): string => {
    return path.relative(process.cwd(), absolutePath);
  };
  const operations = [
    options.io.readTextFile(
      relativePathFromCurrentDirectory(options.sourcePath),
    ),
    options.io.writeTextFile({
      filePath: relativePathFromCurrentDirectory(options.targetPath),
      contents: "changed",
    }),
    options.io.copyFile({
      sourcePath: relativePathFromCurrentDirectory(options.sourcePath),
      targetPath: relativePathFromCurrentDirectory(options.targetPath),
    }),
    options.io.readDirectory(
      relativePathFromCurrentDirectory(options.projectRoot),
    ),
    options.io.isFile(relativePathFromCurrentDirectory(options.sourcePath)),
    options.io.isDirectory(
      relativePathFromCurrentDirectory(options.directoryPath),
    ),
    options.io.makeDirectory(
      relativePathFromCurrentDirectory(options.directoryPath),
    ),
    options.io.reserveDirectory(
      relativePathFromCurrentDirectory(options.directoryPath),
    ),
    options.io.pathExists(relativePathFromCurrentDirectory(options.sourcePath)),
    options.io.realPath(relativePathFromCurrentDirectory(options.sourcePath)),
    options.io.removePath(relativePathFromCurrentDirectory(options.removePath)),
  ];
  await Promise.all(
    operations.map(async (operation) => {
      await expect(operation).rejects.toThrow("absolute");
    }),
  );
}

describe("createSupabaseLocalEnvironmentIo (filesystem and paths)", () => {
  it("distinguishes files from directories", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const filePath = path.join(projectRoot, "file.txt");
    await writeFile(filePath, "file", "utf8");
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.isFile(filePath)).resolves.toBe(true);
    await expect(io.isFile(projectRoot)).resolves.toBe(false);
  });

  it("does not treat a symlink to a file as a regular file", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const targetPath = path.join(projectRoot, "target.txt");
    const symlinkPath = path.join(projectRoot, "target-link.txt");
    await writeFile(targetPath, "target", "utf8");
    await symlink(targetPath, symlinkPath);
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.isFile(symlinkPath)).resolves.toBe(false);
  });

  it("recognizes only non-symlink directories", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const directoryPath = path.join(projectRoot, "directory");
    const symlinkPath = path.join(projectRoot, "directory-link");
    const filePath = path.join(projectRoot, "file.txt");
    await mkdir(directoryPath);
    await symlink(directoryPath, symlinkPath);
    await writeFile(filePath, "file", "utf8");
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.isDirectory(directoryPath)).resolves.toBe(true);
    await expect(io.isDirectory(symlinkPath)).resolves.toBe(false);
    await expect(io.isDirectory(filePath)).resolves.toBe(false);
  });

  it("lists direct directory entries in sorted order", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    await Promise.all([
      writeFile(path.join(projectRoot, "second.txt"), "second", "utf8"),
      writeFile(path.join(projectRoot, "first.txt"), "first", "utf8"),
    ]);
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.readDirectory(projectRoot)).resolves.toEqual([
      "first.txt",
      "second.txt",
    ]);
  });

  it("reserves a directory exactly once", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const reservationPath = path.join(projectRoot, "reservation");
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.reserveDirectory(reservationPath)).resolves.toBe(true);
    await expect(io.reserveDirectory(reservationPath)).resolves.toBe(false);
  });

  it("resolves a filesystem path to its canonical target", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const targetPath = path.join(projectRoot, "target.txt");
    const symlinkPath = path.join(projectRoot, "target-link.txt");
    await writeFile(targetPath, "target", "utf8");
    await symlink(targetPath, symlinkPath);
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.realPath(symlinkPath)).resolves.toBe(
      await realpath(targetPath),
    );
  });

  it("reports a dangling symlink as an existing filesystem entry", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const symlinkPath = path.join(projectRoot, "dangling-link.txt");
    await symlink(path.join(projectRoot, "missing.txt"), symlinkPath);
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.pathExists(symlinkPath)).resolves.toBe(true);
  });

  it("finds only development environment files in sorted order", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    await promiseMap(
      [".env.development.edge", ".env.production", ".env.development"],
      async (fileName) => {
        await writeFile(
          path.join(projectRoot, fileName),
          "VALUE=test\n",
          "utf8",
        );
      },
    );

    const io = createSupabaseLocalEnvironmentIo(projectRoot);
    await expect(io.findDevelopmentEnvFiles()).resolves.toEqual([
      path.join(projectRoot, ".env.development"),
      path.join(projectRoot, ".env.development.edge"),
    ]);
  });

  it("finds non-regular development environment candidates for validation", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const targetPath = path.join(projectRoot, "target.txt");
    const directoryPath = path.join(projectRoot, ".env.development.directory");
    const symlinkPath = path.join(projectRoot, ".env.development.link");
    await writeFile(targetPath, "target", "utf8");
    await mkdir(directoryPath);
    await symlink(targetPath, symlinkPath);
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(io.findDevelopmentEnvFiles()).resolves.toEqual([
      directoryPath,
      symlinkPath,
    ]);
  });

  it("rejects a relative project root", () => {
    expect(() => {
      return createSupabaseLocalEnvironmentIo("relative-project-root");
    }).toThrow("absolute");
  });

  it("rejects relative filesystem paths before changing files", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    const sourcePath = path.join(projectRoot, "source.txt");
    const targetPath = path.join(projectRoot, "target.txt");
    const directoryPath = path.join(projectRoot, "directory");
    const removePath = path.join(projectRoot, "remove.txt");
    await Promise.all([
      writeFile(sourcePath, "source", "utf8"),
      writeFile(targetPath, "target", "utf8"),
      writeFile(removePath, "do not remove", "utf8"),
    ]);
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await _expectRelativePathsToReject({
      io,
      projectRoot,
      sourcePath,
      targetPath,
      directoryPath,
      removePath,
    });

    await expect(readFile(targetPath, "utf8")).resolves.toBe("target");
    await expect(readFile(removePath, "utf8")).resolves.toBe("do not remove");
  });
});
