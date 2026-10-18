// Runs in the browser before the app becomes interactive (Next.js file convention).
import { guardViewTransitions, ignoreAbortedViewTransitions } from "@/shared/lib/view-transitions";

// Aborted navigation animations must not show up as uncaught errors (see the module).
guardViewTransitions(document);
ignoreAbortedViewTransitions(window);
