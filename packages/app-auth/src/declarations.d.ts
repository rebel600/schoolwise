/**
 * Ambient declarations for this package.
 *
 * `@school-wise/styleguide` is deliberately NOT declared here. It is a real
 * workspace dependency, so its types resolve from source. A hand-written
 * `declare module` shim would silently drift from the actual component API —
 * which is exactly the runtime version skew described in
 * docs/adr/0001-single-spa-micro-frontends.md, moved to compile time.
 */

export {};
