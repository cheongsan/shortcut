"use client"

import { ArrowRight, Info, TriangleAlert } from "lucide-react"
import { useActionState, useEffect } from "react"
import { goToShortcut, type ShortcutFormState } from "@/app/actions"
import { useNavLoading } from "@/components/layout/nav-loading"
import { ActionButton, KeyInput } from "@/components/ui"

/** The blog has no <form> and no onSubmit anywhere -- its only input is a
 *  search box that filters with useState -- so this is new ground. Only the
 *  look is ported (pill input, full width, page-ground fill). */
export function ShortcutForm({
  defaultValue = "",
  initialError = null,
}: {
  defaultValue?: string
  initialError?: string | null
}) {
  const [state, action, pending] = useActionState<ShortcutFormState, FormData>(
    goToShortcut,
    { error: initialError }
  )

  // Mirrored rather than set once on submit: an unknown key returns an error
  // and stays on this page, so a one-way trigger would leave the logo
  // shimmering forever.
  const { setLoading } = useNavLoading()
  useEffect(() => setLoading(pending), [pending, setLoading])

  return (
    <form action={action} className="card flex flex-col gap-2">
      {/* A real label, not a placeholder-as-label: placeholders vanish on
          input and are not reliably announced. */}
      <label htmlFor="shortcut-key" className="sr-only">
        바로가기 키
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <KeyInput
          id="shortcut-key"
          name="key"
          type="text"
          defaultValue={defaultValue}
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
          enterKeyHint="go"
          maxLength={64}
          // Native validation, so a malformed key never reaches the server even
          // with JavaScript disabled. Uppercase is allowed here because
          // normalizeKey() lowercases -- the pattern must match what we ACCEPT,
          // not what we store.
          pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,63}"
          title="영문·숫자로 시작하고 - _ 만 쓸 수 있습니다."
          placeholder="여기에 바로가기 키를 입력하세요."
          aria-invalid={state.error ? true : undefined}
          // Unconditional, unlike aria-invalid. On the server-rendered
          // not-found screen there is no DOM mutation for a live region to
          // announce, so the message reaches a screen reader as part of the
          // focus announcement instead (autoFocus + this description).
          aria-describedby="shortcut-error shortcut-hint"
        />

        <ActionButton type="submit" disabled={pending} className="w-full sm:w-auto">
          이동
          <ArrowRight aria-hidden className="size-4" />
        </ActionButton>
      </div>

      {/* Both messages live in ONE wrapper so they sit at exactly the same
          offset below the input.
          Without it the empty error <p> stays a flex child of the form, and the
          form's gap-2 applies twice -- once above the empty element and once
          below it -- putting the hint 16px under the input while the warning
          sits at 8px. With the wrapper the form's gap applies once, and the
          empty element contributes no height and no gap of its own.

          The live region is rendered unconditionally: it must already be in the
          accessibility tree BEFORE its text changes, or the announcement is
          dropped. Conditionally rendering this <p> is the single most common way
          that silently fails. It carries ONLY the error -- role="alert" on a
          permanently visible note would have it announced as an alert. Exactly
          one of the two is ever visible, and both are text-sm/5 with the same
          size-3.5 icon, so swapping them cannot shift the layout. */}
      <div className="px-1">
        <p
          id="shortcut-error"
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-1.5 text-sm/5 text-destructive"
        >
          {state.error ? (
            <>
              <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
              {state.error}
            </>
          ) : null}
        </p>

        {state.error ? null : (
          <p
            id="shortcut-hint"
            className="flex items-center gap-1.5 text-sm/5 text-fg-muted"
          >
            <Info aria-hidden className="size-3.5 shrink-0" />
            등록된 바로가기만 이동할 수 있습니다.
          </p>
        )}
      </div>
    </form>
  )
}
