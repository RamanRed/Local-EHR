###############################################################################
# provider.tf — SarvaVaidya EHR  ·  AWS Provider Configuration
# Region: ap-south-1 (Mumbai) — chosen for Indian healthcare data residency
###############################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ---------------------------------------------------------------------------
  # Remote state — store tfstate in S3 so the team shares the same state.
  # Uncomment after creating the bucket manually the first time.
  # ---------------------------------------------------------------------------
  # backend "s3" {
  #   bucket         = "sarvavaidya-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-south-1"
  #   encrypt        = true
  #   dynamodb_table = "sarvavaidya-tf-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  # Credentials are read from environment variables at pipeline runtime:
  #   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  # Never hard-code credentials here.

  default_tags {
    tags = {
      Project     = "SarvaVaidya-EHR"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "devops-fa"
    }
  }
}
