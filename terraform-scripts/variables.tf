variable "region" {
  description = "AWS region"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
}

variable "availability_zones" {
  description = "List of availability zones for public subnets"
  type        = list(string)
}

variable "destination_cidr_block" {
  description = "Destination CIDR block for routing"
  type        = string
}



variable "cluster_name" {}

variable "node_desired_size" {}

variable "node_min_size" {}

variable "node_max_size" {}

variable "instance_type" {}

variable "key_name" {}

variable "ami_id_linux" {}
variable "ami_id_ubuntu" {}

variable "instance_types" {}

variable "tags" {}

 