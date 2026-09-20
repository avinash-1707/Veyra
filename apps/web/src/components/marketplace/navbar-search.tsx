"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";

type SearchSuggestion = {
  type: "query" | "category";
  value: string;
};

type SuggestionsResponse = {
  suggestions: SearchSuggestion[];
};

export function NavbarSearch() {
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Suggestions unavailable");
          return (await response.json()) as SuggestionsResponse;
        })
        .then((response) => {
          if (controller.signal.aborted || currentRequestId !== requestId.current) return;
          setSuggestions(response.suggestions);
          setIsOpen(response.suggestions.length > 0);
          setActiveIndex(-1);
        })
        .catch((error: unknown) => {
          if (
            controller.signal.aborted ||
            currentRequestId !== requestId.current ||
            (error instanceof DOMException && error.name === "AbortError")
          )
            return;
          setSuggestions([]);
          setIsOpen(false);
          setActiveIndex(-1);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const navigateToSuggestion = (suggestion: SearchSuggestion) => {
    router.push(`/intelligent-search?q=${encodeURIComponent(suggestion.value)}`);
    setIsOpen(false);
  };

  const selectActiveSuggestion = () => {
    const suggestion = suggestions[activeIndex];
    if (suggestion === undefined) return false;
    navigateToSuggestion(suggestion);
    return true;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectActiveSuggestion();
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const activeDescendant = isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <form action="/intelligent-search" className="nav-search-form" method="get">
      <label className="sr-only" htmlFor="marketplace-search">
        Search products, brands, and categories
      </label>
      <FiSearch className="nav-search-icon" aria-hidden="true" />
      <input
        id="marketplace-search"
        name="q"
        placeholder="Search products, brands, and categories"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(suggestions.length > 0)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-activedescendant={activeDescendant}
      />
      {isOpen ? (
        <ul id={listboxId} className="nav-search-suggestions" role="listbox" aria-label="Search recommendations">
          {suggestions.map((suggestion, index) => (
            <li
              id={`${listboxId}-option-${index}`}
              key={`${suggestion.type}-${suggestion.value}`}
              className={index === activeIndex ? "is-active" : undefined}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => navigateToSuggestion(suggestion)}
            >
              <span>{suggestion.value}</span>
              <span className="nav-search-suggestion-type">
                {suggestion.type === "category" ? "Category" : "Query"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
