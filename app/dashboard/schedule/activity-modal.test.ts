import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Course } from "@/providers/types"

const mocks = vi.hoisted(() => ({ useTrainingPlan: vi.fn() }))

vi.mock("@/providers/hooks", () => ({ useTrainingPlan: mocks.useTrainingPlan }))
vi.mock("@/providers/use-provider", () => ({ useProvider: () => ({}) }))
vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("@/components/responsive-modal", async () => {
  const { createElement } = await import("react")
  const wrapper = ({ children }: React.PropsWithChildren) => createElement("div", null, children)
  return Object.fromEntries([
    "ResponsiveModal", "ResponsiveModalBody", "ResponsiveModalContent",
    "ResponsiveModalDescription", "ResponsiveModalHeader", "ResponsiveModalTitle",
  ].map((name) => [name, wrapper]))
})

import { ActivityModal } from "./activity-modal"

const course: Course = {
  name: "测试课程", code: "14110040", weekDay: 1, startSection: 1, endSection: 2,
}

function renderCourse(value: Course) {
  return renderToStaticMarkup(React.createElement(ActivityModal, {
    course: value, week: 8, open: true, onOpenChange: () => {},
  }))
}

describe("课程详情学分", () => {
  beforeEach(() => vi.stubGlobal("React", React))
  afterEach(() => vi.unstubAllGlobals())

  it.each([["", "0.25"], ["1", "1.5"]])("以培养方案补全课表学分 %s → %s", (raw, credit) => {
    mocks.useTrainingPlan.mockReturnValue({ data: [{ courseCode: course.code, credit }] })
    expect(renderCourse({ ...course, credit: raw })).toContain(`schedule.credit ${credit}`)
    expect(mocks.useTrainingPlan).toHaveBeenLastCalledWith(undefined, true)
  })

  it("没有匹配课程时保留课表学分", () => {
    mocks.useTrainingPlan.mockReturnValue({ data: [{ courseCode: "other", credit: "0.25" }] })
    expect(renderCourse({ ...course, credit: "2.5" })).toContain("schedule.credit 2.5")
  })

  it("无课程号时不匹配缺少课程号的培养方案条目", () => {
    mocks.useTrainingPlan.mockReturnValue({ data: [{ credit: "0.25" }] })
    expect(renderCourse({ ...course, code: undefined, credit: "2.5" })).toContain("schedule.credit 2.5")
    expect(mocks.useTrainingPlan).toHaveBeenLastCalledWith(undefined, false)
  })
})
