terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    bucket         = "lispflow-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "lispflow-terraform-locks"
  }
}

provider "aws" {
  region = "us-west-2"
  default_tags {
    tags = {
      Environment = "production"
      Project     = "lispflow"
    }
  }
}

module "lispflow" {
  source = "../../modules/lispflow"

  environment = "production"
  region      = "us-west-2"

  vpc_cidr             = "10.0.0.0/16"
  availability_zones   = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  node_desired_size = 5
  node_min_size     = 3
  node_max_size     = 20

  db_instance_class        = "db.r6g.xlarge"
  db_allocated_storage       = 500
  db_max_allocated_storage   = 5000

  redis_node_type = "cache.r6g.large"

  domain_name       = "api.lispflow.io"
  hosted_zone_id    = "Z0987654321DEF"
  acm_certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/fedcba"

  common_tags = {
    Project     = "lispflow"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
