export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const icon = (name: string, size = 22) => {
  const paths: Record<string, string> = {
    moon: '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>',
    profile:
      '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    body: '<circle cx="12" cy="4" r="2"/><path d="m7 8 5 2 5-2m-5 2v5m0 0-4 7m4-7 4 7M7 8l-3 7m13-7 3 7"/>',
    document: '<path d="M14 2H5v20h14V7Z M14 2v5h5M8 12h8m-8 4h6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    cloud:
      '<path d="M6 18a4 4 0 0 1-1-7.9 6.5 6.5 0 0 1 12.6-1.4A4.7 4.7 0 1 1 18 18Z"/>',
    rain: '<path d="M6 15a4 4 0 0 1-1-7 6.5 6.5 0 0 1 12-1A4.5 4.5 0 0 1 18 15M7 18l-1 3m6-3-1 3m6-3-1 3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3"/>',
    closet: '<path d="M4 3h16v18H4zM12 3v18M9 10v3m6-3v3"/>',
    looks:
      '<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5M5 8a7.5 7.5 0 0 1 12-3l3 4M4 15l3 4a7.5 7.5 0 0 0 12-3"/>',
    spark:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    drop: '<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
    hanger:
      '<path d="M10 7a2 2 0 1 1 3 1.7V11l8 5a2 2 0 0 1-1 4H4a2 2 0 0 1-1-4l10-5"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};
