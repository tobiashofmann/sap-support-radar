# 0014 – Use reactive control properties instead of dynamic `class` bindings

**Status:** Accepted

## Context

This is a direct consequence of [choosing XML views](/adr/0003-xml-views): several places in the UI need
per-instance, data-driven styling — most notably the app shell's navigation tabs (`App.view.xml`), which
should visually highlight whichever route is currently active (`navigation>/activeRoute`, kept in sync by
`App.onAnyRouteMatched`). The natural-looking approach in an XMLView is a dynamic `class` binding:

```xml
<Button class="{= ${navigation>/activeRoute} === 'main' ? 'pamNavTabActive' : '' }" />
```

This was tried and, confirmed by DOM inspection, **does not update reactively** — both the
`class="{path: ..., formatter: ...}"` and `class="{= expression }"` forms only resolve once, at initial
XMLView render. Subsequent changes to the bound model property never re-run the expression, so the `class`
attribute silently goes stale the first time the user navigates.

## Decision

For any per-instance, reactively-bound styling, bind a **real UI5 control property** instead — one UI5
itself keeps in sync — and target the CSS class the framework automatically adds/removes for that property.
Concretely, the nav tabs use `sap.m.ToggleButton` (not `Button`) with its `pressed` property bound via an
expression comparing `activeRoute` to the tab's own route name:

```xml
<ToggleButton pressed="{= ${navigation>/activeRoute} === 'main' }" class="pamNavTab" />
```

`pressed` *is* a genuinely reactive, two-way-capable control property, so UI5 correctly toggles the
framework's own `.sapMToggleBtnPressed` CSS class on the rendered DOM element whenever `activeRoute`
changes. `css/style.css` then styles `.pamNavTab.sapMToggleBtnPressed` for the active-tab appearance,
instead of trying to bind a custom class directly. The same pattern generalizes to other controls with a
reactive state property that drives a framework-managed CSS class — e.g. `ObjectStatus`'s `state`/
`inverted`.

## Consequences

- **Positive:** Styling driven by model data is now genuinely reactive and matches what the control
  visually communicates (a "pressed" nav tab) with what it semantically *is* (a toggle), rather than fighting
  the binding system with a workaround.
- **Positive:** The underlying gotcha is explicitly documented (in `CLAUDE.md` and here), so it doesn't get
  silently reintroduced by a future contributor reaching for `class="{...}"` again out of habit.
- **Negative:** Requires picking a control that already has a suitable reactive property (or wrapping one
  that doesn't) rather than attaching arbitrary styling to any control via `class`. This is a minor
  constraint in practice — `ToggleButton`/`ObjectStatus` cover the cases encountered so far — but it means
  this pattern doesn't trivially generalize to *every* possible dynamic-styling need.
- **Negative:** The visual effect is coupled to whichever CSS class the framework happens to manage for that
  property (`.sapMToggleBtnPressed` here), which is framework-internal naming, not a project-defined
  contract — a future UI5 version changing that class name would require updating `css/style.css` too.
