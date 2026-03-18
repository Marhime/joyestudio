import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** Background color used for the pixel grid fill during page transitions. */
    pageColor?: string;
    /** When true, grid stays visible after navigation (e.g. homepage hero scroll). */
    keepGrid?: boolean;
  }
}
