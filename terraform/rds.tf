###############################################################################
# rds.tf — SarvaVaidya EHR  ·  AWS RDS PostgreSQL
#
# COST NOTE: Aurora is never free-tier eligible (no matter the instance
# size), so this uses a plain single-AZ RDS PostgreSQL instance instead —
# db.t3.micro / db.t4g.micro + <=20GB gp2 storage is covered under the AWS
# Free Tier (750 instance-hrs/mo + 20GB storage + 20GB backup, first 12
# months on a new account). Swap to Aurora later if you need HA/read replicas.
###############################################################################

# ── DB Subnet Group (private subnets only) ────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db-subnet-group-${var.environment}"
  description = "Private subnets for SarvaVaidya RDS instance"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${var.project_name}-db-subnet-group-${var.environment}" }
}

# ── RDS PostgreSQL Instance ───────────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.8"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  storage_type           = "gp2"    # free-tier storage type (gp3 is not covered)
  max_allocated_storage  = 0        # disable storage autoscaling to avoid surprise growth

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = var.db_port

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                   = false   # Multi-AZ is NOT free-tier eligible
  backup_retention_period    = var.db_backup_retention_days
  preferred_backup_window    = "02:00-03:00"       # UTC — off-peak for IST
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-final-snapshot" : null

  # Encryption at rest — no extra cost, keep for HIPAA/PHI data
  storage_encrypted = true

  deletion_protection = var.environment == "prod"

  # Performance Insights left off — not guaranteed free on every instance
  # class/region combo, and unnecessary for a dev/free-tier setup.
  performance_insights_enabled = false

  tags = {
    Name       = "${var.project_name}-db-${var.environment}"
    Compliance = "HIPAA-ready"
  }
}

# ── SSM Parameter — store DB URL securely for Ansible + app to read ──────────

resource "aws_ssm_parameter" "db_url" {
  name  = "/${var.project_name}/${var.environment}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"

  tags = { Name = "${var.project_name}-db-url-${var.environment}" }
}
