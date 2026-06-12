import config from "@payload-config"
import type { Payload } from "payload"
import { getPayload } from "payload"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

let payload: Payload

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe("Plugin integration tests", () => {
  test("registers RBAC collections", () => {
    expect(payload.collections.roles).toBeDefined()
    expect(payload.collections.permissions).toBeDefined()
    expect(payload.collections["roles-permissions"]).toBeDefined()
  })
})
