import { CenteredScreen } from "@/components/centered-screen"
import { ShortcutForm } from "@/components/shortcut-form"

/** The key-entry screen.
 *
 *  "/" and the not-found boundary render exactly the same thing; a missing key
 *  only adds a message to the form's hint line. There is deliberately no
 *  separate 404 layout -- the user lands back on the one control that can fix
 *  the problem, rather than on a dead end they have to navigate away from. */
export function KeyScreen({
  defaultValue,
  message,
}: {
  defaultValue?: string
  message?: string
}) {
  return (
    <CenteredScreen width="max-w-md">
      <div className="mb-4 px-1">
        <h1 className="text-lg/7 font-medium md:text-xl/7">바로가기</h1>
        <p className="mt-1 text-sm/5 text-fg-muted">
          키를 입력하면 목적지를 확인한 뒤 이동합니다.
        </p>
      </div>
      <ShortcutForm defaultValue={defaultValue} initialError={message} />
    </CenteredScreen>
  )
}
