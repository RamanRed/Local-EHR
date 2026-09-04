###############################################################################
# security_groups.tf — SarvaVaidya EHR  ·  Security Groups
#
# Principle: least-privilege.
#   - EC2 SG   : internet → 80 (Nginx) + 3001 (API, optional), SSH from admin CIDR
#   - RDS SG   : EC2 SG → 5432 only; no public access
#
# No ALB SG — traffic goes straight to the EC2 instance (see ec2.tf).
###############################################################################

# ── EC2 App Server Security Group ─────────────────────────────────────────────

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg-${var.environment}"
  description = "EC2 app server: SSH admin, HTTP/API from internet"
  vpc_id      = aws_vpc.main.id

  # SSH — restrict to your office/VPN IP in production
  ingress {
    description = "SSH admin access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Nginx / direct HTTP from internet
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Express API port, reachable directly (dev/testing convenience)
  ingress {
    description = "Express API from internet"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound (AI APIs, npm, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-ec2-sg-${var.environment}" }
}

# ── RDS Security Group ────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg-${var.environment}"
  description = "RDS PostgreSQL: accessible only from EC2 app layer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-rds-sg-${var.environment}" }
}
