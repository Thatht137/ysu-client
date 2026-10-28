import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as CookieModule from "@/lib/cookie"

const mocks = vi.hoisted(() => ({
  fetchWithJar: vi.fn(),
  authorize: vi.fn(),
  getCredentialApplied: vi.fn(),
}))

vi.mock("@/lib/cookie", async (importOriginal) => ({
  ...(await importOriginal<typeof CookieModule>()),
  fetchWithJar: mocks.fetchWithJar,
}))
vi.mock("./cas", () => ({
  authorize: mocks.authorize,
  getCredentialApplied: mocks.getCredentialApplied,
}))

import { querySchedule, resetJWXT } from "./jwxt"

describe("课表学分", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetJWXT()
  })

  it.each([0.25, "0.25", 0.4, "0.4", 1.5, "1.5"])(
    "保留接口返回的学分 %s",
    async (credit) => {
      mocks.fetchWithJar.mockResolvedValue({
        status: 200,
        headers: { "content-type": ["application/json"] },
        text: async () => JSON.stringify({
          code: "0",
          datas: {
            cxxszhxqkb: {
              rows: [{ KCM: "职业生涯规划与就业指导III", KCH: "14110040", XF: credit }],
            },
          },
        }),
      })
      const [course] = await querySchedule({ term: "2026-2027-1" })
      expect(course.credit).toBe(String(credit))
    }
  )
})
