# 6. Locale registry as the single source of truth

Status: accepted

## Context

All visible text must be translatable and adding a language must not require code changes. Packs
carry labels for every supported locale.

## Decision

A `LocaleRegistry` lists supported locales (initially `es-MX` and `en`). It drives the pack schema
(every localized text requires every locale), the language selector, translation-parity checks in
CI and the scaffolding of new locales. Generated packs are cached by a hash of industry,
description, the set of supported locales and the schema version. The active UI language is not part
of the key, so switching language never regenerates a pack. Progress is stored per concept id,
independent of pack and language.

## Consequences

- Adding a locale later makes older cached packs incomplete; a short validated "translate labels
  only" request completes them.
