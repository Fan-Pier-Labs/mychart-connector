export function track(event: string, properties?: Record<string, unknown>) {
  import('@amplitude/unified').then((amplitude) => {
    amplitude.track(event, properties);
  }).catch(() => {});
}
