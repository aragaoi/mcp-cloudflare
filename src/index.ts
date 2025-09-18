import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CloudflareApi } from "./api.js";
import { DnsRecordType } from "./types.js";

// Configuration schema for Smithery
export const configSchema = z.object({
  cloudflareApiToken: z.string().describe("Your Cloudflare API Token with Zone:Edit permissions"),
  cloudflareZoneId: z.string().describe("The Zone ID of your domain in Cloudflare"),
  cloudflareEmail: z.string().optional().describe("Your Cloudflare account email (only needed for legacy API keys)")
});

// Export default function for Smithery
export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  const server = new Server(
    {
      name: "mcp-cloudflare",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Helper function to configure API only when needed
  const configureApiIfNeeded = () => {
    try {
      if (config?.cloudflareApiToken && config?.cloudflareZoneId) {
        CloudflareApi.configure(config);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error configuring Cloudflare API:', error);
      return false;
    }
  };

  // Register available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_dns_records",
          description: "List all DNS records for the configured zone",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Filter by record name (optional)",
              },
              type: {
                type: "string",
                enum: [
                  "A",
                  "AAAA",
                  "CNAME",
                  "MX",
                  "TXT",
                  "NS",
                  "SRV",
                  "CAA",
                  "PTR",
                ],
                description: "Filter by record type (optional)",
              },
            },
          },
        },
        {
          name: "get_dns_record",
          description: "Get a specific DNS record by ID",
          inputSchema: {
            type: "object",
            properties: {
              recordId: {
                type: "string",
                description: "The DNS record ID",
              },
            },
            required: ["recordId"],
          },
        },
        {
          name: "create_dns_record",
          description: "Create a new DNS record",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "A",
                  "AAAA",
                  "CNAME",
                  "MX",
                  "TXT",
                  "NS",
                  "SRV",
                  "CAA",
                  "PTR",
                ],
                description: "DNS record type",
              },
              name: {
                type: "string",
                description: "DNS record name",
              },
              content: {
                type: "string",
                description: "DNS record content",
              },
              ttl: {
                type: "number",
                description:
                  "Time to live (TTL) in seconds (default: 1 for auto)",
                minimum: 1,
              },
              priority: {
                type: "number",
                description: "Priority (for MX records)",
              },
              proxied: {
                type: "boolean",
                description:
                  "Whether the record should be proxied through Cloudflare",
              },
            },
            required: ["type", "name", "content"],
          },
        },
        {
          name: "update_dns_record",
          description: "Update an existing DNS record",
          inputSchema: {
            type: "object",
            properties: {
              recordId: {
                type: "string",
                description: "The DNS record ID to update",
              },
              type: {
                type: "string",
                enum: [
                  "A",
                  "AAAA",
                  "CNAME",
                  "MX",
                  "TXT",
                  "NS",
                  "SRV",
                  "CAA",
                  "PTR",
                ],
                description: "DNS record type",
              },
              name: {
                type: "string",
                description: "DNS record name",
              },
              content: {
                type: "string",
                description: "DNS record content",
              },
              ttl: {
                type: "number",
                description: "Time to live (TTL) in seconds",
                minimum: 1,
              },
              priority: {
                type: "number",
                description: "Priority (for MX records)",
              },
              proxied: {
                type: "boolean",
                description:
                  "Whether the record should be proxied through Cloudflare",
              },
            },
            required: ["recordId"],
          },
        },
        {
          name: "delete_dns_record",
          description: "Delete a DNS record",
          inputSchema: {
            type: "object",
            properties: {
              recordId: {
                type: "string",
                description: "The DNS record ID to delete",
              },
            },
            required: ["recordId"],
          },
        },
        {
          name: "create_zone",
          description: "Create a new Cloudflare zone for domain migration",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Domain name for the zone",
              },
              type: {
                type: "string",
                enum: ["full", "partial"],
                description: "Zone type (full or partial)",
                default: "full",
              },
              jump_start: {
                type: "boolean",
                description: "Whether to use jump start for faster setup",
                default: false,
              },
            },
            required: ["name"],
          },
        },
        {
          name: "get_zone",
          description: "Get zone information by ID or domain name",
          inputSchema: {
            type: "object",
            properties: {
              zoneId: {
                type: "string",
                description:
                  "Zone ID (optional, uses configured zone if not provided)",
              },
              domain: {
                type: "string",
                description: "Domain name to search for (optional)",
              },
            },
          },
        },
        {
          name: "list_zones",
          description: "List all zones in the account",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Filter zones by name (optional)",
              },
            },
          },
        },
        {
          name: "export_dns_records",
          description: "Export DNS records from a zone for migration",
          inputSchema: {
            type: "object",
            properties: {
              zoneId: {
                type: "string",
                description:
                  "Zone ID to export from (optional, uses configured zone if not provided)",
              },
            },
          },
        },
        {
          name: "import_dns_records",
          description: "Import DNS records to a zone for migration",
          inputSchema: {
            type: "object",
            properties: {
              records: {
                type: "array",
                description: "Array of DNS records to import",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "A",
                        "AAAA",
                        "CNAME",
                        "MX",
                        "TXT",
                        "NS",
                        "SRV",
                        "CAA",
                        "PTR",
                      ],
                    },
                    name: { type: "string" },
                    content: { type: "string" },
                    ttl: { type: "number" },
                    priority: { type: "number" },
                    proxied: { type: "boolean" },
                  },
                  required: ["type", "name", "content"],
                },
              },
              zoneId: {
                type: "string",
                description:
                  "Zone ID to import to (optional, uses configured zone if not provided)",
              },
            },
            required: ["records"],
          },
        },
        {
          name: "check_nameserver_propagation",
          description: "Check if nameservers have propagated for a domain",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Domain to check",
              },
              nameservers: {
                type: "array",
                items: { type: "string" },
                description: "Expected nameservers",
              },
            },
            required: ["domain", "nameservers"],
          },
        },
        {
          name: "validate_zone_setup",
          description:
            "Validate that a zone is properly configured for migration",
          inputSchema: {
            type: "object",
            properties: {
              zoneId: {
                type: "string",
                description:
                  "Zone ID to validate (optional, uses configured zone if not provided)",
              },
            },
          },
        },
        {
          name: "start_domain_migration",
          description: "Start a complete domain migration workflow",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Domain to migrate",
              },
              dnsRecords: {
                type: "array",
                description:
                  "DNS records to migrate (optional, will be detected if not provided)",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "A",
                        "AAAA",
                        "CNAME",
                        "MX",
                        "TXT",
                        "NS",
                        "SRV",
                        "CAA",
                        "PTR",
                      ],
                    },
                    name: { type: "string" },
                    content: { type: "string" },
                    ttl: { type: "number" },
                    priority: { type: "number" },
                    proxied: { type: "boolean" },
                  },
                  required: ["type", "name", "content"],
                },
              },
              zoneType: {
                type: "string",
                enum: ["full", "partial"],
                description: "Zone type for the new zone",
                default: "full",
              },
            },
            required: ["domain"],
          },
        },
        {
          name: "detect_dns_records",
          description:
            "Automatically detect existing DNS records from external sources",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Domain to detect DNS records for",
              },
            },
            required: ["domain"],
          },
        },
        {
          name: "replicate_dns_records",
          description:
            "Automatically detect and replicate DNS records to Cloudflare",
          inputSchema: {
            type: "object",
            properties: {
              sourceDomain: {
                type: "string",
                description: "Source domain to replicate DNS records from",
              },
              targetZoneId: {
                type: "string",
                description:
                  "Target zone ID to replicate to (optional, uses configured zone if not provided)",
              },
            },
            required: ["sourceDomain"],
          },
        },
        {
          name: "import_zone_file",
          description: "Import DNS records from a zone file",
          inputSchema: {
            type: "object",
            properties: {
              zoneFileContent: {
                type: "string",
                description: "Zone file content to import",
              },
              zoneId: {
                type: "string",
                description:
                  "Zone ID to import to (optional, uses configured zone if not provided)",
              },
            },
            required: ["zoneFileContent"],
          },
        },
        {
          name: "export_zone_file",
          description: "Export DNS records as a zone file",
          inputSchema: {
            type: "object",
            properties: {
              zoneId: {
                type: "string",
                description:
                  "Zone ID to export from (optional, uses configured zone if not provided)",
              },
            },
          },
        },
        {
          name: "migrate_domain_with_detection",
          description:
            "Complete domain migration with automatic DNS record detection and replication",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Domain to migrate with automatic detection",
              },
              zoneType: {
                type: "string",
                enum: ["full", "partial"],
                description: "Zone type for the new zone",
                default: "full",
              },
            },
            required: ["domain"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_dns_records") {
      return await handleListDnsRecords(
        args as { name?: string; type?: string }
      );
    }

    if (name === "get_dns_record") {
      return await handleGetDnsRecord(args as { recordId: string });
    }

    if (name === "create_dns_record") {
      return await handleCreateDnsRecord(
        args as {
          type: string;
          name: string;
          content: string;
          ttl?: number;
          priority?: number;
          proxied?: boolean;
        }
      );
    }

    if (name === "update_dns_record") {
      return await handleUpdateDnsRecord(
        args as {
          recordId: string;
          type?: string;
          name?: string;
          content?: string;
          ttl?: number;
          priority?: number;
          proxied?: boolean;
        }
      );
    }

    if (name === "delete_dns_record") {
      return await handleDeleteDnsRecord(args as { recordId: string });
    }

    if (name === "create_zone") {
      return await handleCreateZone(
        args as { name: string; type?: string; jump_start?: boolean }
      );
    }

    if (name === "get_zone") {
      return await handleGetZone(args as { zoneId?: string; domain?: string });
    }

    if (name === "list_zones") {
      return await handleListZones(args as { name?: string });
    }

    if (name === "export_dns_records") {
      return await handleExportDnsRecords(args as { zoneId?: string });
    }

    if (name === "import_dns_records") {
      return await handleImportDnsRecords(
        args as { records: any[]; zoneId?: string }
      );
    }

    if (name === "check_nameserver_propagation") {
      return await handleCheckNameserverPropagation(
        args as { domain: string; nameservers: string[] }
      );
    }

    if (name === "validate_zone_setup") {
      return await handleValidateZoneSetup(args as { zoneId?: string });
    }

    if (name === "start_domain_migration") {
      return await handleStartDomainMigration(
        args as { domain: string; dnsRecords?: any[]; zoneType?: string }
      );
    }

    if (name === "detect_dns_records") {
      return await handleDetectDnsRecords(args as { domain: string });
    }

    if (name === "replicate_dns_records") {
      return await handleReplicateDnsRecords(
        args as { sourceDomain: string; targetZoneId?: string }
      );
    }

    if (name === "import_zone_file") {
      return await handleImportZoneFile(
        args as { zoneFileContent: string; zoneId?: string }
      );
    }

    if (name === "export_zone_file") {
      return await handleExportZoneFile(args as { zoneId?: string });
    }

    if (name === "migrate_domain_with_detection") {
      return await handleMigrateDomainWithDetection(
        args as { domain: string; zoneType?: string }
      );
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Tool handlers
  const handleListDnsRecords = async (args: {
    name?: string;
    type?: string;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token and Zone ID first.",
            },
          ],
        };
      }

      const records = await CloudflareApi.findDnsRecords(args.name, args.type);

      if (records.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No DNS records found matching the criteria.",
            },
          ],
        };
      }

      const recordsText = records
        .map(
          (record) =>
            `🔹 ${record.name} (${record.type}) → ${record.content} [ID: ${
              record.id
            }]${record.proxied ? " 🟠 Proxied" : ""}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `✅ Found ${records.length} DNS record(s):\n\n${recordsText}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error listing DNS records: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleGetDnsRecord = async (args: { recordId: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token and Zone ID first.",
            },
          ],
        };
      }

      const record = await CloudflareApi.getDnsRecord(args.recordId);

      return {
        content: [
          {
            type: "text",
            text: `✅ DNS Record Details:
🔹 Name: ${record.name}
🔹 Type: ${record.type}
🔹 Content: ${record.content}
🔹 TTL: ${record.ttl}
🔹 Proxied: ${record.proxied ? "Yes" : "No"}
${record.priority ? `🔹 Priority: ${record.priority}` : ""}
🔹 ID: ${record.id}
🔹 Created: ${new Date(record.created_on).toLocaleString()}
🔹 Modified: ${new Date(record.modified_on).toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error getting DNS record: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleCreateDnsRecord = async (args: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    priority?: number;
    proxied?: boolean;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token and Zone ID first.",
            },
          ],
        };
      }

      const recordData: any = {
        type: DnsRecordType.parse(args.type),
        name: args.name,
        content: args.content,
      };

      if (args.ttl !== undefined) recordData.ttl = args.ttl;
      if (args.priority !== undefined) recordData.priority = args.priority;
      if (args.proxied !== undefined) recordData.proxied = args.proxied;

      const record = await CloudflareApi.createDnsRecord(recordData);

      return {
        content: [
          {
            type: "text",
            text: `✅ DNS record created successfully!
🔹 Name: ${record.name}
🔹 Type: ${record.type}
🔹 Content: ${record.content}
🔹 ID: ${record.id}
${record.proxied ? "🟠 Proxied through Cloudflare" : ""}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error creating DNS record: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleUpdateDnsRecord = async (args: {
    recordId: string;
    type?: string;
    name?: string;
    content?: string;
    ttl?: number;
    priority?: number;
    proxied?: boolean;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token and Zone ID first.",
            },
          ],
        };
      }

      const updates: any = {};
      if (args.type) updates.type = DnsRecordType.parse(args.type);
      if (args.name) updates.name = args.name;
      if (args.content) updates.content = args.content;
      if (args.ttl !== undefined) updates.ttl = args.ttl;
      if (args.priority !== undefined) updates.priority = args.priority;
      if (args.proxied !== undefined) updates.proxied = args.proxied;

      const record = await CloudflareApi.updateDnsRecord(
        args.recordId,
        updates
      );

      return {
        content: [
          {
            type: "text",
            text: `✅ DNS record updated successfully!
🔹 Name: ${record.name}
🔹 Type: ${record.type}
🔹 Content: ${record.content}
🔹 ID: ${record.id}
${record.proxied ? "🟠 Proxied through Cloudflare" : ""}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error updating DNS record: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleDeleteDnsRecord = async (args: { recordId: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token and Zone ID first.",
            },
          ],
        };
      }

      await CloudflareApi.deleteDnsRecord(args.recordId);

      return {
        content: [
          {
            type: "text",
            text: `✅ DNS record deleted successfully! (ID: ${args.recordId})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error deleting DNS record: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  // Domain migration tool handlers
  const handleCreateZone = async (args: {
    name: string;
    type?: string;
    jump_start?: boolean;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const zone = await CloudflareApi.createZone({
        name: args.name,
        type: (args.type as "full" | "partial") || "full",
        jump_start: args.jump_start || false,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Zone created successfully!
🔹 Domain: ${zone.name}
🔹 Zone ID: ${zone.id}
🔹 Status: ${zone.status}
🔹 Type: ${zone.type}
🔹 Nameservers: ${zone.name_servers.join(", ")}
🔹 Created: ${new Date(zone.created_on).toLocaleString()}

Next steps:
1. Update your domain's nameservers to: ${zone.name_servers.join(", ")}
2. Import your DNS records using the import_dns_records tool
3. Monitor propagation with check_nameserver_propagation tool`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error creating zone: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleGetZone = async (args: { zoneId?: string; domain?: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      let zone;
      if (args.zoneId) {
        zone = await CloudflareApi.getZone(args.zoneId);
      } else if (args.domain) {
        const zones = await CloudflareApi.listZones(args.domain);
        if (zones.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No zone found for domain: ${args.domain}`,
              },
            ],
          };
        }
        zone = zones[0];
      } else {
        zone = await CloudflareApi.getZone();
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ Zone Information:
🔹 Domain: ${zone.name}
🔹 Zone ID: ${zone.id}
🔹 Status: ${zone.status}
🔹 Type: ${zone.type}
🔹 Paused: ${zone.paused ? "Yes" : "No"}
🔹 Development Mode: ${zone.development_mode}
🔹 Nameservers: ${zone.name_servers.join(", ")}
${
  zone.original_name_servers
    ? `🔹 Original Nameservers: ${zone.original_name_servers.join(", ")}`
    : ""
}
🔹 Created: ${new Date(zone.created_on).toLocaleString()}
🔹 Modified: ${new Date(zone.modified_on).toLocaleString()}
${
  zone.activated_on
    ? `🔹 Activated: ${new Date(zone.activated_on).toLocaleString()}`
    : ""
}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error getting zone: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleListZones = async (args: { name?: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const zones = await CloudflareApi.listZones(args.name);

      if (zones.length === 0) {
        return {
          content: [
            { type: "text", text: "No zones found matching the criteria." },
          ],
        };
      }

      const zonesText = zones
        .map(
          (zone) =>
            `🔹 ${zone.name} (${zone.status}) - ID: ${zone.id} - Type: ${zone.type}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `✅ Found ${zones.length} zone(s):\n\n${zonesText}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error listing zones: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleExportDnsRecords = async (args: { zoneId?: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const records = await CloudflareApi.exportDnsRecords(args.zoneId);

      if (records.length === 0) {
        return {
          content: [{ type: "text", text: "No DNS records found to export." }],
        };
      }

      const recordsText = records
        .map(
          (record) =>
            `${record.name} ${record.type} ${record.content}${
              record.ttl ? ` TTL:${record.ttl}` : ""
            }${record.priority ? ` PRI:${record.priority}` : ""}${
              record.proxied ? " PROXIED" : ""
            }`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `✅ Exported ${records.length} DNS record(s):\n\n${recordsText}\n\nYou can use this data with the import_dns_records tool.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error exporting DNS records: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleImportDnsRecords = async (args: {
    records: any[];
    zoneId?: string;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const createdRecords = await CloudflareApi.importDnsRecords(
        args.records,
        args.zoneId
      );

      return {
        content: [
          {
            type: "text",
            text: `✅ Successfully imported ${
              createdRecords.length
            } DNS record(s)!
${createdRecords
  .map((record) => `🔹 ${record.name} (${record.type}) → ${record.content}`)
  .join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error importing DNS records: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleCheckNameserverPropagation = async (args: {
    domain: string;
    nameservers: string[];
  }) => {
    try {
      const propagated = await CloudflareApi.checkNameserverPropagation(
        args.domain,
        args.nameservers
      );

      return {
        content: [
          {
            type: "text",
            text: `🔍 Nameserver Propagation Check for ${args.domain}:
${
  propagated
    ? "✅ Nameservers have propagated successfully!"
    : "⏳ Nameservers are still propagating..."
}

Expected nameservers: ${args.nameservers.join(", ")}

${
  propagated
    ? "Your domain is ready to use with Cloudflare!"
    : "Please wait a few more minutes and check again. Propagation can take up to 24-48 hours."
}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error checking nameserver propagation: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleValidateZoneSetup = async (args: { zoneId?: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const targetZoneId = args.zoneId || config?.cloudflareZoneId;
      if (!targetZoneId) {
        return {
          content: [
            {
              type: "text",
              text: "❌ No zone ID provided and none configured.",
            },
          ],
        };
      }

      const validation = await CloudflareApi.validateZoneSetup(targetZoneId);

      return {
        content: [
          {
            type: "text",
            text: `🔍 Zone Validation Results:
${
  validation.valid
    ? "✅ Zone is properly configured!"
    : "❌ Zone has configuration issues:"
}

${
  validation.issues.length > 0
    ? validation.issues.map((issue) => `• ${issue}`).join("\n")
    : "All checks passed!"
}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error validating zone setup: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleStartDomainMigration = async (args: {
    domain: string;
    dnsRecords?: any[];
    zoneType?: string;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      // Step 1: Create zone
      const zone = await CloudflareApi.createZone({
        name: args.domain,
        type: (args.zoneType as "full" | "partial") || "full",
        jump_start: false,
      });

      let migrationSteps = `✅ Step 1: Zone created successfully!
🔹 Domain: ${zone.name}
🔹 Zone ID: ${zone.id}
🔹 Nameservers: ${zone.name_servers.join(", ")}

📋 Next Steps for Complete Migration:
1. Update your domain's nameservers at your registrar to:
   ${zone.name_servers.join("\n   ")}

2. Import your DNS records (if provided):`;

      // Step 2: Import DNS records if provided
      if (args.dnsRecords && args.dnsRecords.length > 0) {
        try {
          const createdRecords = await CloudflareApi.importDnsRecords(
            args.dnsRecords,
            zone.id
          );
          migrationSteps += `\n✅ Step 2: DNS records imported successfully! (${createdRecords.length} records)`;
        } catch (error) {
          migrationSteps += `\n⚠️ Step 2: DNS records import failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
        }
      } else {
        migrationSteps += `\n⏭️ Step 2: No DNS records provided. Use import_dns_records tool to add them.`;
      }

      migrationSteps += `\n\n3. Monitor nameserver propagation:
   Use check_nameserver_propagation tool with domain: ${args.domain}
   Expected nameservers: ${zone.name_servers.join(", ")}

4. Validate setup:
   Use validate_zone_setup tool with zone ID: ${zone.id}

🎉 Migration setup complete! Your domain will be fully migrated once nameservers propagate.`;

      return {
        content: [
          {
            type: "text",
            text: migrationSteps,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error starting domain migration: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  // DNS replication tool handlers
  const handleDetectDnsRecords = async (args: { domain: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const detectedRecords = await CloudflareApi.detectDnsRecords(args.domain);

      if (detectedRecords.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No DNS records detected for ${args.domain}. The domain might not have any DNS records or they might not be publicly accessible.`,
            },
          ],
        };
      }

      const recordsText = detectedRecords
        .map(
          (record) =>
            `🔹 ${record.name} ${record.type} ${record.content}${
              record.ttl ? ` TTL:${record.ttl}` : ""
            }${record.priority ? ` PRI:${record.priority}` : ""}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `✅ Detected ${detectedRecords.length} DNS record(s) for ${args.domain}:\n\n${recordsText}\n\nYou can use these records with the replicate_dns_records tool to automatically import them to Cloudflare.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error detecting DNS records: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleReplicateDnsRecords = async (args: {
    sourceDomain: string;
    targetZoneId?: string;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const replication = await CloudflareApi.replicateDnsRecords(
        args.sourceDomain,
        args.targetZoneId
      );

      let resultText = `✅ DNS Record Replication Complete!\n\n`;
      resultText += `🔍 Detected ${replication.detected.length} record(s) from ${args.sourceDomain}\n`;
      resultText += `📥 Successfully replicated ${replication.replicated.length} record(s)\n\n`;

      if (replication.detected.length > 0) {
        resultText += `📋 Detected Records:\n`;
        resultText += replication.detected
          .map(
            (record) => `  • ${record.name} ${record.type} → ${record.content}`
          )
          .join("\n");
        resultText += "\n\n";
      }

      if (replication.replicated.length > 0) {
        resultText += `✅ Replicated Records:\n`;
        resultText += replication.replicated
          .map(
            (record) =>
              `  • ${record.name} ${record.type} → ${record.content} [ID: ${record.id}]`
          )
          .join("\n");
        resultText += "\n\n";
      }

      if (replication.errors.length > 0) {
        resultText += `⚠️ Errors encountered:\n`;
        resultText += replication.errors
          .map((error) => `  • ${error}`)
          .join("\n");
      }

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error replicating DNS records: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleImportZoneFile = async (args: {
    zoneFileContent: string;
    zoneId?: string;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const importResult = await CloudflareApi.importZoneFile(
        args.zoneFileContent,
        args.zoneId
      );

      let resultText = `✅ Zone File Import Complete!\n\n`;
      resultText += `📥 Successfully imported ${importResult.imported.length} record(s)\n\n`;

      if (importResult.imported.length > 0) {
        resultText += `✅ Imported Records:\n`;
        resultText += importResult.imported
          .map(
            (record) =>
              `  • ${record.name} ${record.type} → ${record.content} [ID: ${record.id}]`
          )
          .join("\n");
        resultText += "\n\n";
      }

      if (importResult.errors.length > 0) {
        resultText += `⚠️ Errors encountered:\n`;
        resultText += importResult.errors
          .map((error) => `  • ${error}`)
          .join("\n");
      }

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error importing zone file: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleExportZoneFile = async (args: { zoneId?: string }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const zoneFile = await CloudflareApi.exportZoneFile(args.zoneId);

      return {
        content: [
          {
            type: "text",
            text: `✅ Zone File Export Complete!\n\n\`\`\`\n${zoneFile}\n\`\`\`\n\nYou can save this zone file and use it with other DNS providers or import it using the import_zone_file tool.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error exporting zone file: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  const handleMigrateDomainWithDetection = async (args: {
    domain: string;
    zoneType?: string;
  }) => {
    try {
      if (!configureApiIfNeeded()) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Configuration incomplete. Please configure Cloudflare API Token first.",
            },
          ],
        };
      }

      const migration = await CloudflareApi.migrateDomainWithDetection(
        args.domain,
        args.zoneType
      );

      let resultText = `🎉 Complete Domain Migration with Automatic Detection!\n\n`;
      resultText += `✅ Step 1: Zone created successfully!\n`;
      resultText += `🔹 Domain: ${migration.zone.name}\n`;
      resultText += `🔹 Zone ID: ${migration.zone.id}\n`;
      resultText += `🔹 Status: ${migration.zone.status}\n`;
      resultText += `🔹 Nameservers: ${migration.zone.name_servers.join(
        ", "
      )}\n\n`;

      resultText += `🔍 Step 2: DNS Record Detection & Replication\n`;
      resultText += `📊 Detected ${migration.detected.length} existing DNS record(s)\n`;
      resultText += `📥 Successfully replicated ${migration.replicated.length} record(s)\n\n`;

      if (migration.detected.length > 0) {
        resultText += `📋 Detected Records:\n`;
        resultText += migration.detected
          .map(
            (record) => `  • ${record.name} ${record.type} → ${record.content}`
          )
          .join("\n");
        resultText += "\n\n";
      }

      if (migration.replicated.length > 0) {
        resultText += `✅ Replicated Records:\n`;
        resultText += migration.replicated
          .map(
            (record) =>
              `  • ${record.name} ${record.type} → ${record.content} [ID: ${record.id}]`
          )
          .join("\n");
        resultText += "\n\n";
      }

      resultText += `📋 Next Steps:\n`;
      resultText += migration.nextSteps.map((step) => `  ${step}`).join("\n");

      if (migration.errors.length > 0) {
        resultText += `\n\n⚠️ Issues to address:\n`;
        resultText += migration.errors
          .map((error) => `  • ${error}`)
          .join("\n");
      }

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error in domain migration with detection: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  };

  return server;
}