#!/bin/bash
# ============================================================
# SarvaVaidya EHR — Full AWS Deployment (Bash/WSL)
# Usage: chmod +x deploy_sarvavaidya.sh && ./deploy_sarvavaidya.sh
# Run from the Local-EHR root directory
# ============================================================

set -e
REGION="ap-south-1"
ENV="${1:-dev}"
DB_PASS="${2:-SarvaVaidya@Secure2026!}"
REPO_URL="${3:-https://github.com/YOUR_ORG/Local-EHR.git}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${CYAN}► $1${NC}"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ── 0. Prerequisites ──────────────────────────────────────────
log "Checking prerequisites..."
for tool in aws terraform ansible-playbook; do
    command -v $tool &>/dev/null || err "$tool not found. Install it first."
done
ok "All tools available"

# ── 1. AWS credentials ────────────────────────────────────────
# Credentials come from your existing `aws configure` profile / env vars.
# Never hardcode keys here — GitHub's push protection will (rightly) block it.
export AWS_DEFAULT_REGION="$REGION"

ARN=$(aws sts get-caller-identity --query "Arn" --output text) || err "No valid AWS credentials found. Run 'aws configure' first."
ok "Authenticated as: $ARN"

# ── 2. EC2 Key Pair ───────────────────────────────────────────
log "Checking EC2 key pair..."
if ! aws ec2 describe-key-pairs --key-names sarvavaidya-keypair --region $REGION &>/dev/null; then
    log "Creating EC2 key pair..."
    aws ec2 create-key-pair --key-name sarvavaidya-keypair \
        --query "KeyMaterial" --output text --region $REGION > sarvavaidya-keypair.pem
    chmod 600 sarvavaidya-keypair.pem
    ok "Key pair created: sarvavaidya-keypair.pem"
else
    ok "Key pair already exists"
fi

# ── 3. SSM Parameters ─────────────────────────────────────────
log "Storing secrets in SSM Parameter Store..."
JWT_SECRET="sarvavaidya-$(date +%s)-jwt-$(openssl rand -hex 8)"

aws ssm put-parameter --name "/sarvavaidya/$ENV/JWT_SECRET"   --value "$JWT_SECRET" --type SecureString --overwrite --region $REGION >/dev/null
aws ssm put-parameter --name "/sarvavaidya/$ENV/DB_PASSWORD"  --value "$DB_PASS"    --type SecureString --overwrite --region $REGION >/dev/null
aws ssm put-parameter --name "/sarvavaidya/$ENV/GROK_API_KEY" --value "placeholder" --type SecureString --overwrite --region $REGION >/dev/null
aws ssm put-parameter --name "/sarvavaidya/$ENV/GEMINI_API_KEY" --value "placeholder" --type SecureString --overwrite --region $REGION >/dev/null
ok "Secrets stored in SSM"

# ── 4. Get public IP ──────────────────────────────────────────
MY_IP=$(curl -s https://api.ipify.org)/32
ok "Your IP: $MY_IP"

# ── 5. Terraform ──────────────────────────────────────────────
log "Initializing Terraform..."
cd terraform

cat > terraform.tfvars << TFEOF
aws_region           = "$REGION"
environment          = "$ENV"
project_name         = "sarvavaidya"
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
availability_zones   = ["ap-south-1a", "ap-south-1b"]
instance_type        = "t3.micro"
key_pair_name        = "sarvavaidya-keypair"
allowed_ssh_cidr     = "$MY_IP"
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name              = "sarvavaidya"
db_username          = "sarvavaidya"
db_password          = "$DB_PASS"
db_backup_retention_days = 7
TFEOF

terraform init
ok "Terraform initialized"

terraform plan -out=tfplan
ok "Plan complete"

read -p $'\nApply infrastructure? Free-tier sized resources (t3.micro / db.t3.micro). Type yes to confirm: ' CONFIRM
[[ "$CONFIRM" != "yes" ]] && echo "Aborted." && exit 0

terraform apply tfplan
ok "Infrastructure provisioned!"

EC2_IP=$(terraform output -raw ec2_public_ip)
ok "EC2 IP:  $EC2_IP"
cd ..

# ── 6. Wait for boot ──────────────────────────────────────────
log "Waiting 90s for EC2 to boot and SSM agent to start..."
sleep 90

# ── 7. Update Ansible inventory ───────────────────────────────
log "Updating Ansible inventory..."
sed -i "s/<EC2_PUBLIC_IP>/$EC2_IP/g" ansible/inventory/hosts.yml
ok "Inventory updated: $EC2_IP"

# ── 8. Ansible setup ──────────────────────────────────────────
log "Running Ansible setup playbook (Node.js, Nginx, PM2)..."
ansible-playbook ansible/playbooks/setup.yml \
    -i ansible/inventory/hosts.yml \
    -e "env=$ENV" \
    --private-key sarvavaidya-keypair.pem
ok "Server configured!"

# ── 9. Ansible deploy ─────────────────────────────────────────
log "Deploying SarvaVaidya application..."
ansible-playbook ansible/playbooks/deploy.yml \
    -i ansible/inventory/hosts.yml \
    -e "env=$ENV" \
    -e "repo_url=$REPO_URL" \
    -e "deploy_branch=main" \
    --private-key sarvavaidya-keypair.pem
ok "Application deployed!"

# ── 10. Summary ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        🏥  SarvaVaidya EHR — Live on AWS!               ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  App URL  : http://$EC2_IP                               ${NC}"
echo -e "${GREEN}║  Health   : http://$EC2_IP/api/health                    ${NC}"
echo -e "${GREEN}║  Swagger  : http://$EC2_IP/docs                          ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
