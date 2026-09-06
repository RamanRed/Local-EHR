###############################################################################
# variables.tf — SarvaVaidya EHR  ·  Input Variables
###############################################################################

# ── General ──────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy into (Mumbai for Indian data residency)"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment label (dev | staging | prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod"
  }
}

variable "project_name" {
  description = "Short project identifier used in resource names"
  type        = string
  default     = "sarvavaidya"
}

# ── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (DB layer)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "AZs to use (must match subnet count)"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

# ── EC2 ──────────────────────────────────────────────────────────────────────

variable "instance_type" {
  description = "EC2 instance type for the application server (t3.micro = free tier, first 12mo)"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Amazon Linux 2023 AMI (ap-south-1). Update periodically."
  type        = string
  # Amazon Linux 2023 (AL2023) in ap-south-1 — fetched via:
  # aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --region ap-south-1
  default = "ami-090d68841c2a28756"
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH access (create in AWS Console first)"
  type        = string
  default     = "sarvavaidya-keypair"
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the EC2 instance (restrict to your IP)"
  type        = string
  default     = "0.0.0.0/0" # Change to your IP for production!
}

# ── RDS Aurora PostgreSQL ─────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class (db.t3.micro = free tier, first 12mo)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB (<=20 = free tier)"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "sarvavaidya"
}

variable "db_username" {
  description = "Master DB username"
  type        = string
  default     = "sarvavaidya"
  sensitive   = true
}

variable "db_password" {
  description = "Master DB password — supply via TF_VAR_db_password env var"
  type        = string
  sensitive   = true
  # No default — must be set at runtime via environment variable
}

variable "db_port" {
  description = "PostgreSQL port"
  type        = number
  default     = 5432
}

variable "db_backup_retention_days" {
  description = "Aurora automated backup retention period (days)"
  type        = number
  default     = 7
}
