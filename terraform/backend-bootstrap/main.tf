# Run this once to create the S3 backend bucket and DynamoDB lock table

terraform {
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "lispflow-terraform-state"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "LispFlow Terraform State"
    Environment = "shared"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "lispflow-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "LispFlow Terraform Locks"
    Environment = "shared"
  }
}

variable "region" {
  default = "us-west-2"
}
