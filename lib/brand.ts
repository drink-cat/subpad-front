const domainSuffix = "launch.o1.local";

export function brandFromHost(host: string) {
  const hostname = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  const suffix = `.${domainSuffix}`;
  if (!hostname.endsWith(suffix)) return null;
  const brand = hostname.slice(0, -suffix.length);
  if (!brand || brand.includes(".")) return null;
  return brand;
}
