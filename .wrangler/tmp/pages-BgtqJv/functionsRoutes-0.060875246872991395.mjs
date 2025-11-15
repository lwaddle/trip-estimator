import { onRequest as __api_estimates___route___js_onRequest } from "/Users/lwaddle/dev/trip-estimator/functions/api/estimates/[[route]].js"

export const routes = [
    {
      routePath: "/api/estimates/:route*",
      mountPath: "/api/estimates",
      method: "",
      middlewares: [],
      modules: [__api_estimates___route___js_onRequest],
    },
  ]