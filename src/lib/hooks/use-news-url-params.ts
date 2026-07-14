"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// News feed's category/search state lives entirely in the URL's search
// params (research.md #1, Forum index's precedent). Unlike Forum,
// changing either resets `page` back to the start of a fresh
// "Load more" sequence -- staying on a stale page number after
// narrowing the filter would silently show fewer/no results even when
// matches exist on page 1.
export function useNewsUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function replace(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return {
    searchParams,
    setCategory(value: string) {
      replace((params) => {
        if (value === "all") params.delete("category");
        else params.set("category", value);
      });
    },
    setQuery(value: string) {
      replace((params) => {
        if (value.trim()) params.set("q", value);
        else params.delete("q");
      });
    },
  };
}
