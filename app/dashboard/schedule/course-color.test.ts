import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { COURSE_BG_CLASSES, COURSE_PALETTE_SIZE } from "./course-color"

describe("课表配色", () => {
  it("每种课程颜色都有浅色、深色和 Tailwind 定义，且不透明", () => {
    const css = readFileSync(new URL("../../globals.css", import.meta.url), "utf8")
    expect(COURSE_BG_CLASSES).toHaveLength(COURSE_PALETTE_SIZE)
    for (const className of COURSE_BG_CLASSES) {
      const token = className.slice(3)
      expect(css).toContain(`--color-${token}: var(--${token});`)
      const definitions = [
        ...css.matchAll(new RegExp(`--${token}:\\s*oklch\\(([^)]+)\\)`, "g")),
      ]
      expect(definitions).toHaveLength(2)
      for (const definition of definitions) expect(definition[1]).not.toContain("/")
    }
  })
})
