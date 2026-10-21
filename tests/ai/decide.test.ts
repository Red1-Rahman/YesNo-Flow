import { beforeEach, describe, expect, it, vi } from "vitest"
const { createCompletion, constructorOptions } = vi.hoisted(() => ({ createCompletion: vi.fn(), constructorOptions: [] as unknown[] }))
vi.mock("openai", () => ({ OpenAI: class { chat = { completions: { create: createCompletion } }; constructor(options: unknown) { constructorOptions.push(options) } } }))
const envMock = vi.hoisted(() => ({ OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: "https://api.openai.com/v1", OPENAI_MODEL: "gpt-4o-mini", LLM_STRUCTURED_OUTPUT: "auto" as "auto" | "schema" | "off" }))
vi.mock("../../src/lib/env", () => ({ env: envMock }))
import { decide } from "../../src/lib/ai/decide"

const response = (content: string, model = "test-model") => ({ choices: [{ message: { content } }], model })
describe("decide", () => {
  beforeEach(() => {
    createCompletion.mockReset()
    createCompletion.mockResolvedValue(response('{"answer":"YES","citations":[]}'))
    envMock.OPENAI_API_KEY = "test-key"
    envMock.LLM_STRUCTURED_OUTPUT = "auto"
  })
  it("uses strict JSON schema, captures the model, and returns the answer contract", async () => {
    expect(await decide({ prompt: "Is this true?", input: "x" })).toEqual({ answer: "YES", citations: [], grounded: false, model: "test-model" })
    expect(constructorOptions[0]).toEqual({ apiKey: "test-key", baseURL: "https://api.openai.com/v1" })
    const request = createCompletion.mock.calls[0][0]
    expect(request.response_format.json_schema.strict).toBe(true)
    expect(request.response_format.json_schema.schema.required).toEqual(["answer", "citations"])
    expect(request.max_tokens).toBe(400)
  })
  it("falls back once after a 400 in auto mode", async () => {
    createCompletion.mockRejectedValueOnce(Object.assign(new Error("unsupported"), { status: 400 })).mockResolvedValueOnce(response('{"answer":"NO","citations":[]}'))
    expect((await decide({ prompt: "Question?", input: "x" })).answer).toBe("NO")
    expect(createCompletion).toHaveBeenCalledTimes(2)
    expect(createCompletion.mock.calls[1][0].response_format).toBeUndefined()
  })
  it("does not fall back in schema mode or for 401", async () => {
    envMock.LLM_STRUCTURED_OUTPUT = "schema"
    createCompletion.mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }))
    await expect(decide({ prompt: "Question?", input: "x" })).rejects.toThrow(/model request failed/i)
    expect(createCompletion).toHaveBeenCalledTimes(1)
  })
  it("ignores citations without context and verifies quotes with context", async () => {
    createCompletion.mockResolvedValueOnce(response('{"answer":"NO","citations":[{"sourceId":"wallet","quote":"balance: 80"}]}'))
    const noContext = await decide({ prompt: "Question?", input: "x" })
    expect(noContext.citations).toEqual([])
    createCompletion.mockResolvedValueOnce(response('{"answer":"NO","citations":[{"sourceId":"wallet","quote":"balance: 80"}]}'))
    const withContext = await decide({ prompt: "Question?", input: "x", context: [{ sourceId: "wallet", format: "json", title: "wallet", content: "balance: 80", truncated: false }] })
    expect(withContext.grounded).toBe(true)
  })
  it("converts provider 429 responses to RetryAfterError", async () => {
    createCompletion.mockRejectedValueOnce(Object.assign(new Error("rate limit"), { status: 429, headers: new Headers({ "retry-after": "3" }) }))
    await expect(decide({ prompt: "Question?", input: "x" })).rejects.toMatchObject({ name: "RetryAfterError" })
  })
})
