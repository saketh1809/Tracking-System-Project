provider "aws" {
  region = var.region
}

module "network" {
  source = "./modules/network"
  region                 = var.region
  vpc_cidr               = var.vpc_cidr
  public_subnet_cidrs    = var.public_subnet_cidrs
  availability_zones     = var.availability_zones
  destination_cidr_block = var.destination_cidr_block
}

module "ec2_instances" {
  source         = "./modules/instances"
  ami_id_linux         = var.ami_id_linux
  ami_id_ubuntu        = var.ami_id_ubuntu
  subnet_ids     = module.network.public_subnet_ids
  vpc_id         = module.network.vpc_id
  key_name       = var.key_name
  instance_types = var.instance_types
  tags           = var.tags
}



module "eks_cluster" {
  source = "./modules/eks_cluster"
  cluster_name = var.cluster_name
  node_desired_size = var.node_desired_size
  public_subnet_ids = module.network.public_subnet_ids
  node_min_size = var.node_min_size
  node_max_size = var.node_max_size
  instance_type = var.instance_type
}


