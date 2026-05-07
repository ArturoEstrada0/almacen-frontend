import { redirect } from "next/navigation"

export default function QuotationsPageRedirect() {
  redirect("/suppliers?tab=quotations")
}
