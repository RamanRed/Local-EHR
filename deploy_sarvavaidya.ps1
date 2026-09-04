# ============================================================
# SarvaVaidya EHR — Full AWS Deployment Script (PowerShell)
# Run from PowerShell in the Local-EHR directory
# Usage: .\deploy_sarvavaidya.ps1
# ============================================================

param(
    [string]$Environment = "dev",
    [string]$DbPassword  = "SarvaVaidya@Secure2026!",
    [string]$RepoUrl     = "https://github.com/YOUR_ORG/Local-EHR.git"
)

$ErrorActionPreference = "Stop"
$Region = "ap-south-1"

function Log($msg) { Write-Host "► $msg" -ForegroundColor Cyan }
function OK($msg)  { Write-Host "✅ $msg" -ForegroundColor Green }
function ERR($msg) { Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }

# ── 0. Verify tools ────────────────────────────────────────────
Log "Checking prerequisites..."
foreach ($tool in @("aws","terraform","ansible-playbook")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        ERR "$tool not found. Install it first."
    }
}
OK "All tools found"

# ── 1. AWS credentials ─────────────────────────────────────────
# Credentials come from your existing `aws configure` profile / env vars.
# Never hardcode keys here — GitHub's push protection will (rightly) block it.
$env:AWS_DEFAULT_REGION = $Region

try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
} catch {
    ERR "No valid AWS credentials found. Run 'aws configure' first."
}
OK "Authenticated as: $($identity.Arn)"

# ── 2. EC2 Key Pair ────────────────────────────────────────────
Log "Checking EC2 key pair..."
$keyExists = aws ec2 describe-key-pairs --key-names sarvavaidya-keypair --region $Region 2>$null
if (-not $keyExists) {
    Log "Creating EC2 key pair..."
    aws ec2 create-key-pair --key-name sarvavaidya-keypair `
        --query "KeyMaterial" --output text --region $Region `
        | Out-File -Encoding ascii "sarvavaidya-keypair.pem"
    OK "Key pair created: sarvavaidya-keypair.pem"
} else {
    OK "Key pair already exists"
}

# ── 3. SSM Parameter Store ─────────────────────────────────────
Log "Storing secrets in SSM..."
$JwtSecret = [System.Guid]::NewGuid().ToString() + "-jwt"

$params = @(
    @{ Name="/sarvavaidya/$Environment/JWT_SECRET";     Value=$JwtSecret },
    @{ Name="/sarvavaidya/$Environment/DB_PASSWORD";    Value=$DbPassword },
    @{ Name="/sarvavaidya/$Environment/GROK_API_KEY";   Value="placeholder" },
    @{ Name="/sarvavaidya/$Environment/GEMINI_API_KEY"; Value="placeholder" }
)
foreach ($p in $params) {
    aws ssm put-parameter --name $p.Name --value $p.Value `
        --type SecureString --overwrite --region $Region | Out-Null
    OK "SSM: $($p.Name)"
}

# ── 4. Your public IP ──────────────────────────────────────────
Log "Getting your public IP..."
$MyIP = (Invoke-RestMethod "https://api.ipify.org") + "/32"
OK "Your IP: $MyIP"

# ── 5. Terraform ───────────────────────────────────────────────
Log "Running Terraform..."
Set-Location terraform

@"
aws_region           = "$Region"
environment          = "$Environment"
project_name         = "sarvavaidya"
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
availability_zones   = ["ap-south-1a", "ap-south-1b"]
instance_type        = "t3.micro"
key_pair_name        = "sarvavaidya-keypair"
allowed_ssh_cidr     = "$MyIP"
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name              = "sarvavaidya"
db_username          = "sarvavaidya"
db_password          = "$DbPassword"
db_backup_retention_days = 7
"@ | Out-File -Encoding utf8 terraform.tfvars

terraform init
OK "Terraform initialized"

terraform plan -out=tfplan
OK "Plan complete"

$confirm = Read-Host "`nApply? Free-tier sized resources (t3.micro / db.t3.micro). Type 'yes'"
if ($confirm -ne "yes") { Write-Host "Aborted."; exit 0 }

terraform apply tfplan
OK "Infrastructure provisioned!"

$EC2_IP  = terraform output -raw ec2_public_ip
OK "EC2 IP:  $EC2_IP"
Set-Location ..

# ── 6. Wait for boot ───────────────────────────────────────────
Log "Waiting 90s for EC2 to fully boot..."
Start-Sleep -Seconds 90

# ── 7. Ansible inventory ───────────────────────────────────────
Log "Updating Ansible inventory..."
(Get-Content ansible\inventory\hosts.yml) -replace '<EC2_PUBLIC_IP>', $EC2_IP |
    Set-Content ansible\inventory\hosts.yml
OK "Inventory: $EC2_IP"

# ── 8. Ansible setup ───────────────────────────────────────────
Log "Ansible setup playbook (Node.js, Nginx, PM2)..."
ansible-playbook ansible/playbooks/setup.yml `
    -i ansible/inventory/hosts.yml `
    -e "env=$Environment" `
    --private-key sarvavaidya-keypair.pem
OK "Server configured!"

# ── 9. Ansible deploy ──────────────────────────────────────────
Log "Deploying SarvaVaidya..."
ansible-playbook ansible/playbooks/deploy.yml `
    -i ansible/inventory/hosts.yml `
    -e "env=$Environment" `
    -e "repo_url=$RepoUrl" `
    -e "deploy_branch=main" `
    --private-key sarvavaidya-keypair.pem
OK "Application deployed!"

# ── 10. Summary ────────────────────────────────────────────────
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      🏥  SarvaVaidya EHR — Live on AWS!              ║" -ForegroundColor Green
Write-Host "╠═══════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  App    : http://$EC2_IP" -ForegroundColor Green
Write-Host "║  Health : http://$EC2_IP/api/health" -ForegroundColor Green
Write-Host "║  Docs   : http://$EC2_IP/docs" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
