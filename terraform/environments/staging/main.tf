terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    bucket         = "lispflow-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "lispflow-terraform-locks"
  }
}

provider "aws" {
  region = "us-west-2"
  default_tags {
    tags = {
      Environment = "staging"
      Project     = "lispflow"
    }
  }
}

module "lispflow" {
  source = "../../modules/lispflow"

  environment = "staging"
  region      = "us-west-2"

  vpc_cidr             = "10.1.0.0/16"
  availability_zones   = ["us-west-2a", "us-west-2b"]
  private_subnet_cidrs = ["10.1.1.0/24", "10.1.2.0/24"]
  public_subnet_cidrs  = ["10.1.101.0/24", "10.1.102.0/24"]

  node_desired_size = 2
  node_min_size     = 1
  node_max_size     = 5

  db_instance_class        = "db.t3.small"
  db_allocated_storage       = 50
  db_max_allocated_storage   = 100

  redis_node_type = "cache.t3.micro"

  domain_name       = "staging.lispflow.io"
  hosted_zone_id    = "Z1234567890ABC"
  acm_certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/abcdef"

  common_tags = {
    Project     = "lispflow"
    Environment = "staging"
    ManagedBy   = "terraform"
  }
}
