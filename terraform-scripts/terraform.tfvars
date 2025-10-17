region = "ap-northeast-2"

vpc_cidr = "10.0.0.0/16"

public_subnet_cidrs = [
  "10.0.11.0/24",
  "10.0.12.0/24",
  "10.0.13.0/24",
  "10.0.14.0/24"
]

availability_zones = [
  "ap-northeast-2a",
  "ap-northeast-2b",
  "ap-northeast-2c"
]

destination_cidr_block = "0.0.0.0/0"

cluster_name = "Tracking-System-Project-Cluster"
node_desired_size = 3
node_min_size = 3
node_max_size = 5
instance_type = "t3.medium"
key_name = "vikasini-Key"


ami_id_linux  = "ami-029b307384d6998bb"
ami_id_ubuntu = "ami-0fe4e90accd5cc34a"
instance_types = {
  bastion   = "t2.micro"
  jenkins   = "t3.medium"
  sonarqube = "t3.medium"
}
tags = {
  Environment = "Dev"
  Project     = "Tracking-System"
  Owner       = "Saketh"
}