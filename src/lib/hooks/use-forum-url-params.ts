"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Forum's category/search/sort state lives entirely in the URL's
// search params (research.md #2, Browse's precedent) -- shared by the
// category chips, sort chips, and search input on /forum's page.
export function useForumUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function replace(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
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
    setSort(value: string) {
      replace((params) => {
        if (value === "latest") params.delete("sort");
        else params.set("sort", value);
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
