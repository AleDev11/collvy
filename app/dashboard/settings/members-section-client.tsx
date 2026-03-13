"use client"

import dynamic from "next/dynamic"

const MembersSectionDynamic = dynamic(
  () => import("./members-section").then((m) => m.MembersSection),
  { ssr: false },
)

export function MembersSectionClient(props: React.ComponentProps<typeof MembersSectionDynamic>) {
  return <MembersSectionDynamic {...props} />
}
