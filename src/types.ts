import { z } from "zod";

// Cloudflare DNS Record types
export const DnsRecordType = z.enum([
  "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"
]);

export const CloudflareDnsRecord = z.object({
  id: z.string(),
  zone_id: z.string().optional(),
  zone_name: z.string().optional(),
  name: z.string(),
  type: DnsRecordType,
  content: z.string(),
  proxied: z.boolean().optional(),
  ttl: z.number(),
  priority: z.number().optional(),
  created_on: z.string(),
  modified_on: z.string(),
  meta: z.object({
    auto_added: z.boolean().optional(),
    managed_by_apps: z.boolean().optional(),
    managed_by_argo_tunnel: z.boolean().optional(),
  }).optional(),
});

export const CloudflareApiResponse = z.object({
  success: z.boolean(),
  errors: z.array(z.object({
    code: z.number(),
    message: z.string(),
  })),
  messages: z.array(z.object({
    code: z.number(),
    message: z.string(),
  })),
  result: z.union([
    z.array(CloudflareDnsRecord),
    CloudflareDnsRecord,
    z.null(),
  ]).optional(),
  result_info: z.object({
    page: z.number(),
    per_page: z.number(),
    count: z.number(),
    total_count: z.number(),
  }).optional(),
});

export const CreateDnsRecordRequest = z.object({
  type: DnsRecordType,
  name: z.string(),
  content: z.string(),
  ttl: z.number().optional().default(1),
  priority: z.number().optional(),
  proxied: z.boolean().optional(),
});

export const UpdateDnsRecordRequest = z.object({
  type: DnsRecordType.optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  ttl: z.number().optional(),
  priority: z.number().optional(),
  proxied: z.boolean().optional(),
});

// Zone management types
export const CloudflareZone = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["active", "pending", "initializing", "moved", "deleted", "deactivated"]),
  paused: z.boolean(),
  type: z.enum(["full", "partial"]),
  development_mode: z.number(),
  name_servers: z.array(z.string()),
  original_name_servers: z.array(z.string()).optional(),
  original_registrar: z.string().optional(),
  original_dnshost: z.string().optional(),
  modified_on: z.string(),
  created_on: z.string(),
  activated_on: z.string().optional(),
  meta: z.object({
    step: z.number().optional(),
    custom_certificate_quota: z.number().optional(),
    page_rule_quota: z.number().optional(),
    phishing_detected: z.boolean().optional(),
    multiple_railguns_allowed: z.boolean().optional(),
  }).optional(),
  owner: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  account: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  permissions: z.array(z.string()).optional(),
  plan: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    currency: z.string(),
    frequency: z.string(),
    is_subscribed: z.boolean(),
    can_subscribe: z.boolean(),
    legacy_id: z.string(),
    legacy_discount: z.boolean(),
    externally_managed: z.boolean(),
  }).optional(),
});

export const CreateZoneRequest = z.object({
  name: z.string(),
  type: z.enum(["full", "partial"]).optional().default("full"),
  jump_start: z.boolean().optional().default(false),
  account: z.object({
    id: z.string(),
  }).optional(),
});

export const ZoneSettings = z.object({
  always_online: z.string().optional(),
  automatic_https_rewrites: z.string().optional(),
  brotli: z.string().optional(),
  browser_cache_ttl: z.number().optional(),
  browser_check: z.string().optional(),
  cache_level: z.string().optional(),
  challenge_ttl: z.number().optional(),
  ciphers: z.array(z.string()).optional(),
  cname_flattening: z.string().optional(),
  development_mode: z.number().optional(),
  email_obfuscation: z.string().optional(),
  hotlink_protection: z.string().optional(),
  http2: z.string().optional(),
  http3: z.string().optional(),
  ip_geolocation: z.string().optional(),
  ipv6: z.string().optional(),
  min_tls_version: z.string().optional(),
  minify: z.object({
    css: z.string(),
    html: z.string(),
    js: z.string(),
  }).optional(),
  mirage: z.string().optional(),
  mobile_redirect: z.object({
    status: z.string(),
    mobile_subdomain: z.string(),
    strip_uri: z.boolean(),
  }).optional(),
  opportunistic_encryption: z.string().optional(),
  opportunistic_onion: z.string().optional(),
  orange_to_orange: z.string().optional(),
  origin_error_page_pass_thru: z.string().optional(),
  polish: z.string().optional(),
  prefetch_preload: z.string().optional(),
  privacy_pass: z.string().optional(),
  pseudo_ipv4: z.string().optional(),
  rocket_loader: z.string().optional(),
  security_header: z.object({
    enabled: z.boolean(),
    max_age: z.number(),
    include_subdomains: z.boolean(),
    nosniff: z.boolean(),
    preload: z.boolean(),
  }).optional(),
  security_level: z.string().optional(),
  server_side_exclude: z.string().optional(),
  sort_query_string_for_cache: z.string().optional(),
  ssl: z.string().optional(),
  tls_1_2_only: z.string().optional(),
  tls_1_3: z.string().optional(),
  tls_client_auth: z.string().optional(),
  true_client_ip_header: z.string().optional(),
  waf: z.string().optional(),
  websockets: z.string().optional(),
});

// Migration status types
export const MigrationStatus = z.enum([
  "not_started",
  "zone_created",
  "dns_imported",
  "nameservers_updated",
  "propagation_waiting",
  "completed",
  "failed"
]);

export const DomainMigration = z.object({
  domain: z.string(),
  status: MigrationStatus,
  zone_id: z.string().optional(),
  nameservers: z.array(z.string()).optional(),
  original_nameservers: z.array(z.string()).optional(),
  dns_records_count: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  error_message: z.string().optional(),
});

export const DnsRecordImport = z.object({
  type: DnsRecordType,
  name: z.string(),
  content: z.string(),
  ttl: z.number().optional(),
  priority: z.number().optional(),
  proxied: z.boolean().optional(),
});

export type DnsRecord = z.infer<typeof CloudflareDnsRecord>;
export type DnsRecordTypeEnum = z.infer<typeof DnsRecordType>;
export type ApiResponse = z.infer<typeof CloudflareApiResponse>;
export type CreateDnsRecord = z.infer<typeof CreateDnsRecordRequest>;
export type UpdateDnsRecord = z.infer<typeof UpdateDnsRecordRequest>;
export type Zone = z.infer<typeof CloudflareZone>;
export type CreateZone = z.infer<typeof CreateZoneRequest>;
export type ZoneSettingsType = z.infer<typeof ZoneSettings>;
export type MigrationStatusType = z.infer<typeof MigrationStatus>;
export type DomainMigrationType = z.infer<typeof DomainMigration>;
export type DnsRecordImportType = z.infer<typeof DnsRecordImport>;