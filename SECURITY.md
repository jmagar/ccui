# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public issue

Security vulnerabilities should not be reported through public GitHub issues, discussions, or pull requests.

### 2. Email us directly

Send a detailed report to: **security@ccui.example.com**

Include the following information:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability and how an attacker might exploit it

### 3. Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Progress Updates**: We will send progress updates every 7 days until resolution
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### 4. Coordinated Disclosure

We follow a coordinated disclosure process:
1. We will work with you to understand and validate the vulnerability
2. We will develop and test a fix
3. We will prepare a security advisory
4. We will release the fix and publish the advisory
5. You will receive credit for the discovery (if desired)

## Security Best Practices

### For Users

#### Environment Security
- **Never commit API keys or secrets to version control**
- Use `.env.local` for local development secrets
- Rotate API keys regularly
- Use environment-specific configurations

#### Authentication
- Use strong, unique passwords for all accounts
- Enable two-factor authentication where possible
- Regularly review and rotate access tokens
- Use dedicated service accounts for production deployments

#### Network Security
- Deploy behind a reverse proxy (nginx, Cloudflare)
- Use HTTPS in production
- Implement proper CORS policies
- Use VPC/private networks for database connections

#### Monitoring
- Enable logging for all authentication events
- Monitor for unusual access patterns
- Set up alerts for failed authentication attempts
- Regularly review access logs

### For Developers

#### Code Security
- **Never hardcode secrets in source code**
- Use proper input validation and sanitization
- Implement rate limiting on API endpoints
- Use parameterized queries to prevent SQL injection
- Validate file uploads and implement size limits

#### Dependencies
- Regularly update dependencies using Dependabot
- Run `npm audit` before releases
- Use lock files (`package-lock.json`) for reproducible builds
- Review dependency licenses and security advisories

#### API Security
- Implement proper authentication and authorization
- Use HTTPS for all API communications
- Validate and sanitize all input data
- Implement request rate limiting
- Use CORS headers appropriately

#### Database Security
- Use connection pooling with proper timeouts
- Implement proper database access controls
- Encrypt sensitive data at rest
- Use read-only connections where possible
- Regular backup and disaster recovery testing

## Security Features

### Encryption
- **API Keys**: Encrypted at rest using AES-256-GCM
- **Session Data**: Encrypted and signed JWT tokens
- **Database**: SSL/TLS connections enforced
- **Transport**: HTTPS/WSS only in production

### Process Isolation
- Each user session runs in isolated subprocess
- Restricted file system access per project
- Resource limits (memory, CPU, timeout)
- Process cleanup on session termination

### Authentication
- Multiple authentication methods supported
- Token-based authentication for API access
- Session management with automatic expiration
- OAuth 2.1 support for MCP servers

### Input Validation
- Zod schemas for all API endpoints
- File upload restrictions and scanning
- Command injection prevention
- XSS protection with Content Security Policy

## Vulnerability Disclosure Examples

### Example 1: API Vulnerability
```
Subject: [SECURITY] SQL Injection in /api/sessions endpoint

Description:
The /api/sessions endpoint is vulnerable to SQL injection through the 
'projectPath' parameter. An attacker can execute arbitrary SQL queries 
by injecting SQL code into this parameter.

Steps to Reproduce:
1. Send POST request to /api/sessions
2. Include malicious SQL in projectPath parameter
3. Observe database error messages revealing schema information

Impact:
- Unauthorized access to database
- Potential data exfiltration
- Database schema disclosure

Proof of Concept:
[Include sanitized example showing the vulnerability]
```

### Example 2: Authentication Bypass
```
Subject: [SECURITY] Authentication Bypass in MCP Integration

Description:
The MCP server authentication can be bypassed by manipulating the 
OAuth callback URL, allowing unauthorized access to connected services.

Steps to Reproduce:
1. Initiate OAuth flow for MCP server
2. Intercept and modify callback URL
3. Access protected MCP resources without proper authentication

Impact:
- Unauthorized access to user's MCP servers
- Potential data access across user boundaries
- Privilege escalation
```

## Security Updates

Security updates will be:
- Released as patch versions (e.g., 0.1.1 → 0.1.2)
- Documented in release notes
- Announced through security advisories
- Applied to supported versions only

## Contact

For security-related questions or concerns:
- **Security Team**: security@ccui.example.com
- **General Contact**: maintainers@ccui.example.com

## Acknowledgments

We appreciate the security research community and will acknowledge security researchers who help improve the security of our project:

<!-- Security Hall of Fame -->
- [Your name here] - Responsible disclosure of [vulnerability type]

---

Thank you for helping keep Claude Code Web UI secure! 🔒