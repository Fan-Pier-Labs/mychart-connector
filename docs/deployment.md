# Deployment & Infrastructure

## AWS Account

- **Account**: fanpierlabs (`aws --profile fanpierlabs`)
- **Region**: `us-east-2`

## Web App

Next.js app deployed to AWS Fargate via `bun run deploy_scraper_demo`.

- Uses the `deploy` package (dev dependency) which builds a Docker image, pushes to ECR, and deploys to ECS Fargate
- Config: `web/deploy.yaml`
- Domain: `openrecord.fanpierlabs.com` (CloudFront + ALB + Route53)

## Secrets (AWS Secrets Manager, us-east-2)

- **RESEND_API_KEY**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO`
  - Used by CLI for autonomous 2FA code retrieval via Resend inbound emails
  - Inbound email address: `healthapp@bocuedpo.resend.app`
