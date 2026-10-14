import { generateReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/generateReleaseNotes/generateReleaseNotes";
import { describe, expect, it, vi } from "vitest";
import type { ReleaseChangelogCommitInput } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";

function _commit(
  overrides: Partial<ReleaseChangelogCommitInput> = {},
): ReleaseChangelogCommitInput {
  return {
    sha: "abc1234full",
    shortSha: "abc1234",
    subject: "A change",
    stat: "1 file changed",
    diff: "diff --git a/foo b/foo",
    ...overrides,
  };
}

function _fakeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => {
      return body;
    },
    text: async () => {
      return JSON.stringify(body);
    },
  } as Response;
}

describe("generateReleaseNotes", () => {
  it("never calls the real global fetch: every call goes through fetchImpl", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      _fakeResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                bullets: [
                  {
                    group: "Features",
                    text: "Did a thing",
                    commits: ["abc1234"],
                  },
                ],
              }),
            },
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const globalFetchSpy = vi.spyOn(globalThis, "fetch");

    const notes = await generateReleaseNotes({
      releaseVersion: "0.14.0",
      commits: [_commit()],
      apiKey: "test-key",
      model: "test-model",
      fetchImpl,
    });

    expect(notes).toBe("- Did a thing");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it("sends the API key as a bearer token and the model in the body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        _fakeResponse({
          choices: [{ message: { content: '{"bullets":[]}' } }],
        }),
      );

    await generateReleaseNotes({
      releaseVersion: "0.14.0",
      commits: [],
      apiKey: "secret-key",
      model: "the-model",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-key",
    );
    const body = JSON.parse(init.body as string) as { model: string };
    expect(body.model).toBe("the-model");
  });

  it("throws a descriptive error when OpenAI returns a non-ok response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(_fakeResponse("rate limited", false, 429));

    await expect(
      generateReleaseNotes({
        releaseVersion: "0.14.0",
        commits: [],
        apiKey: "k",
        model: "m",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/OpenAI request failed \(429\)/);
  });

  it("throws when the model's JSON is missing a bullets array", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        _fakeResponse({ choices: [{ message: { content: '{"oops":true}' } }] }),
      );

    await expect(
      generateReleaseNotes({
        releaseVersion: "0.14.0",
        commits: [],
        apiKey: "k",
        model: "m",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/bullets array/);
  });
});
