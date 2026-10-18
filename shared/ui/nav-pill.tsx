import { ViewTransition } from "react";

// The active-item pill for menus (sidebar, mobile bar, settings). Only the active item renders
// it, under one shared name per menu, so on navigation React morphs it from the old item to the
// new one and it glides across. CSS: the nav-pill and nav-label rules in app/globals.css.

const ident = (value: string) => value.replace(/[^a-zA-Z0-9]+/g, "-");

/** The accent pill behind the active item. The item must be `relative`; put this before its label. */
export function NavPill({ menu }: { menu: string }) {
  return (
    <ViewTransition name={`${ident(menu)}-pill`} share="nav-pill" default="none">
      <span className="absolute inset-0 rounded-full bg-accent" aria-hidden />
    </ViewTransition>
  );
}

/**
 * Names an item's label for view transitions. Named content draws above the page, so without
 * this the moving pill would pass over the labels; with it, a label's colour cross-fades as the
 * pill arrives or leaves. Names must be unique among visible elements: one per menu and item.
 */
export function navLabelStyle(menu: string, item: string): React.CSSProperties {
  return { viewTransitionName: `${ident(menu)}-label-${ident(item)}`, viewTransitionClass: "nav-label" };
}
