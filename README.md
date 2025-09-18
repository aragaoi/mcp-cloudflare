# MCP Cloudflare DNS Server

A comprehensive Model Context Protocol server implementation for Cloudflare DNS that enables AI agents to manage DNS records and perform complete domain migrations with automatic DNS record detection and replication.

## Features

### Core DNS Management
- 🔍 **List DNS records** - View all or filtered DNS records
- 📝 **Create DNS records** - Add new A, AAAA, CNAME, MX, TXT, and other record types  
- ✏️ **Update DNS records** - Modify existing records
- 🗑️ **Delete DNS records** - Remove unwanted records
- 🔧 **Full Cloudflare API support** - Supports proxying, TTL, priority settings

### Domain Migration & Automation
- 🚀 **Complete Domain Migration** - One-command migration with automatic DNS detection
- 🔍 **Automatic DNS Detection** - Detect existing DNS records from external sources
- 📥 **DNS Record Replication** - Automatically replicate detected records to Cloudflare
- 🌐 **Zone Management** - Create and manage Cloudflare zones
- 📊 **Migration Monitoring** - Track nameserver propagation and validate setup
- 📁 **Zone File Support** - Import/export standard zone files

## Setup

### 1. Get Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Zone:Edit" template or create custom token with:
   - Zone:Read
   - Zone:Edit
4. Copy your API token

### 2. Get Zone ID

1. Go to your domain in Cloudflare Dashboard
2. Copy the Zone ID from the right sidebar

## Usage

### With Smithery (Cloud)

Deploy directly to Smithery for hosted access.

### With npx (Local)

```bash
npx -y @thelord/mcp-cloudflare
```

### Environment Variables

Create a `.env` file:

```env
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ZONE_ID=your-zone-id-here
CLOUDFLARE_EMAIL=your-email@example.com  # Optional
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "npx",
      "args": ["-y", "@thelord/mcp-cloudflare"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-api-token",
        "CLOUDFLARE_ZONE_ID": "your-zone-id"
      }
    }
  }
}
```

## Available Tools

### Core DNS Management
- **`list_dns_records`** - List all DNS records or filter by name/type
- **`get_dns_record`** - Get detailed information about a specific DNS record
- **`create_dns_record`** - Create a new DNS record with specified type, name, and content
- **`update_dns_record`** - Update an existing DNS record by ID
- **`delete_dns_record`** - Delete a DNS record by ID

### Zone Management
- **`create_zone`** - Create a new Cloudflare zone for domain migration
- **`get_zone`** - Get zone information by ID or domain name
- **`list_zones`** - List all zones in the account

### Domain Migration & Automation
- **`migrate_domain_with_detection`** - Complete domain migration with automatic DNS record detection and replication
- **`start_domain_migration`** - Start a complete domain migration workflow
- **`detect_dns_records`** - Automatically detect existing DNS records from external sources
- **`replicate_dns_records`** - Automatically detect and replicate DNS records to Cloudflare

### Import/Export
- **`import_dns_records`** - Import DNS records to a zone for migration
- **`export_dns_records`** - Export DNS records from a zone for migration
- **`import_zone_file`** - Import DNS records from a zone file
- **`export_zone_file`** - Export DNS records as a zone file

### Migration Monitoring
- **`check_nameserver_propagation`** - Check if nameservers have propagated for a domain
- **`validate_zone_setup`** - Validate that a zone is properly configured for migration

## Domain Migration Examples

### Complete Migration with Automatic Detection
```bash
# One-command complete migration
migrate_domain_with_detection --domain example.com --zoneType full
```

This will:
1. Create a new Cloudflare zone for `example.com`
2. Automatically detect all existing DNS records
3. Replicate them to the new zone
4. Provide nameserver information for registrar update
5. Guide you through the remaining steps

### Manual Migration Steps
```bash
# 1. Create zone
create_zone --name example.com --type full

# 2. Detect existing records
detect_dns_records --domain example.com

# 3. Replicate records
replicate_dns_records --sourceDomain example.com --targetZoneId zone-id

# 4. Check propagation
check_nameserver_propagation --domain example.com --nameservers ["ns1.cloudflare.com", "ns2.cloudflare.com"]

# 5. Validate setup
validate_zone_setup --zoneId zone-id
```

## Supported DNS Record Types

- A (IPv4 address)
- AAAA (IPv6 address)  
- CNAME (Canonical name)
- MX (Mail exchange)
- TXT (Text)
- NS (Name server)
- SRV (Service)
- CAA (Certificate Authority Authorization)
- PTR (Pointer)

## Migration Features

### Automatic DNS Detection
- Detects records from Google's public DNS resolver
- Supports all common record types
- Automatically detects subdomains (www, mail, ftp, blog, shop, api, admin)
- Preserves TTL and priority settings
- Handles MX record priorities correctly

### Zone File Support
- Import from standard zone files
- Export to standard zone file format
- Compatible with most DNS providers
- Supports all standard DNS record formats

### Migration Monitoring
- Real-time nameserver propagation checking
- Zone validation and health checks
- Comprehensive error reporting
- Step-by-step migration guidance

## Security

- API tokens are never logged or exposed
- Uses official Cloudflare API with secure authentication
- Supports scoped API tokens for minimal permissions
- Secure DNS record detection using public resolvers

## License

MIT
