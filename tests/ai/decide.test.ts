import { beforeEach, describe, expect, it, vi } from "vitest"

const { createCompletion, constructorOptions } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  constructorOptions: [] as unknown[],
}))

vi.mock("openai", () => {
  return {
    OpenAI: class {
      chat = { completions: { create: createCompletion } }

      constructor(options: unknown) {
        constructorOptions.push(options)
      }
    },
  }
})

vi.mock("../../src/lib/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
    OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
    OPENAI_MODEL: "openrouter/free",
  },
}))

import { decide } from "../../src/lib/ai/decide"

describe("decide", () => {
  beforeEach(() => {
    createCompletion.mockReset()
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '{"answer":"YES"}' } }],
    })
  })

  it("uses the configured OpenRouter base URL and free model", async () => {
    expect(constructorOptions[0]).toEqual({
      apiKey: "test-key",
      baseURL: "https://openrouter.ai/api/v1",
    })
    expect(await decide({ prompt: "Is this a support request?", input: "Broken item" })).toBe("YES")

    const request = createCompletion.mock.calls[0][0]
    expect(request.model).toBe("openrouter/free")
    expect(request.temperature).toBe(0)
    expect(request.response_format.json_schema.strict).toBe(true)
    expect(request.response_format.json_schema.schema.properties.answer.enum).toEqual(["YES", "NO"])
  })

  it("rejects any response that is not YES or NO", async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '{"answer":"MAYBE"}' } }],
    })

    await expect(decide({ prompt: "Is this a support request?", input: "Maybe" })).rejects.toThrow()
  })
})
