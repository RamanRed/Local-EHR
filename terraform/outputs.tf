###############################################################################
# outputs.tf — SarvaVaidya EHR  ·  Terraform Outputs
# These values are consumed by Ansible (dynamic inventory) and CI/CD pipeline.
###############################################################################

output "ec2_public_ip" {
  description = "Elastic IP of the app server — add to Ansible inventory"
  value       = aws_eip.app_server.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app_server.id
}

output "db_endpoint" {
  description = "RDS PostgreSQL endpoint (private)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.main.port
}

output "db_url_ssm_path" {
  description = "SSM Parameter path where DATABASE_URL is stored"
  value       = aws_ssm_parameter.db_url.name
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}
