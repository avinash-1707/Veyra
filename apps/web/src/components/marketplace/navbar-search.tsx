"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";

import type { SearchSuggestion } from "../../lib/api/types";
import { searchSuggestionsQueryOptions } from "../../lib/queries/discovery";

const emptySuggestions: SearchSuggestion[] = [];

export function NavbarSearch() {
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestionQuery = useQuery(searchSuggestionsQueryOptions(debouncedQuery));
  const suggestions = suggestionQuery.data ?? emptySuggestions;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length === 0 || suggestionQuery.isError) {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    setIsOpen(suggestions.length > 0);
    setActiveIndex(-1);
  }, [debouncedQuery, suggestionQuery.isError, suggestions]);

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
