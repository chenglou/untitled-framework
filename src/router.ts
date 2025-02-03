// export type Route = { type: "a" } | { type: "b" } | { type: "404" };

// type UrlLike = { pathname: string; search: string };

// export function decode(
//   { pathname, search }: UrlLike,
//   href: string,
//   historyPayload: unknown
// ): Route {
//   // whenever we push/replace history, we write our the route object and its payload to history.
//   if (historyPayload != null) {
//     // if you're using Nextjs, you'd also add `if (typeof historyPayload === "object" && !("__N" in historyPayload))` in the condition
//     // on page refresh or first visit for Nextjs, it writes such object to history
//     return historyPayload as Route;
//   }
//   // if history isn't present, then this is a first load
// }
