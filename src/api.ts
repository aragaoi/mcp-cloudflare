import { z } from "zod";
import {
  CloudflareApiResponse,
  CloudflareDnsRecord,
  CreateDnsRecordRequest,
  UpdateDnsRecordRequest,
  CloudflareZone,
  CreateZoneRequest,
  ZoneSettings,
  DnsRecordImport,
  type DnsRecord,
  type CreateDnsRecord,
  type UpdateDnsRecord,
  type Zone,
  type CreateZone,
  type ZoneSettingsType,
  type DnsRecordImportType,
} from "./types.js";

// Configuration for Cloudflare API
let cloudflareConfig: {
  apiToken: string;
  zoneId: string;
  email?: string;
} = {
  apiToken: "",
  zoneId: "",
  email: "",
};

// Configure API with parameters from Smithery
const configure = (config: {
  cloudflareApiToken: string;
  cloudflareZoneId: string;
  cloudflareEmail?: string;
}) => {
  cloudflareConfig.apiToken = config.cloudflareApiToken;
  cloudflareConfig.zoneId = config.cloudflareZoneId;
  cloudflareConfig.email = config.cloudflareEmail;
};

// Fallback for local development with environment variables
const parseEnv = () => {
  const parsed = z
    .object({
      CLOUDFLARE_API_TOKEN: z.string().optional(),
      CLOUDFLARE_ZONE_ID: z.string().optional(),
      CLOUDFLARE_EMAIL: z.string().optional(),
    })
    .safeParse(process.env);

  if (
    parsed.success &&
    parsed.data.CLOUDFLARE_API_TOKEN &&
    parsed.data.CLOUDFLARE_ZONE_ID
  ) {
    cloudflareConfig.apiToken = parsed.data.CLOUDFLARE_API_TOKEN;
    cloudflareConfig.zoneId = parsed.data.CLOUDFLARE_ZONE_ID;
    cloudflareConfig.email = parsed.data.CLOUDFLARE_EMAIL;
  }
};

// Initialize with environment variables if available
parseEnv();

const getHeaders = () => {
  if (!cloudflareConfig.apiToken) {
    throw new Error("Cloudflare API Token not configured");
  }

  return {
    Authorization: `Bearer ${cloudflareConfig.apiToken}`,
    "Content-Type": "application/json",
  };
};

const api = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>,
  useZoneId: boolean = true
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    let url: string;
    if (useZoneId) {
      if (!cloudflareConfig.zoneId) {
        throw new Error("Cloudflare Zone ID not configured");
      }
      url = `https://api.cloudflare.com/client/v4/zones/${cloudflareConfig.zoneId}/${endpoint}`;
    } else {
      url = `https://api.cloudflare.com/client/v4/${endpoint}`;
    }

    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Cloudflare API error: ${response.status} ${response.statusText}`
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Cloudflare API request timed out");
      }
      throw new Error(`Cloudflare API error: ${error.message}`);
    }
    throw error;
  }
};

export const CloudflareApi = {
  configure,

  // List all DNS records
  listDnsRecords: async (): Promise<DnsRecord[]> => {
    const response = await api("dns_records");
    const rawData = await response.json();

    try {
      const data = CloudflareApiResponse.parse(rawData);

      if (!data.success) {
        throw new Error(
          `API Error: ${data.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (!data.result) {
        return [];
      }

      // Handle both array and single object results
      const records = Array.isArray(data.result) ? data.result : [data.result];
      return records.filter((record) => record !== null);
    } catch (parseError) {
      console.error("API Response parsing failed:", parseError);
      console.error("Raw API Response:", JSON.stringify(rawData, null, 2));
      throw new Error(
        `Failed to parse API response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }
  },

  // Get a specific DNS record by ID
  getDnsRecord: async (recordId: string): Promise<DnsRecord> => {
    const response = await api(`dns_records/${recordId}`);
    const data = CloudflareApiResponse.parse(await response.json());

    if (!data.success) {
      throw new Error(
        `API Error: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!data.result || Array.isArray(data.result)) {
      throw new Error("DNS record not found");
    }

    return data.result;
  },

  // Create a new DNS record
  createDnsRecord: async (record: CreateDnsRecord): Promise<DnsRecord> => {
    const validatedRecord = CreateDnsRecordRequest.parse(record);
    const response = await api("dns_records", "POST", validatedRecord);
    const data = CloudflareApiResponse.parse(await response.json());

    if (!data.success) {
      throw new Error(
        `API Error: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!data.result || Array.isArray(data.result)) {
      throw new Error("Failed to create DNS record");
    }

    return data.result;
  },

  // Update an existing DNS record
  updateDnsRecord: async (
    recordId: string,
    updates: UpdateDnsRecord
  ): Promise<DnsRecord> => {
    const validatedUpdates = UpdateDnsRecordRequest.parse(updates);
    const response = await api(
      `dns_records/${recordId}`,
      "PATCH",
      validatedUpdates
    );
    const data = CloudflareApiResponse.parse(await response.json());

    if (!data.success) {
      throw new Error(
        `API Error: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!data.result || Array.isArray(data.result)) {
      throw new Error("Failed to update DNS record");
    }

    return data.result;
  },

  // Delete a DNS record
  deleteDnsRecord: async (recordId: string): Promise<void> => {
    const response = await api(`dns_records/${recordId}`, "DELETE");
    const data = CloudflareApiResponse.parse(await response.json());

    if (!data.success) {
      throw new Error(
        `API Error: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }
  },

  // Find DNS records by name and/or type
  findDnsRecords: async (
    name?: string,
    type?: string
  ): Promise<DnsRecord[]> => {
    let endpoint = "dns_records";
    const params = new URLSearchParams();

    if (name) params.append("name", name);
    if (type) params.append("type", type);

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await api(endpoint);
    const rawData = await response.json();

    try {
      const data = CloudflareApiResponse.parse(rawData);

      if (!data.success) {
        throw new Error(
          `API Error: ${data.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (!data.result) {
        return [];
      }

      // Handle both array and single object results
      const records = Array.isArray(data.result) ? data.result : [data.result];
      return records.filter((record) => record !== null);
    } catch (parseError) {
      console.error("API Response parsing failed:", parseError);
      console.error("Raw API Response:", JSON.stringify(rawData, null, 2));
      throw new Error(
        `Failed to parse API response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }
  },

  // Zone management methods
  createZone: async (zoneData: CreateZone): Promise<Zone> => {
    const validatedZone = CreateZoneRequest.parse(zoneData);
    const response = await api("zones", "POST", validatedZone, false);
    const rawData = await response.json();

    try {
      const data = CloudflareApiResponse.parse(rawData);

      if (!data.success) {
        throw new Error(
          `API Error: ${data.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (!data.result || Array.isArray(data.result)) {
        throw new Error("Failed to create zone");
      }

      return CloudflareZone.parse(data.result);
    } catch (parseError) {
      console.error("Zone creation response parsing failed:", parseError);
      console.error("Raw API Response:", JSON.stringify(rawData, null, 2));
      throw new Error(
        `Failed to parse zone creation response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }
  },

  getZone: async (zoneId?: string): Promise<Zone> => {
    const targetZoneId = zoneId || cloudflareConfig.zoneId;
    if (!targetZoneId) {
      throw new Error("Zone ID not provided and not configured");
    }

    const response = await api(
      `zones/${targetZoneId}`,
      "GET",
      undefined,
      false
    );
    const rawData = await response.json();

    try {
      const data = CloudflareApiResponse.parse(rawData);

      if (!data.success) {
        throw new Error(
          `API Error: ${data.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (!data.result || Array.isArray(data.result)) {
        throw new Error("Zone not found");
      }

      return CloudflareZone.parse(data.result);
    } catch (parseError) {
      console.error("Zone response parsing failed:", parseError);
      console.error("Raw API Response:", JSON.stringify(rawData, null, 2));
      throw new Error(
        `Failed to parse zone response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }
  },

  listZones: async (name?: string): Promise<Zone[]> => {
    let endpoint = "zones";
    if (name) {
      endpoint += `?name=${encodeURIComponent(name)}`;
    }

    const response = await api(endpoint, "GET", undefined, false);
    const rawData = await response.json();

    try {
      const data = CloudflareApiResponse.parse(rawData);

      if (!data.success) {
        throw new Error(
          `API Error: ${data.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (!data.result) {
        return [];
      }

      const zones = Array.isArray(data.result) ? data.result : [data.result];
      return zones
        .filter((zone) => zone !== null)
        .map((zone) => CloudflareZone.parse(zone));
    } catch (parseError) {
      console.error("Zones list response parsing failed:", parseError);
      console.error("Raw API Response:", JSON.stringify(rawData, null, 2));
      throw new Error(
        `Failed to parse zones list response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }
  },

  updateZoneSettings: async (
    settings: ZoneSettingsType,
    zoneId?: string
  ): Promise<ZoneSettingsType> => {
    const targetZoneId = zoneId || cloudflareConfig.zoneId;
    if (!targetZoneId) {
      throw new Error("Zone ID not provided and not configured");
    }

    const validatedSettings = ZoneSettings.parse(settings);
    const response = await api(
      `zones/${targetZoneId}/settings`,
      "PATCH",
      validatedSettings,
      false
    );
    const rawData = await response.json();

    try {
      const data = CloudflareApiResponse.parse(rawData);

      if (!data.success) {
        throw new Error(
          `API Error: ${data.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (!data.result || Array.isArray(data.result)) {
        throw new Error("Failed to update zone settings");
      }

      return ZoneSettings.parse(data.result);
    } catch (parseError) {
      console.error("Zone settings response parsing failed:", parseError);
      console.error("Raw API Response:", JSON.stringify(rawData, null, 2));
      throw new Error(
        `Failed to parse zone settings response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }
  },

  // DNS record import/export for migration
  importDnsRecords: async (
    records: DnsRecordImportType[],
    zoneId?: string
  ): Promise<DnsRecord[]> => {
    const targetZoneId = zoneId || cloudflareConfig.zoneId;
    if (!targetZoneId) {
      throw new Error("Zone ID not provided and not configured");
    }

    const validatedRecords = records.map((record) =>
      DnsRecordImport.parse(record)
    );
    const createdRecords: DnsRecord[] = [];

    for (const record of validatedRecords) {
      try {
        const createRecordData = {
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl || 1,
          priority: record.priority,
          proxied: record.proxied,
        };
        const createdRecord = await CloudflareApi.createDnsRecord(
          createRecordData
        );
        createdRecords.push(createdRecord);
      } catch (error) {
        console.warn(
          `Failed to import record ${record.name}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return createdRecords;
  },

  exportDnsRecords: async (zoneId?: string): Promise<DnsRecordImportType[]> => {
    const targetZoneId = zoneId || cloudflareConfig.zoneId;
    if (!targetZoneId) {
      throw new Error("Zone ID not provided and not configured");
    }

    const records = await CloudflareApi.listDnsRecords();

    return records.map((record) => ({
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl,
      priority: record.priority,
      proxied: record.proxied,
    }));
  },

  // Migration helper methods
  checkNameserverPropagation: async (
    domain: string,
    expectedNameservers: string[]
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=NS`
      );
      const data = await response.json();

      if (data.Status !== 0 || !data.Answer) {
        return false;
      }

      const currentNameservers = data.Answer.filter(
        (record: any) => record.type === 2
      ).map((record: any) => record.data.toLowerCase());

      return expectedNameservers.every((ns) =>
        currentNameservers.includes(ns.toLowerCase())
      );
    } catch (error) {
      console.warn("Failed to check nameserver propagation:", error);
      return false;
    }
  },

  validateZoneSetup: async (
    zoneId: string
  ): Promise<{ valid: boolean; issues: string[] }> => {
    const issues: string[] = [];

    try {
      const zone = await CloudflareApi.getZone(zoneId);

      if (zone.status !== "active") {
        issues.push(`Zone status is ${zone.status}, should be active`);
      }

      if (!zone.name_servers || zone.name_servers.length === 0) {
        issues.push("No nameservers found for zone");
      }

      const dnsRecords = await CloudflareApi.listDnsRecords();
      if (dnsRecords.length === 0) {
        issues.push("No DNS records found in zone");
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(
        `Failed to validate zone: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return { valid: false, issues };
    }
  },

  // DNS record detection and replication methods
  detectDnsRecords: async (domain: string): Promise<DnsRecordImportType[]> => {
    const detectedRecords: DnsRecordImportType[] = [];

    try {
      // Common DNS record types to check
      const recordTypes = [
        "A",
        "AAAA",
        "CNAME",
        "MX",
        "TXT",
        "NS",
        "SRV",
        "CAA",
      ];

      for (const recordType of recordTypes) {
        try {
          const response = await fetch(
            `https://dns.google/resolve?name=${domain}&type=${recordType}`
          );
          const data = await response.json();

          if (data.Status === 0 && data.Answer) {
            for (const answer of data.Answer) {
              if (answer.type === getDnsTypeNumber(recordType)) {
                detectedRecords.push({
                  type: recordType as any,
                  name: domain,
                  content: answer.data,
                  ttl: answer.TTL || 300,
                  priority: answer.data.includes(" ")
                    ? parseInt(answer.data.split(" ")[0])
                    : undefined,
                  proxied: false, // Default to not proxied for detected records
                });
              }
            }
          }
        } catch (error) {
          console.warn(
            `Failed to detect ${recordType} records for ${domain}:`,
            error
          );
        }
      }

      // Also check for subdomains (www, mail, etc.)
      const commonSubdomains = [
        "www",
        "mail",
        "ftp",
        "blog",
        "shop",
        "api",
        "admin",
      ];
      for (const subdomain of commonSubdomains) {
        const subdomainName = `${subdomain}.${domain}`;
        try {
          const response = await fetch(
            `https://dns.google/resolve?name=${subdomainName}&type=A`
          );
          const data = await response.json();

          if (data.Status === 0 && data.Answer) {
            for (const answer of data.Answer) {
              if (answer.type === 1) {
                // A record
                detectedRecords.push({
                  type: "A",
                  name: subdomainName,
                  content: answer.data,
                  ttl: answer.TTL || 300,
                  proxied: false,
                });
              }
            }
          }
        } catch (error) {
          // Silently continue if subdomain doesn't exist
        }
      }

      return detectedRecords;
    } catch (error) {
      console.error("Failed to detect DNS records:", error);
      throw new Error(
        `Failed to detect DNS records: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  replicateDnsRecords: async (
    sourceDomain: string,
    targetZoneId?: string
  ): Promise<{
    detected: DnsRecordImportType[];
    replicated: DnsRecord[];
    errors: string[];
  }> => {
    const errors: string[] = [];

    try {
      // Detect existing DNS records
      const detectedRecords = await CloudflareApi.detectDnsRecords(
        sourceDomain
      );

      if (detectedRecords.length === 0) {
        return {
          detected: [],
          replicated: [],
          errors: ["No DNS records detected for the domain"],
        };
      }

      // Replicate the detected records
      const replicatedRecords = await CloudflareApi.importDnsRecords(
        detectedRecords,
        targetZoneId
      );

      return {
        detected: detectedRecords,
        replicated: replicatedRecords,
        errors,
      };
    } catch (error) {
      errors.push(
        `Failed to replicate DNS records: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return {
        detected: [],
        replicated: [],
        errors,
      };
    }
  },

  importZoneFile: async (
    zoneFileContent: string,
    zoneId?: string
  ): Promise<{ imported: DnsRecord[]; errors: string[] }> => {
    const errors: string[] = [];
    const importedRecords: DnsRecord[] = [];

    try {
      const records = parseZoneFile(zoneFileContent);

      for (const record of records) {
        try {
          const createdRecord = await CloudflareApi.createDnsRecord(record);
          importedRecords.push(createdRecord);
        } catch (error) {
          errors.push(
            `Failed to import record ${record.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      return { imported: importedRecords, errors };
    } catch (error) {
      errors.push(
        `Failed to parse zone file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return { imported: [], errors };
    }
  },

  exportZoneFile: async (zoneId?: string): Promise<string> => {
    const targetZoneId = zoneId || cloudflareConfig.zoneId;
    if (!targetZoneId) {
      throw new Error("Zone ID not provided and not configured");
    }

    const records = await CloudflareApi.listDnsRecords();
    const zone = await CloudflareApi.getZone(targetZoneId);

    let zoneFile = `$ORIGIN ${zone.name}.\n$TTL 300\n\n`;

    for (const record of records) {
      const name =
        record.name === zone.name
          ? "@"
          : record.name.replace(`.${zone.name}`, "");
      const ttl = record.ttl || 300;
      const priority = record.priority ? `${record.priority} ` : "";
      const content = record.content;

      zoneFile += `${name}\t${ttl}\tIN\t${record.type}\t${priority}${content}\n`;
    }

    return zoneFile;
  },

  // Enhanced migration with automatic detection
  migrateDomainWithDetection: async (
    domain: string,
    zoneType?: string
  ): Promise<{
    zone: Zone;
    detected: DnsRecordImportType[];
    replicated: DnsRecord[];
    errors: string[];
    nextSteps: string[];
  }> => {
    const errors: string[] = [];
    const nextSteps: string[] = [];

    try {
      // Step 1: Create zone
      const zone = await CloudflareApi.createZone({
        name: domain,
        type: (zoneType as "full" | "partial") || "full",
        jump_start: false,
      });

      // Step 2: Detect and replicate existing DNS records
      const replication = await CloudflareApi.replicateDnsRecords(
        domain,
        zone.id
      );

      nextSteps.push(
        `1. Update your domain's nameservers at your registrar to: ${zone.name_servers.join(
          ", "
        )}`,
        `2. Monitor nameserver propagation using check_nameserver_propagation tool`,
        `3. Validate setup using validate_zone_setup tool with zone ID: ${zone.id}`
      );

      if (replication.errors.length > 0) {
        errors.push(...replication.errors);
        nextSteps.push(
          `4. Review and fix any DNS record import errors: ${replication.errors.join(
            ", "
          )}`
        );
      }

      return {
        zone,
        detected: replication.detected,
        replicated: replication.replicated,
        errors,
        nextSteps,
      };
    } catch (error) {
      errors.push(
        `Migration failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return {
        zone: {} as Zone,
        detected: [],
        replicated: [],
        errors,
        nextSteps: ["Fix the errors and retry the migration"],
      };
    }
  },
};

// Helper function to convert DNS record type to number
function getDnsTypeNumber(type: string): number {
  const typeMap: { [key: string]: number } = {
    A: 1,
    AAAA: 28,
    CNAME: 5,
    MX: 15,
    TXT: 16,
    NS: 2,
    SRV: 33,
    CAA: 257,
  };
  return typeMap[type] || 1;
}

// Helper function to parse zone file content
function parseZoneFile(content: string): CreateDnsRecord[] {
  const records: CreateDnsRecord[] = [];
  const lines = content.split("\n");

  let defaultTtl = 300;
  let origin = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (trimmedLine.startsWith(";") || trimmedLine === "") {
      continue;
    }

    // Parse directives
    if (trimmedLine.startsWith("$TTL")) {
      defaultTtl = parseInt(trimmedLine.split(/\s+/)[1]) || 300;
      continue;
    }

    if (trimmedLine.startsWith("$ORIGIN")) {
      origin = trimmedLine.split(/\s+/)[1].replace(/\.$/, "");
      continue;
    }

    // Parse DNS records
    const parts = trimmedLine.split(/\s+/);
    if (parts.length >= 4) {
      const name = parts[0] === "@" ? origin : parts[0];
      const ttl = parseInt(parts[1]) || defaultTtl;
      const recordType = parts[3];
      const content = parts.slice(4).join(" ");

      if (
        ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"].includes(
          recordType
        )
      ) {
        const record: CreateDnsRecord = {
          type: recordType as any,
          name: name.endsWith(".") ? name.slice(0, -1) : name,
          content: content,
          ttl: ttl,
          proxied: false,
        };

        // Add priority for MX records
        if (recordType === "MX" && parts.length >= 5) {
          record.priority = parseInt(parts[4]);
        }

        records.push(record);
      }
    }
  }

  return records;
}