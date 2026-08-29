"use client"

import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerNested,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { FilterOptionList } from "@/components/academic/filter-drawer"
import { ChevronDownIcon } from "lucide-react"

export interface ResponsiveSelectItem {
  value: string
  label: string
}

/** 桌面使用下拉菜单，移动端使用可滚动抽屉。 */
export function ResponsiveSelect({
  value,
  onValueChange,
  items,
  placeholder,
  title,
  nested,
  className,
  id,
}: {
  value: string
  onValueChange: (value: string) => void
  items: ReadonlyArray<ResponsiveSelectItem>
  placeholder?: string
  /** 移动端抽屉标题，缺省用 placeholder。 */
  title?: string
  /** 渲染在另一个 Drawer 内部时置真（使用嵌套抽屉根）。 */
  nested?: boolean
  className?: string
  id?: string
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const activeLabel = items.find((i) => i.value === value)?.label
  const DrawerRoot = nested ? DrawerNested : Drawer

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className={cn(
          // 与桌面触发器保持一致
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none dark:bg-input/30",
          className
        )}
      >
        <span
          className={cn(
            "line-clamp-1",
            !activeLabel && "text-muted-foreground"
          )}
        >
          {activeLabel ?? placeholder}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <DrawerRoot open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title ?? placeholder ?? ""}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <FilterOptionList
              items={items}
              value={value}
              onChange={(v) => {
                onValueChange(v)
                setOpen(false)
              }}
            />
          </div>
        </DrawerContent>
      </DrawerRoot>
    </>
  )
}
