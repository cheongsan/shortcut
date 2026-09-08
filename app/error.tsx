"use client"

import { QuietLinkClasses } from "@/components/ui"

/** Rendered when a page throws -- most realistically when Notion is
 *  unreachable and the snapshot has no stale copy to serve.
 *
 *  It matters that this is NOT the "존재하지 않는 바로가기" screen. Telling a
 *  user their working shortcut does not exist invites them to delete and
 *  recreate the Notion row, which fixes nothing. Three states are kept
 *  distinct: known key, unknown key (404), temporarily unavailable. */
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[60svh] place-items-center py-10">
      <div className="w-full max-w-md text-center">
        <p aria-hidden className="text-6xl/none">
          😵‍💫
        </p>
        <h1 className="mt-10 text-3xl/9 text-fg-muted">일시적인 오류입니다</h1>
        <p className="mt-4 text-sm/5 text-fg-muted">
          잠시 후 다시 시도해 주세요.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className={QuietLinkClasses()}>
            다시 시도
          </button>
          {/* Intentionally a plain <a>, not <Link>: an error boundary needs a
              hard document load to escape a broken client state, which a soft
              client-side navigation would not do. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={QuietLinkClasses()}>
            처음으로
          </a>
        </div>
      </div>
    </div>
  )
}
