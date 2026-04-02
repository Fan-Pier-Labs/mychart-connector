export function track(event: string, properties?: Record<string, unknown>) {
  import('@amplitude/analytics-browser').then((amplitude) => {
    amplitude.track(event, properties);
  }).catch(() => {});
}
