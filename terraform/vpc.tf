###############################################################################
# vpc.tf — SarvaVaidya EHR  ·  Virtual Private Cloud
#
# Topology
#   Public subnets   → EC2 app server (direct internet access, no ALB)
#   Private subnets  → RDS PostgreSQL (never exposed to the internet)
#
# COST NOTE: No NAT Gateway here (~$32/mo saved). The DB doesn't need
# outbound internet access — it only needs to be reachable from the EC2
# instance inside the VPC, which works via the VPC's local route regardless.
###############################################################################

# ── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-vpc-${var.environment}" }
}

# ── Internet Gateway (public egress) ─────────────────────────────────────────

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-igw-${var.environment}" }
}

# ── Public Subnets ────────────────────────────────────────────────────────────

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}-${var.environment}"
    Tier = "Public"
  }
}

# ── Private Subnets (DB layer) ────────────────────────────────────────────────
# Kept in 2 AZs only because RDS requires a subnet group spanning 2+ AZs,
# even for a single-instance (non-Multi-AZ) deployment.

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}-${var.environment}"
    Tier = "Private"
  }
}

# ── Route Tables ──────────────────────────────────────────────────────────────

# Public route table → IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "${var.project_name}-public-rt-${var.environment}" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route table → local only (no NAT — DB doesn't need outbound internet)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-private-rt-${var.environment}" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
