"use server"

import { redirect } from "next/navigation"
import { parseKey } from "@/lib/key"

export type ShortcutFormState = { error: string | null }

/** A React 19 server action, so `<form action={...}>` progressively enhances:
 *  the key box submits and redirects even with JavaScript disabled.
 *
 *  It is also why "/" can stay fully prerendered -- nothing reads searchParams. */
export async function goToShortcut(
  _prev: ShortcutFormState,
  formData: FormData
): Promise<ShortcutFormState> {
  const raw = String(formData.get("key") ?? "")

  if (!raw.trim()) {
    return { error: "바로가기 키를 입력해 주세요." }
  }

  const key = parseKey(raw)
  if (!key) {
    return {
      error: "영문·숫자로 시작하고 - _ 만 쓸 수 있습니다. (최대 64자)",
    }
  }

  redirect(`/${key}`)
}
