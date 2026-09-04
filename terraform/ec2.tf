###############################################################################
# ec2.tf — SarvaVaidya EHR  ·  EC2 Application Server
#
# Single EC2 instance running:
#   - Node.js 20 (LTS) + pnpm
#   - Nginx reverse proxy (port 80 → 3001 + 5173)
#   - PM2 process manager
#   - Docker (for optional containerised deployment path)
#
# COST NOTE: No ALB here (~$16-20/mo + LCU saved). Traffic hits the EC2
# instance's Elastic IP directly on port 80 via Nginx. Add an ALB back later
# if/when you need multiple instances or managed TLS termination.
###############################################################################

# ── IAM role — lets EC2 pull secrets from SSM Parameter Store ─────────────────

resource "aws_iam_role" "ec2_role" {
  name = "${var.project_name}-ec2-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-profile-${var.environment}"
  role = aws_iam_role.ec2_role.name
}

# ── Elastic IP (stable public IP for DNS + Ansible inventory) ─────────────────

resource "aws_eip" "app_server" {
  domain = "vpc"
  tags   = { Name = "${var.project_name}-eip-${var.environment}" }
}

resource "aws_eip_association" "app_server" {
  instance_id   = aws_instance.app_server.id
  allocation_id = aws_eip.app_server.id
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "app_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.key_pair_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20    # GB — AWS free tier covers up to 30GB EBS
    delete_on_termination = true
    encrypted             = true
  }

  # Bootstrap script — Ansible will do the heavy lifting via CD pipeline,
  # but this installs the Ansible prerequisite (Python) and SSM agent.
  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    dnf update -y
    dnf install -y python3 python3-pip git
    # AWS SSM Agent is pre-installed on AL2023 but ensure it's running
    systemctl enable --now amazon-ssm-agent
    echo "Bootstrap complete — Ansible will handle app deployment"
  EOF
  )

  tags = {
    Name = "${var.project_name}-app-server-${var.environment}"
    Role = "AppServer"
  }

  lifecycle {
    # Prevent accidental replacement that would cause downtime
    create_before_destroy = true
  }
}
