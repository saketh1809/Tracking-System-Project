variable "ami_id_linux" {
  description = "AMI ID to use for all EC2 instances"
  type        = string
}

variable "ami_id_ubuntu" {
  description = "AMI ID to use for all EC2 instances"
  type        = string
}
 
variable "subnet_ids" {
  description = "List of public subnet IDs to launch instances in"
  type        = list(string)
}
 
variable "vpc_id" {
  description = "VPC ID for security group association"
  type        = string
}
 
variable "key_name" {
  description = "Name of the key pair to use for SSH access"
  type        = string
}
 
variable "instance_types" {
  description = "Map of instance types for bastion, jenkins, and sonarqube"
  type        = map(string)
}
 
variable "tags" {
  description = "Common tags to apply to all EC2 resources"
  type        = map(string)
}